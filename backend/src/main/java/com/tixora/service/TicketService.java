package com.tixora.service;

import com.tixora.model.Ticket;
import com.tixora.model.User;
import com.tixora.repository.EventRepository;
import com.tixora.repository.TicketRepository;
import com.tixora.security.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Controle des billets a l'entree. L'emission des billets se fait dans OrderTx, apres paiement confirme. */
@Service
public class TicketService {
  public record Scan(String result, Ticket ticket) {}

  private final EventRepository events;
  private final EventRules rules;
  private final TicketRepository tickets;
  private final JwtService jwt;

  public TicketService(EventRepository events, TicketRepository tickets, JwtService jwt, EventRules rules) {
    this.events = events;
    this.rules = rules;
    this.tickets = tickets;
    this.jwt = jwt;
  }

  /** Validation atomique : un billet ne peut etre valide qu'une seule fois, meme avec des scans simultanes. */
  @Transactional
  public Scan scan(String code, User who) {
    int dot = code == null ? -1 : code.lastIndexOf('.');
    boolean signed = dot > 0 && jwt.sign(code.substring(0, dot)).equals(code.substring(dot + 1));
    Ticket ticket = signed ? tickets.findByCode(code).orElse(null) : null;
    if (ticket == null) return new Scan("INVALID", null);
    boolean allowed = "CONTROLEUR".equals(who.role)
        ? ticket.eventId.equals(who.eventId)
        : events.findById(ticket.eventId).map(e -> e.organizerId.equals(who.id)).orElse(false);
    if (!allowed) return new Scan("INVALID", null);
    if (events.findById(ticket.eventId).map(rules::isEnded).orElse(true)) return new Scan("EVENT_ENDED", ticket);
    return new Scan(tickets.markUsed(code) == 1 ? "VALID" : "ALREADY_USED", ticket);
  }
}
