package com.tixora.web;

import com.tixora.dto.EventDto;
import com.tixora.dto.PageDto;
import com.tixora.model.Const;
import com.tixora.model.Event;
import com.tixora.model.EventImage;
import com.tixora.repository.EventImageRepository;
import com.tixora.repository.EventLikeRepository;
import com.tixora.repository.EventRepository;
import com.tixora.repository.UserRepository;
import com.tixora.service.EventRules;
import com.tixora.service.EventService;
import com.tixora.service.EventViews;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/events")
public class EventController {
  private static final int MAX_IMAGE_BYTES = 3 * 1024 * 1024;

  private final EventRepository events;
  private final EventImageRepository images;
  private final EventLikeRepository likes;
  private final UserRepository users;
  private final EventService service;
  private final EventViews views;
  private final EventRules rules;

  public EventController(EventRepository events, EventImageRepository images, EventLikeRepository likes,
                         UserRepository users, EventService service, EventViews views, EventRules rules) {
    this.events = events;
    this.images = images;
    this.likes = likes;
    this.users = users;
    this.service = service;
    this.views = views;
    this.rules = rules;
  }

  @GetMapping
  PageDto<EventDto> list(Authentication auth, @RequestParam(defaultValue = "") String q,
                         @RequestParam(defaultValue = "") String category, @RequestParam(defaultValue = "") String city,
                         @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
    var pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)), Sort.by("startsAt"));
    Page<Event> result = events.search(q.trim().toLowerCase(Locale.ROOT), category.trim().toUpperCase(Locale.ROOT),
        city.trim().toLowerCase(Locale.ROOT), rules.now(), rules.nowMinusDefault(), pageable);
    return PageDto.of(result, views.build(result.getContent(), Actor.id(auth)));
  }

  /** Les evenements a l'affiche : les plus aimes parmi les prochains. */
  @GetMapping("/featured")
  List<EventDto> featured(Authentication auth) {
    Page<Event> upcoming = events.search("", "", "", rules.now(), rules.nowMinusDefault(),
        PageRequest.of(0, 60, Sort.by("startsAt")));
    return views.build(upcoming.getContent(), Actor.id(auth)).stream()
        .sorted(Comparator.comparingLong(EventDto::likesCount).reversed().thenComparing(EventDto::startsAt))
        .limit(6).toList();
  }

  /** Evenements a venir autour d'un point (distance de Haversine), tries du plus proche au plus loin. */
  @GetMapping("/nearby")
  List<EventDto> nearby(Authentication auth, @RequestParam double lat, @RequestParam double lng,
                        @RequestParam(defaultValue = "50") double radiusKm) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new ApiException(HttpStatus.BAD_REQUEST, "Coordonnees invalides");
    double radius = Math.min(2000, Math.max(1, radiusKm));
    double dLat = radius / 111.0;
    double dLng = radius / (111.0 * Math.max(0.1, Math.cos(Math.toRadians(lat))));
    List<Event> box = events.withinBox(lat - dLat, lat + dLat, lng - dLng, lng + dLng, rules.now(), rules.nowMinusDefault());

    Map<UUID, Double> distance = new HashMap<>();
    for (Event e : box) {
      double km = haversineKm(lat, lng, e.latitude, e.longitude);
      if (km <= radius) distance.put(e.id, Math.round(km * 10) / 10.0);
    }
    List<Event> sorted = box.stream().filter(e -> distance.containsKey(e.id))
        .sorted(Comparator.comparingDouble(e -> distance.get(e.id))).limit(100).toList();
    return views.build(sorted, Actor.id(auth)).stream().map(d -> d.withDistance(distance.get(d.id()))).toList();
  }

  @GetMapping("/favorites")
  List<EventDto> favorites(Authentication auth) {
    UUID me = Actor.id(auth);
    List<UUID> ids = likes.favoriteIds(me);
    if (ids.isEmpty()) return List.of();
    Map<UUID, Integer> order = new HashMap<>();
    for (int i = 0; i < ids.size(); i++) order.put(ids.get(i), i);
    List<Event> found = events.visibleByIds(ids).stream().sorted(Comparator.comparingInt(e -> order.get(e.id))).toList();
    return views.build(found, me);
  }

  @GetMapping("/mine")
  List<EventDto> mine(Authentication auth) {
    UUID me = Actor.id(auth);
    return views.build(events.findByOrganizerIdOrderByStartsAtDesc(me), me);
  }

  @GetMapping("/{id}")
  EventDto get(Authentication auth, @PathVariable UUID id) {
    UUID viewer = Actor.id(auth);
    Event e = events.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable"));
    boolean privileged = Actor.isAdmin(auth) || (viewer != null && viewer.equals(e.organizerId));
    if (!privileged && !isPublic(e)) throw new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable");
    return views.one(e, viewer);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  EventDto create(Authentication auth, @Valid @RequestBody EventService.EventReq r) {
    UUID me = Actor.id(auth);
    return views.one(service.create(me, r, false), me);
  }

  @PutMapping("/{id}")
  EventDto update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody EventService.EventReq r) {
    UUID me = Actor.id(auth);
    return views.one(service.update(id, me, false, r), me);
  }

  @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  EventDto uploadImage(Authentication auth, @PathVariable UUID id, @RequestParam("file") MultipartFile file) throws IOException {
    byte[] data = file.getBytes();
    if (data.length == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Fichier vide");
    if (data.length > MAX_IMAGE_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Image trop lourde (3 Mo maximum)");
    String type = ImageSniffer.type(data);
    if (type == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Format d'image non supporte (JPEG, PNG ou WebP)");
    UUID me = Actor.id(auth);
    return views.one(service.saveImage(id, me, Actor.isAdmin(auth), data, type), me);
  }

  @GetMapping("/{id}/image")
  ResponseEntity<byte[]> image(@PathVariable UUID id) {
    EventImage img = images.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Image introuvable"));
    // L'URL contient ?v=<date de mise a jour> : le cache peut etre agressif.
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(img.contentType))
        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable").body(img.data);
  }

  @PostMapping("/{id}/like")
  EventService.LikeState like(Authentication auth, @PathVariable UUID id) {
    return service.like(Actor.id(auth), id, true);
  }

  @DeleteMapping("/{id}/like")
  EventService.LikeState unlike(Authentication auth, @PathVariable UUID id) {
    return service.like(Actor.id(auth), id, false);
  }

  private boolean isPublic(Event e) {
    return Const.APPROVED.equals(e.status)
        && users.findById(e.organizerId).map(u -> !Const.BLOCKED.equals(u.status)).orElse(false);
  }

  static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
    double r = 6371.0088;
    double dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
  }
}
