package com.tixora.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.BatchSize;

@Entity
public class Event {
  @Id @GeneratedValue public UUID id;
  public String title;
  public String venue;
  public String city;
  @Column(length = 2000) public String description;
  public String category;
  public LocalDateTime startsAt;
  public LocalDateTime endsAt;
  public Double latitude;
  public Double longitude;
  public UUID organizerId;
  /** PENDING (a valider), APPROVED (publie), REJECTED (refuse). */
  public String status = Const.PENDING;
  @Column(length = 500) public String rejectionReason;
  /** Personnalisation du billet : gabarit (CLASSIC, MODERN, FESTIVAL, MINIMAL), couleur #RRGGBB et message (le logo est celui de l'organisateur). */
  public String ticketTemplate = "CLASSIC";
  public String ticketColor = "#f24e12";
  @Column(length = 140) public String ticketMessage;
  public boolean hasImage;
  public Instant imageUpdatedAt;
  public Instant createdAt = Instant.now();
  @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  @BatchSize(size = 50)
  public List<TicketType> ticketTypes = new ArrayList<>();
}
