package com.tixora.service;

import com.tixora.model.Const;
import com.tixora.model.PurchaseOrder;
import com.tixora.payment.PaymentGateway;
import com.tixora.payment.PaymentGateway.Operator;
import com.tixora.payment.PaymentGateway.PaymentException;
import com.tixora.repository.OrderRepository;
import com.tixora.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Parcours d'achat : reservation, paiement Mobile Money (CT Pay), emission des billets apres succes.
 * Le callback de CT Pay n'est jamais cru sur parole : on interroge toujours l'etat reel du paiement.
 */
@Service
public class OrderService {
  private static final Logger log = LoggerFactory.getLogger(OrderService.class);
  private static final long MIN_RECHECK_MS = 2000;

  public record Item(UUID ticketTypeId, int quantity) {}

  public record Payment(String operatorKey, String phone) {}

  private final OrderTx tx;
  private final OrderRepository orders;
  private final PaymentGateway gateway;
  private final int ttlMinutes;
  private final String apiPublicUrl;
  private final ExecutorService async = Executors.newFixedThreadPool(2);

  public OrderService(OrderTx tx, OrderRepository orders, PaymentGateway gateway,
                      @Value("${app.order-ttl-minutes}") int ttlMinutes, @Value("${app.api-public-url}") String apiPublicUrl) {
    this.tx = tx;
    this.orders = orders;
    this.gateway = gateway;
    this.ttlMinutes = ttlMinutes;
    this.apiPublicUrl = apiPublicUrl == null ? "" : apiPublicUrl.trim().replaceAll("/+$", "");
  }

  public List<Operator> operators() {
    try {
      return gateway.operators();
    } catch (PaymentException e) {
      throw new ApiException(HttpStatus.BAD_GATEWAY, "Service de paiement momentanement indisponible");
    }
  }

  public PurchaseOrder place(UUID buyerId, UUID eventId, List<Item> items, Payment pay) {
    PurchaseOrder o = tx.reserve(buyerId, eventId, items, pay == null ? null : pay.operatorKey(), pay == null ? null : pay.phone(), ttlMinutes);
    if (o.subtotal == 0) return tx.succeed(o.id); // evenement gratuit : pas de paiement

    String phone = normalizePhone(pay == null ? null : pay.phone());
    if (phone == null) {
      tx.fail(o.id, "Numero Mobile Money invalide");
      throw new ApiException(HttpStatus.BAD_REQUEST, "Numero Mobile Money invalide (ex. 6XXXXXXXX)");
    }
    String operator = pay.operatorKey() == null ? "" : pay.operatorKey().trim();
    if (operators().stream().noneMatch(op -> op.key().equals(operator))) {
      tx.fail(o.id, "Operateur invalide");
      throw new ApiException(HttpStatus.BAD_REQUEST, "Operateur Mobile Money invalide");
    }

    PaymentGateway.Initiation init;
    try {
      String callback = apiPublicUrl.isEmpty() ? null : apiPublicUrl + "/api/payments/ctpay/callback";
      init = gateway.initiate(o.subtotal, "Billets Tixora " + o.transactionId, operator, phone, o.transactionId, callback);
    } catch (PaymentException e) {
      tx.fail(o.id, e.getMessage());
      throw new ApiException(e.rejected ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY,
          e.rejected ? e.getMessage() : "Service de paiement momentanement indisponible, reessayez");
    }
    PurchaseOrder attached = tx.attach(o.id, init.processCode(), operator, phone, init.fees(), init.total());
    return "SUCCESS".equals(init.status()) ? refresh(attached.id) : attached;
  }

  /** Etat a jour de la commande ; interroge CT Pay (au plus toutes les 2 s) tant que le paiement est en attente. */
  public PurchaseOrder poll(UUID orderId, UUID buyerId) {
    PurchaseOrder o = tx.find(orderId);
    if (!o.buyerId.equals(buyerId)) throw new ApiException(HttpStatus.NOT_FOUND, "Commande introuvable");
    boolean recent = o.lastCheckedAt != null && Instant.now().toEpochMilli() - o.lastCheckedAt.toEpochMilli() < MIN_RECHECK_MS;
    return Const.ORDER_PENDING.equals(o.status) && !recent ? refresh(orderId) : o;
  }

  PurchaseOrder refresh(UUID orderId) {
    PurchaseOrder o = tx.find(orderId);
    boolean open = Const.ORDER_PENDING.equals(o.status) || Const.ORDER_EXPIRED.equals(o.status);
    if (!open || o.processCode == null) return o;
    tx.touch(orderId);
    String state;
    try {
      state = gateway.status(o.processCode);
    } catch (PaymentException e) {
      log.warn("Etat du paiement indisponible pour la commande {}", orderId);
      return o;
    }
    if ("SUCCESS".equals(state)) return tx.succeed(orderId);
    if ("FAILED".equals(state) && Const.ORDER_PENDING.equals(o.status)) return tx.fail(orderId, "Paiement refuse ou annule");
    return o;
  }

  /** Notification de CT Pay : l'identifiant recu sert uniquement a retrouver la commande, l'etat est reverifie aupres de CT Pay. */
  public void onCallback(String id) {
    if (id == null || id.isBlank() || id.length() > 100) return;
    Optional<PurchaseOrder> found = orders.findByProcessCode(id).or(() -> orders.findByTransactionId(id));
    found.ifPresent(o -> async.submit(() -> {
      try {
        refresh(o.id);
      } catch (RuntimeException e) {
        log.warn("Traitement du callback en echec pour la commande {}", o.id, e);
      }
    }));
  }

  /** Toutes les minutes : les commandes dont le delai est depasse sont verifiees une derniere fois, puis expirees. */
  @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
  public void sweep() {
    for (PurchaseOrder o : orders.findByStatusAndExpiresAtBefore(Const.ORDER_PENDING, Instant.now())) {
      try {
        if (Const.ORDER_PENDING.equals(refresh(o.id).status)) tx.expire(o.id);
      } catch (RuntimeException e) {
        log.warn("Expiration de la commande {} en echec", o.id, e);
      }
    }
  }

  /** CT Pay attend le numero a 9 chiffres, sans l'indicatif 237 (ex. 677123456). Accepte 6XXXXXXXX, 2376XXXXXXXX, +2376XXXXXXXX. */
  static String normalizePhone(String raw) {
    if (raw == null) return null;
    String d = raw.replaceAll("[^0-9]", "");
    if (d.startsWith("00")) d = d.substring(2);
    if (d.length() == 12 && d.startsWith("237")) d = d.substring(3);
    return d.matches("^6\\d{8}$") ? d : null;
  }
}
