package com.tixora.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organizer_logo")
public class OrganizerLogo {
  @Id public UUID userId;
  @Column(nullable = false) public String contentType;
  @Column(nullable = false) public byte[] data;
  public Instant updatedAt = Instant.now();
}
