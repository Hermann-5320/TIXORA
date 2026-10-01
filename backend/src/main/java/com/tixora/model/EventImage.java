package com.tixora.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Photo d'un evenement, stockee en base (bytea) : aucun service externe requis, elle survit aux redeploiements. */
@Entity
@Table(name = "event_image")
public class EventImage {
  @Id public UUID eventId;
  @Column(nullable = false) public String contentType;
  @Column(nullable = false) public byte[] data;
  public Instant updatedAt = Instant.now();
}
