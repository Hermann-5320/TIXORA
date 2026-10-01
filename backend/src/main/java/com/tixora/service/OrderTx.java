package com.tixora.service;

import com.tixora.model.Const;
import com.tixora.model.Event;
import com.tixora.model.PurchaseOrder;
import com.tixora.model.Ticket;
import com.tixora.model.TicketType;
import com.tixora.repository.EventRepository;
import com.tixora.repository.OrderRepository;
import com.tixora.repository.TicketRepository;
import com.tixora.repository.TicketTypeRepository;
import com.tixora.repository.UserRepository;
import com.tixora.security.JwtService;
import com.tixora.web.ApiException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Etapes transactionnelles d'une commande (reservation des places, emission des billets, liberation).
 * Separe de OrderService pour que l'appel HTTP a CT Pay ne tienne jamais de verrou en base.
 */
@Service
public class OrderTx {
  static final int MAX_PER_TYPE = 10;
  static final int MAX_PER_ORDER = 20;
  private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

  private final OrderRepository orders;
  private final EventRepository events;
  private final TicketTypeRepository types;
  private final TicketRepository tickets;
  private final UserRepository users;
  private final EventRules rules;
  private final JwtService jwt;
  private final PricingService pricing;

  public OrderTx(OrderRepository orders, EventRepository events, TicketTypeRepository types, TicketRepository tickets,
                 UserRepository users, EventRules rules, JwtService jwt, PricingService pricing) {
    this.orders = orders;
    this.events = events;
    this.types = types;
    this.tickets = tickets;
    this.users = users;
    this.rules = rules;
    this.jwt = jwt;
    this.pricing = pricing;
  }

  /** Verrouille et reserve les places (aucune survente), puis cree la commande en attente de paiement. */
  @Transactional
  public PurchaseOrder reserve(UUID buyerId, UUID eventId, List<OrderService.Item> items, String operatorKey, String phone, int ttlMinutes) {
    Event event = events.findById(eventId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable"));
    boolean organizerBlocked = users.findById(event.organizerId).map(u -> Const.BLOCKED.equals(u.status)).orElse(true);
    if (!Const.APPROVED.equals(event.status) || organizerBlocked) throw new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable");
    if (rules.isEnded(event)) throw new ApiException(HttpStatus.CONFLICT, "Evenement termine : la vente de billets est fermee");
    if (items == null || items.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Choisissez au moins un billet");

    Map<UUID, Integer> wanted = new TreeMap<>(); // ordre stable : evite les blocages entre commandes concurrentes
    int totalQty = 0;
    for (OrderService.Item item : items) {
      if (item.ticketTypeId() == null || item.quantity() < 1 || item.quantity() > MAX_PER_TYPE) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Quantite invalide (1 a " + MAX_PER_TYPE + " par type de billet)");
      }
      wanted.merge(item.ticketTypeId(), item.quantity(), Integer::sum);
      totalQty += item.quantity();
    }
    if (totalQty > MAX_PER_ORDER) throw new ApiException(HttpStatus.BAD_REQUEST, "Maximum " + MAX_PER_ORDER + " billets par commande");

    PurchaseOrder o = new PurchaseOrder();
    o.buyerId = buyerId;
    o.eventId = eventId;
    o.operatorKey = operatorKey;
    o.phone = phone;
    long subtotal = 0;
    for (Map.Entry<UUID, Integer> w : wanted.entrySet()) {
      TicketType t = types.findWithLockById(w.getKey()).filter(c -> c.event.id.equals(eventId))
          .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Type de billet invalide"));
      if (t.capacity - t.sold < w.getValue()) throw new ApiException(HttpStatus.CONFLICT, "Plus assez de places pour le billet " + t.name);
      t.sold += w.getValue();
      subtotal += (long) t.price * w.getValue();
      PurchaseOrder.Line line = new PurchaseOrder.Line();
      line.ticketTypeId = t.id;
      line.name = t.name;
      line.price = t.price;
      line.quantity = w.getValue();
      o.lines.add(line);
    }
    if (subtotal > 50_000_000) throw new ApiException(HttpStatus.BAD_REQUEST, "Montant trop eleve");
    o.subtotal = (int) subtotal;
    o.total = pricing.totalWithFees(o.subtotal);
    o.fees = o.total - o.subtotal;
    o.transactionId = "TX_" + LocalDateTime.now().format(STAMP) + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    o.expiresAt = Instant.now().plusSeconds(ttlMinutes * 60L);
    return orders.save(o);
  }

  @Transactional
  public PurchaseOrder attach(UUID orderId, String processCode, String operatorKey, String phone, Integer fees, Integer total) {
    PurchaseOrder o = orders.findWithLockById(orderId).orElseThrow();
    o.processCode = processCode;
    if (fees != null && total != null && total >= o.subtotal) { // montants reels annonces par CT Pay
      o.fees = total - o.subtotal;
      o.total = total;
    }
    o.operatorKey = operatorKey;
    o.phone = phone;
    return orders.save(o);
  }

  @Transactional
  public PurchaseOrder touch(UUID orderId) {
    PurchaseOrder o = orders.findWithLockById(orderId).orElseThrow();
    o.lastCheckedAt = Instant.now();
    return orders.save(o);
  }

  @Transactional(readOnly = true)
  public PurchaseOrder find(UUID orderId) {
    return orders.findById(orderId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Commande introuvable"));
  }

  /** Paiement refuse ou impossible : les places reservees sont liberees. */
  @Transactional
  public PurchaseOrder fail(UUID orderId, String reason) {
    PurchaseOrder o = orders.findWithLockById(orderId).orElseThrow();
    if (!Const.ORDER_PENDING.equals(o.status)) return o;
    release(o);
    o.status = Const.ORDER_FAILED;
    o.failureReason = reason == null ? null : (reason.length() > 300 ? reason.substring(0, 300) : reason);
    return orders.save(o);
  }

  /** Delai depasse sans reponse de l'operateur : places liberees (un succes tardif sera quand meme honore si possible). */
  @Transactional
  public PurchaseOrder expire(UUID orderId) {
    PurchaseOrder o = orders.findWithLockById(orderId).orElseThrow();
    if (!Const.ORDER_PENDING.equals(o.status)) return o;
    release(o);
    o.status = Const.ORDER_EXPIRED;
    o.failureReason = "Delai de paiement depasse";
    return orders.save(o);
  }

  /**
   * Paiement confirme : emet les billets, une seule fois (verrou sur la commande). Si le paiement arrive apres expiration et
   * que les places ont ete reprises, la commande passe en REFUND_NEEDED pour un remboursement manuel.
   */
  @Transactional
  public PurchaseOrder succeed(UUID orderId) {
    PurchaseOrder o = orders.findWithLockById(orderId).orElseThrow();
    if (Const.ORDER_SUCCESS.equals(o.status) || Const.ORDER_REFUND.equals(o.status)) return o;
    if (!Const.ORDER_PENDING.equals(o.status)) {
      for (PurchaseOrder.Line l : o.lines) {
        TicketType t = types.findWithLockById(l.ticketTypeId).orElse(null);
        if (t == null || t.capacity - t.sold < l.quantity) {
          o.status = Const.ORDER_REFUND;
          o.failureReason = "Paiement recu apres expiration, plus de places : remboursement necessaire";
          return orders.save(o);
        }
      }
      for (PurchaseOrder.Line l : o.lines) types.findWithLockById(l.ticketTypeId).ifPresent(t -> t.sold += l.quantity);
    }
    Event event = events.findById(o.eventId).orElseThrow();
    for (PurchaseOrder.Line l : o.lines) {
      for (int i = 0; i < l.quantity; i++) {
        Ticket t = new Ticket();
        String base = UUID.randomUUID().toString();
        t.code = base + "." + jwt.sign(base);
        t.eventId = event.id;
        t.eventTitle = event.title;
        t.venue = event.venue;
        t.startsAt = event.startsAt;
        t.categoryName = l.name;
        t.price = l.price;
        t.ownerId = o.buyerId;
        t.status = "VALID";
        t.orderId = o.id;
        tickets.save(t);
      }
    }
    o.status = Const.ORDER_SUCCESS;
    o.failureReason = null;
    o.paidAt = Instant.now();
    return orders.save(o);
  }

  private void release(PurchaseOrder o) {
    for (PurchaseOrder.Line l : o.lines) types.findWithLockById(l.ticketTypeId).ifPresent(t -> t.sold = Math.max(0, t.sold - l.quantity));
  }
}
