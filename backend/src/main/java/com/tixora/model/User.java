package com.tixora.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
  @Id @GeneratedValue public UUID id;
  public String firstName;
  public String lastName;
  @Column(unique = true, nullable = false) public String email;
  @JsonIgnore public String passwordHash;
  /** CLIENT, ORGANISATEUR, CONTROLEUR ou ADMIN. */
  public String role;
  public String phone;
  public String organization;
  public UUID eventId;
  public UUID organizerId;
  /** ACTIVE ou BLOCKED. */
  public String status = Const.ACTIVE;
  /** Logo de l'organisateur (imprime sur ses billets). */
  public boolean hasLogo;
  public Instant logoUpdatedAt;
  public Instant createdAt = Instant.now();
}
