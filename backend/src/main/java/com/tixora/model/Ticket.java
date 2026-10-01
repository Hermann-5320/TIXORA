package com.tixora.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
public class Ticket {
  @Id @GeneratedValue public UUID id;
  @Column(unique = true, nullable = false) public String code;
  public UUID eventId;
  public String eventTitle;
  public String venue;
  public LocalDateTime startsAt;
  public String categoryName;
  public int price;
  public UUID ownerId;
  public String status;
  public UUID orderId;
}
