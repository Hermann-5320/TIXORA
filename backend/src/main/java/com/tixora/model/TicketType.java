package com.tixora.model;

import jakarta.persistence.*;
import java.util.UUID;

/** Type de billet d'un evenement (ex. Classique, VIP). */
@Entity
@Table(name = "ticket_type")
public class TicketType {
  @Id @GeneratedValue public UUID id;
  public String name;
  public int price;
  public int capacity;
  public int sold;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) public Event event;
}
