package com.tixora.web;

import com.tixora.dto.EventDto;
import com.tixora.dto.PageDto;
import com.tixora.model.Const;
import com.tixora.model.Event;
import com.tixora.model.User;
import com.tixora.model.PurchaseOrder;
import com.tixora.repository.EventRepository;
import com.tixora.repository.OrderRepository;
import com.tixora.service.PricingService;
import com.tixora.repository.TicketRepository;
import com.tixora.repository.UserRepository;
import com.tixora.service.AdminService;
import com.tixora.service.EventService;
import com.tixora.service.EventViews;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Espace administrateur : moderation des evenements et gestion des comptes. Reserve au role ADMIN. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  record ReasonReq(String reason) {}

  /** Reversement a faire a un organisateur : ventes de billets - commission Tixora = net. */
  record Payout(UUID organizerId, String name, String email, String phone, long ticketsSold, long revenue, long commission, long net) {}

  record OrderRow(UUID id, String status, String eventTitle, String buyerEmail, String phone, int subtotal, int fees, int total,
                  String processCode, String failureReason, Instant createdAt) {}

  private final EventRepository events;
  private final UserRepository users;
  private final TicketRepository tickets;
  private final EventService eventService;
  private final AdminService adminService;
  private final EventViews views;
  private final OrderRepository orders;
  private final PricingService pricing;

  public AdminController(EventRepository events, UserRepository users, TicketRepository tickets,
                         EventService eventService, AdminService adminService, EventViews views,
                         OrderRepository orders, PricingService pricing) {
    this.events = events;
    this.users = users;
    this.tickets = tickets;
    this.eventService = eventService;
    this.adminService = adminService;
    this.views = views;
    this.orders = orders;
    this.pricing = pricing;
  }

  @GetMapping("/stats")
  Map<String, Object> stats() {
    Map<String, Object> s = new LinkedHashMap<>();
    s.put("pendingEvents", events.countByStatus(Const.PENDING));
    s.put("approvedEvents", events.countByStatus(Const.APPROVED));
    s.put("rejectedEvents", events.countByStatus(Const.REJECTED));
    s.put("clients", users.countByRole("CLIENT"));
    s.put("organizers", users.countByRole("ORGANISATEUR"));
    s.put("controllers", users.countByRole("CONTROLEUR"));
    s.put("blockedUsers", users.countByStatus(Const.BLOCKED));
    s.put("ticketsSold", tickets.count());
    long revenue = tickets.revenue();
    s.put("revenue", revenue);
    s.put("commissionPercent", pricing.commissionPercent());
    s.put("commission", pricing.commissionOf(revenue));
    s.put("refundsNeeded", orders.countByStatus("REFUND_NEEDED"));
    return s;
  }

  @GetMapping("/events")
  PageDto<EventDto> events(Authentication auth, @RequestParam(defaultValue = "") String status,
                           @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page,
                           @RequestParam(defaultValue = "20") int size) {
    var pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Event> result = events.adminSearch(status.trim().toUpperCase(Locale.ROOT), q.trim().toLowerCase(Locale.ROOT), pageable);
    return PageDto.of(result, views.build(result.getContent(), Actor.id(auth)));
  }

  @PostMapping("/events/{id}/approve")
  EventDto approve(Authentication auth, @PathVariable UUID id) {
    return views.one(eventService.review(id, true, null), Actor.id(auth));
  }

  @PostMapping("/events/{id}/reject")
  EventDto reject(Authentication auth, @PathVariable UUID id, @RequestBody ReasonReq r) {
    return views.one(eventService.review(id, false, r.reason()), Actor.id(auth));
  }

  /** Correction d'un evenement, y compris termine (verrouille pour l'organisateur). */
  @PutMapping("/events/{id}")
  EventDto correct(Authentication auth, @PathVariable UUID id, @Valid @RequestBody EventService.EventReq r) {
    UUID me = Actor.id(auth);
    return views.one(eventService.update(id, me, true, r), me);
  }

  @GetMapping("/users")
  PageDto<User> users(@RequestParam(defaultValue = "") String role, @RequestParam(defaultValue = "") String q,
                      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    var pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<User> result = users.search(role.trim().toUpperCase(Locale.ROOT), q.trim().toLowerCase(Locale.ROOT), pageable);
    return PageDto.of(result, result.getContent());
  }

  @PostMapping("/users/{id}/block")
  User block(Authentication auth, @PathVariable UUID id) {
    return adminService.setBlocked(Actor.id(auth), id, true);
  }

  @PostMapping("/users/{id}/unblock")
  User unblock(Authentication auth, @PathVariable UUID id) {
    return adminService.setBlocked(Actor.id(auth), id, false);
  }

  @DeleteMapping("/users/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(Authentication auth, @PathVariable UUID id) {
    adminService.delete(Actor.id(auth), id);
  }

  /** Ce qu'il faut reverser a chaque organisateur (ventes - commission), pour les virements manuels. */
  @GetMapping("/payouts")
  List<Payout> payouts() {
    List<Object[]> rows = tickets.salesByOrganizer();
    Map<UUID, User> byId = new HashMap<>();
    users.findAllById(rows.stream().map(r -> (UUID) r[0]).toList()).forEach(u -> byId.put(u.id, u));
    List<Payout> out = new ArrayList<>();
    for (Object[] r : rows) {
      User u = byId.get((UUID) r[0]);
      long revenue = (Long) r[2];
      long commission = pricing.commissionOf(revenue);
      String name = u == null ? "-" : (u.organization != null && !u.organization.isBlank() ? u.organization : ((u.firstName == null ? "" : u.firstName) + " " + (u.lastName == null ? "" : u.lastName)).trim());
      out.add(new Payout((UUID) r[0], name, u == null ? null : u.email, u == null ? null : u.phone, (Long) r[1], revenue, commission, revenue - commission));
    }
    out.sort((a, b) -> Long.compare(b.revenue(), a.revenue()));
    return out;
  }

  /** Commandes (paiements) : permet de suivre les echecs et les remboursements a faire (status=REFUND_NEEDED). */
  @GetMapping("/orders")
  PageDto<OrderRow> orders(@RequestParam(defaultValue = "") String status, @RequestParam(defaultValue = "0") int page,
                           @RequestParam(defaultValue = "20") int size) {
    var pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)));
    Page<PurchaseOrder> result = orders.adminSearch(status.trim().toUpperCase(Locale.ROOT), pageable);
    Map<UUID, String> emails = new HashMap<>();
    users.findAllById(result.getContent().stream().map(o -> o.buyerId).toList()).forEach(u -> emails.put(u.id, u.email));
    Map<UUID, String> titles = new HashMap<>();
    events.findAllById(result.getContent().stream().map(o -> o.eventId).toList()).forEach(e -> titles.put(e.id, e.title));
    List<OrderRow> items = result.getContent().stream().map(o -> new OrderRow(o.id, o.status, titles.get(o.eventId), emails.get(o.buyerId),
        o.phone, o.subtotal, o.fees, o.total, o.processCode, o.failureReason, o.createdAt)).toList();
    return PageDto.of(result, items);
  }
}
