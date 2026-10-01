package com.tixora.web;

import com.tixora.model.OrganizerLogo;
import com.tixora.model.User;
import com.tixora.repository.EventRepository;
import com.tixora.repository.OrganizerLogoRepository;
import com.tixora.repository.TicketRepository;
import com.tixora.service.OrganizerService;
import com.tixora.service.PricingService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class OrganizerController {
  private static final int MAX_LOGO_BYTES = 1024 * 1024;

  record TypeStats(String name, long sold, long revenue) {}

  record EventStats(UUID eventId, long ticketsSold, long revenue, List<TypeStats> types) {}

  /** `revenue` = ventes de billets ; `commission` = part de Tixora ; `net` = ce qui revient a l'organisateur. */
  record Stats(long revenue, int commissionPercent, long commission, long net, long ticketsSold, List<EventStats> events) {}

  private final EventRepository events;
  private final TicketRepository tickets;
  private final OrganizerLogoRepository logos;
  private final OrganizerService service;
  private final PricingService pricing;

  public OrganizerController(EventRepository events, TicketRepository tickets, OrganizerLogoRepository logos,
                             OrganizerService service, PricingService pricing) {
    this.events = events;
    this.tickets = tickets;
    this.logos = logos;
    this.service = service;
    this.pricing = pricing;
  }

  /** Ventes reelles (billets payes) par evenement et par type de billet, avec le total, la commission et le net. */
  @GetMapping("/organizer/stats")
  Stats stats(Authentication auth) {
    List<UUID> ids = events.findByOrganizerId(UUID.fromString(auth.getName())).stream().map(e -> e.id).toList();
    Map<UUID, List<TypeStats>> types = new LinkedHashMap<>();
    Map<UUID, long[]> totals = new LinkedHashMap<>();
    long revenue = 0, sold = 0;
    if (!ids.isEmpty()) {
      for (Object[] row : tickets.statsByEvent(ids)) {
        UUID eventId = (UUID) row[0];
        long count = (Long) row[2], amount = (Long) row[3];
        types.computeIfAbsent(eventId, k -> new ArrayList<>()).add(new TypeStats((String) row[1], count, amount));
        long[] t = totals.computeIfAbsent(eventId, k -> new long[2]);
        t[0] += count;
        t[1] += amount;
        sold += count;
        revenue += amount;
      }
    }
    List<EventStats> list = new ArrayList<>();
    for (UUID id : ids) {
      long[] t = totals.getOrDefault(id, new long[2]);
      list.add(new EventStats(id, t[0], t[1], types.getOrDefault(id, List.of())));
    }
    long commission = pricing.commissionOf(revenue);
    return new Stats(revenue, pricing.commissionPercent(), commission, revenue - commission, sold, list);
  }

  @PostMapping(value = "/organizer/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  User uploadLogo(Authentication auth, @RequestParam("file") MultipartFile file) throws IOException {
    byte[] data = file.getBytes();
    if (data.length == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Fichier vide");
    if (data.length > MAX_LOGO_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Logo trop lourd (1 Mo maximum)");
    String type = ImageSniffer.type(data);
    if (type == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Format d'image non supporte (JPEG, PNG ou WebP)");
    return service.saveLogo(UUID.fromString(auth.getName()), data, type);
  }

  @DeleteMapping("/organizer/logo")
  User deleteLogo(Authentication auth) {
    return service.removeLogo(UUID.fromString(auth.getName()));
  }

  @GetMapping("/organizers/{id}/logo")
  ResponseEntity<byte[]> logo(@PathVariable UUID id) {
    OrganizerLogo l = logos.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Logo introuvable"));
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(l.contentType))
        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable").body(l.data);
  }
}
