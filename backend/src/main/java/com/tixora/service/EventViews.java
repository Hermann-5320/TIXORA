package com.tixora.service;

import com.tixora.dto.EventDto;
import com.tixora.model.Event;
import com.tixora.model.User;
import com.tixora.repository.EventLikeRepository;
import com.tixora.repository.UserRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** Transforme des evenements en DTO en ajoutant j'aime, organisateur et etat (termine ou non), en peu de requetes. */
@Service
public class EventViews {
  private final EventLikeRepository likes;
  private final UserRepository users;
  private final EventRules rules;

  public EventViews(EventLikeRepository likes, UserRepository users, EventRules rules) {
    this.likes = likes;
    this.users = users;
    this.rules = rules;
  }

  public List<EventDto> build(List<Event> events, UUID viewerId) {
    if (events.isEmpty()) return List.of();
    List<UUID> ids = events.stream().map(e -> e.id).toList();

    Map<UUID, Long> counts = new HashMap<>();
    for (Object[] row : likes.countByEventIds(ids)) counts.put((UUID) row[0], (Long) row[1]);
    Set<UUID> liked = viewerId == null ? Set.of() : new HashSet<>(likes.likedAmong(viewerId, ids));

    Set<UUID> organizerIds = events.stream().map(e -> e.organizerId).filter(id -> id != null).collect(Collectors.toSet());
    Map<UUID, String> names = new HashMap<>();
    Map<UUID, String> logos = new HashMap<>();
    for (User u : users.findAllById(organizerIds)) {
      names.put(u.id, displayName(u));
      if (u.hasLogo) logos.put(u.id, "/organizers/" + u.id + "/logo?v=" + (u.logoUpdatedAt == null ? 0 : u.logoUpdatedAt.toEpochMilli()));
    }

    return events.stream().map(e -> toDto(e, counts.getOrDefault(e.id, 0L), liked.contains(e.id), names.get(e.organizerId), logos.get(e.organizerId))).toList();
  }

  public EventDto one(Event event, UUID viewerId) {
    return build(List.of(event), viewerId).get(0);
  }

  private EventDto toDto(Event e, long likeCount, boolean likedByMe, String organizerName, String organizerLogo) {
    String image = e.hasImage
        ? "/events/" + e.id + "/image?v=" + (e.imageUpdatedAt == null ? 0 : e.imageUpdatedAt.toEpochMilli())
        : null;
    var types = e.ticketTypes.stream()
        .map(t -> new EventDto.TicketTypeDto(t.id, t.name, t.price, t.capacity, t.sold)).toList();
    return new EventDto(e.id, e.title, e.venue, e.city, e.description, e.category, e.startsAt, e.endsAt,
        e.latitude, e.longitude, image, e.status, e.rejectionReason, rules.isEnded(e), e.organizerId,
        organizerName, organizerLogo, e.ticketTemplate, e.ticketColor, e.ticketMessage, types, likeCount, likedByMe, null);
  }

  static String displayName(User u) {
    if (u.organization != null && !u.organization.isBlank()) return u.organization;
    return ((u.firstName == null ? "" : u.firstName) + " " + (u.lastName == null ? "" : u.lastName)).trim();
  }

  public Collection<UUID> idsOf(List<Event> events) {
    return events.stream().map(e -> e.id).toList();
  }
}
