package com.tixora.web;

import com.tixora.model.Event;
import com.tixora.model.Ticket;
import com.tixora.model.User;
import com.tixora.repository.EventRepository;
import com.tixora.repository.TicketRepository;
import com.tixora.repository.UserRepository;
import com.tixora.service.TicketService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TicketController {
  record ScanReq(@NotBlank String code) {}

  /** Personnalisation du billet : gabarit, couleur, message et logo de l'organisateur (chemin relatif a la base de l'API). */
  record Design(String template, String color, String message, String logo) {}

  record TicketDto(UUID id, String code, UUID eventId, String eventTitle, String venue, String city, LocalDateTime startsAt,
                   String categoryName, int price, String status, String organizerName, Design design) {}

  private final TicketService service;
  private final TicketRepository tickets;
  private final UserRepository users;
  private final EventRepository events;

  public TicketController(TicketService service, TicketRepository tickets, UserRepository users, EventRepository events) {
    this.service = service;
    this.tickets = tickets;
    this.users = users;
    this.events = events;
  }

  @GetMapping("/tickets/mine")
  List<TicketDto> mine(Authentication auth) {
    List<Ticket> list = tickets.findByOwnerIdOrderByStartsAtDesc(UUID.fromString(auth.getName()));
    Map<UUID, Event> byEvent = new HashMap<>();
    events.findAllById(list.stream().map(t -> t.eventId).collect(Collectors.toSet())).forEach(e -> byEvent.put(e.id, e));
    Map<UUID, User> organizers = new HashMap<>();
    users.findAllById(byEvent.values().stream().map(e -> e.organizerId).collect(Collectors.toSet())).forEach(u -> organizers.put(u.id, u));

    return list.stream().map(t -> {
      Event e = byEvent.get(t.eventId);
      User org = e == null ? null : organizers.get(e.organizerId);
      String logo = org != null && org.hasLogo
          ? "/organizers/" + org.id + "/logo?v=" + (org.logoUpdatedAt == null ? 0 : org.logoUpdatedAt.toEpochMilli()) : null;
      Design design = new Design(e == null ? "CLASSIC" : e.ticketTemplate, e == null ? "#f24e12" : e.ticketColor,
          e == null ? null : e.ticketMessage, logo);
      return new TicketDto(t.id, t.code, t.eventId, t.eventTitle, t.venue, e == null ? null : e.city, t.startsAt,
          t.categoryName, t.price, t.status, org == null ? null : displayName(org), design);
    }).toList();
  }

  @PostMapping("/tickets/scan")
  TicketService.Scan scan(Authentication auth, @Valid @RequestBody ScanReq r) {
    User who = users.findById(UUID.fromString(auth.getName()))
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide"));
    return service.scan(r.code().trim(), who);
  }

  static String displayName(User u) {
    if (u.organization != null && !u.organization.isBlank()) return u.organization;
    return ((u.firstName == null ? "" : u.firstName) + " " + (u.lastName == null ? "" : u.lastName)).trim();
  }
}
