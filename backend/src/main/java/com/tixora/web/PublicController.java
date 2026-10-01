package com.tixora.web;

import com.tixora.model.Event;
import com.tixora.model.Const;
import com.tixora.repository.EventRepository;
import com.tixora.repository.TicketRepository;
import com.tixora.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.HtmlUtils;

/** Statistiques publiques (compteur de l'accueil) et pages de partage avec apercu (Open Graph) pour WhatsApp, Facebook, X. */
@RestController
@RequestMapping("/api")
public class PublicController {
  private final EventRepository events;
  private final TicketRepository tickets;
  private final UserRepository users;
  private final String publicUrl;

  public PublicController(EventRepository events, TicketRepository tickets, UserRepository users,
                          @Value("${app.public-url}") String publicUrl) {
    this.events = events;
    this.tickets = tickets;
    this.users = users;
    this.publicUrl = publicUrl == null ? "" : publicUrl.trim().replaceAll("/+$", "");
  }

  @GetMapping("/stats")
  Map<String, Object> stats() {
    Map<String, Object> s = new LinkedHashMap<>();
    s.put("events", events.countVisible());
    s.put("cities", events.countVisibleCities());
    s.put("ticketsSold", tickets.count());
    return s;
  }

  /**
   * Les robots des reseaux sociaux ne lisent pas le JavaScript d'une application React : ce lien renvoie une page
   * minimale avec les balises Open Graph, puis redirige les humains vers la vraie page de l'evenement.
   */
  @GetMapping(value = "/share/events/{id}", produces = MediaType.TEXT_HTML_VALUE)
  ResponseEntity<String> shareEvent(@PathVariable UUID id, HttpServletRequest request) {
    Event e = events.findById(id).filter(this::isPublic).orElse(null);
    if (e == null) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_HTML)
          .body("<!doctype html><meta charset=\"utf-8\"><title>Tixora</title><p>Evenement introuvable.</p>");
    }
    String apiBase = ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
    String front = publicUrl.isEmpty() ? apiBase : publicUrl;
    String pageUrl = front + "/evenements/" + e.id;
    String when = e.startsAt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRANCE));
    String where = e.city == null || e.city.isBlank() ? e.venue : e.venue + ", " + e.city;
    String desc = when + " - " + where + (e.description == null || e.description.isBlank() ? "" : ". " + shorten(e.description, 160));
    String image = e.hasImage
        ? apiBase + "/api/events/" + e.id + "/image?v=" + (e.imageUpdatedAt == null ? 0 : e.imageUpdatedAt.toEpochMilli())
        : null;

    String title = HtmlUtils.htmlEscape(e.title + " | Tixora");
    StringBuilder h = new StringBuilder("<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">");
    h.append("<title>").append(title).append("</title>");
    h.append("<meta property=\"og:type\" content=\"website\"><meta property=\"og:site_name\" content=\"Tixora\">");
    h.append("<meta property=\"og:title\" content=\"").append(title).append("\">");
    h.append("<meta property=\"og:description\" content=\"").append(HtmlUtils.htmlEscape(desc)).append("\">");
    h.append("<meta property=\"og:url\" content=\"").append(HtmlUtils.htmlEscape(pageUrl)).append("\">");
    h.append("<meta name=\"twitter:card\" content=\"").append(image != null ? "summary_large_image" : "summary").append("\">");
    if (image != null) h.append("<meta property=\"og:image\" content=\"").append(HtmlUtils.htmlEscape(image)).append("\">");
    h.append("<meta http-equiv=\"refresh\" content=\"0;url=").append(HtmlUtils.htmlEscape(pageUrl)).append("\">");
    h.append("</head><body><p><a href=\"").append(HtmlUtils.htmlEscape(pageUrl)).append("\">")
        .append(HtmlUtils.htmlEscape(e.title)).append("</a></p></body></html>");
    return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "public, max-age=300").contentType(MediaType.TEXT_HTML).body(h.toString());
  }

  private boolean isPublic(Event e) {
    return Const.APPROVED.equals(e.status)
        && users.findById(e.organizerId).map(u -> !Const.BLOCKED.equals(u.status)).orElse(false);
  }

  private static String shorten(String s, int max) {
    String t = s.replaceAll("\\s+", " ").trim();
    return t.length() <= max ? t : t.substring(0, max - 1) + "…";
  }
}
