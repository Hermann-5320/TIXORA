package com.tixora.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Vue d'un evenement envoyee au frontend. */
public record EventDto(
    UUID id, String title, String venue, String city, String description, String category,
    LocalDateTime startsAt, LocalDateTime endsAt, Double latitude, Double longitude,
    /** Chemin relatif a la base de l'API (ex. /events/{id}/image?v=...), null sans photo. */
    String image,
    String status, String rejectionReason,
    /** Vrai quand l'evenement est termine : il est alors verrouille. */
    boolean ended,
    UUID organizerId, String organizerName,
    /** Logo de l'organisateur (chemin relatif a la base de l'API), null sans logo. */
    String organizerLogo,
    String ticketTemplate, String ticketColor, String ticketMessage,
    List<TicketTypeDto> ticketTypes,
    long likesCount, boolean likedByMe, Double distanceKm) {

  public record TicketTypeDto(UUID id, String name, int price, int capacity, int sold) {}

  public EventDto withDistance(Double km) {
    return new EventDto(id, title, venue, city, description, category, startsAt, endsAt, latitude, longitude, image,
        status, rejectionReason, ended, organizerId, organizerName, organizerLogo, ticketTemplate, ticketColor, ticketMessage,
        ticketTypes, likesCount, likedByMe, km);
  }
}
