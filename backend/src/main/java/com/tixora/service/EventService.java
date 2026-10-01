package com.tixora.service;

import com.tixora.model.Const;
import com.tixora.model.Event;
import com.tixora.model.EventImage;
import com.tixora.model.TicketType;
import com.tixora.repository.EventImageRepository;
import com.tixora.repository.EventLikeRepository;
import com.tixora.repository.EventRepository;
import com.tixora.web.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService {
  public record TypeReq(@NotBlank @Size(max = 60) String name, @Min(0) @Max(10_000_000) int price,
                        @Min(1) @Max(1_000_000) int capacity) {}

  /** Corps de creation et de modification. `ticketTypes` n'est exige qu'a la creation. */
  public record EventReq(@NotBlank @Size(max = 150) String title, @NotBlank @Size(max = 200) String venue,
                         @Size(max = 100) String city, @NotBlank String category, @Size(max = 2000) String description,
                         @NotNull LocalDateTime startsAt, LocalDateTime endsAt, Double latitude, Double longitude,
                         @Size(max = 10) List<@Valid TypeReq> ticketTypes,
                         String ticketTemplate, String ticketColor, @Size(max = 140) String ticketMessage) {}

  public record LikeState(long likesCount, boolean likedByMe) {}

  private final EventRepository events;
  private final EventImageRepository images;
  private final EventLikeRepository likes;
  private final EventRules rules;

  public EventService(EventRepository events, EventImageRepository images, EventLikeRepository likes, EventRules rules) {
    this.events = events;
    this.images = images;
    this.likes = likes;
    this.rules = rules;
  }

  @Transactional
  public Event create(UUID organizerId, EventReq r, boolean autoApprove) {
    if (r.ticketTypes() == null || r.ticketTypes().isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Ajoutez au moins un type de billet");
    }
    Event e = new Event();
    apply(e, r, true);
    e.organizerId = organizerId;
    e.status = autoApprove ? Const.APPROVED : Const.PENDING;
    for (TypeReq t : r.ticketTypes()) {
      TicketType type = new TicketType();
      type.name = t.name().trim();
      type.price = t.price();
      type.capacity = t.capacity();
      type.event = e;
      e.ticketTypes.add(type);
    }
    return events.save(e);
  }

  /** Modification par l'organisateur (verrouillee une fois l'evenement termine) ou par l'admin (toujours possible). */
  @Transactional
  public Event update(UUID eventId, UUID actorId, boolean admin, EventReq r) {
    Event e = owned(eventId, actorId, admin);
    if (!admin && rules.isEnded(e)) throw locked();
    apply(e, r, !admin && (r.startsAt() != null && !r.startsAt().equals(e.startsAt)));
    if (!admin && Const.REJECTED.equals(e.status)) {
      e.status = Const.PENDING; // nouvelle soumission apres refus
      e.rejectionReason = null;
    }
    return events.save(e);
  }

  @Transactional
  public Event saveImage(UUID eventId, UUID actorId, boolean admin, byte[] data, String contentType) {
    Event e = owned(eventId, actorId, admin);
    if (!admin && rules.isEnded(e)) throw locked();
    EventImage img = images.findById(eventId).orElseGet(EventImage::new);
    img.eventId = eventId;
    img.contentType = contentType;
    img.data = data;
    img.updatedAt = Instant.now();
    images.save(img);
    e.hasImage = true;
    e.imageUpdatedAt = img.updatedAt;
    return events.save(e);
  }

  @Transactional
  public Event review(UUID eventId, boolean approve, String reason) {
    Event e = events.findById(eventId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable"));
    if (approve) {
      e.status = Const.APPROVED;
      e.rejectionReason = null;
    } else {
      if (reason == null || reason.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Indiquez le motif du refus");
      e.status = Const.REJECTED;
      e.rejectionReason = reason.trim().length() > 500 ? reason.trim().substring(0, 500) : reason.trim();
    }
    return events.save(e);
  }

  @Transactional
  public LikeState like(UUID userId, UUID eventId, boolean on) {
    Event e = events.findById(eventId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable"));
    if (!Const.APPROVED.equals(e.status)) throw new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable");
    if (on) {
      likes.addIfAbsent(userId, eventId);
    } else {
      likes.remove(userId, eventId);
    }
    return new LikeState(likes.countByEventId(eventId), likes.existsByUserIdAndEventId(userId, eventId));
  }

  private Event owned(UUID eventId, UUID actorId, boolean admin) {
    Event e = events.findById(eventId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable"));
    if (!admin && !e.organizerId.equals(actorId)) throw new ApiException(HttpStatus.NOT_FOUND, "Evenement introuvable");
    return e;
  }

  private ApiException locked() {
    return new ApiException(HttpStatus.CONFLICT, "Evenement termine : il est verrouille, contactez l'administrateur pour le corriger");
  }

  private void apply(Event e, EventReq r, boolean mustBeFuture) {
    if (!Const.CATEGORIES.contains(r.category())) throw new ApiException(HttpStatus.BAD_REQUEST, "Categorie invalide");
    if (mustBeFuture && !r.startsAt().isAfter(rules.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La date de l'evenement doit etre dans le futur");
    }
    if (r.endsAt() != null && !r.endsAt().isAfter(r.startsAt())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "L'heure de fin doit suivre le debut");
    }
    boolean hasLat = r.latitude() != null, hasLng = r.longitude() != null;
    if (hasLat != hasLng) throw new ApiException(HttpStatus.BAD_REQUEST, "Latitude et longitude vont ensemble");
    if (hasLat && (r.latitude() < -90 || r.latitude() > 90 || r.longitude() < -180 || r.longitude() > 180)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Coordonnees invalides");
    }
    String template = r.ticketTemplate() == null || r.ticketTemplate().isBlank() ? "CLASSIC" : r.ticketTemplate();
    if (!Const.TEMPLATES.contains(template)) throw new ApiException(HttpStatus.BAD_REQUEST, "Gabarit de billet invalide");
    String color = r.ticketColor() == null || r.ticketColor().isBlank() ? "#f24e12" : r.ticketColor();
    if (!color.matches("^#[0-9a-fA-F]{6}$")) throw new ApiException(HttpStatus.BAD_REQUEST, "Couleur de billet invalide");
    e.ticketTemplate = template;
    e.ticketColor = color.toLowerCase();
    e.ticketMessage = r.ticketMessage() == null || r.ticketMessage().isBlank() ? null : r.ticketMessage().trim();
    e.title = r.title().trim();
    e.venue = r.venue().trim();
    e.city = r.city() == null || r.city().isBlank() ? null : r.city().trim();
    e.description = r.description();
    e.category = r.category();
    e.startsAt = r.startsAt();
    e.endsAt = r.endsAt();
    e.latitude = r.latitude();
    e.longitude = r.longitude();
  }
}
