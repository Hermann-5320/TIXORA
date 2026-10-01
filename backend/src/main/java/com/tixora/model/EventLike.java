package com.tixora.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_like", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "event_id"}))
public class EventLike {
  @Id @GeneratedValue public UUID id;
  @Column(name = "user_id", nullable = false) public UUID userId;
  @Column(name = "event_id", nullable = false) public UUID eventId;
  public Instant createdAt = Instant.now();
}
