package com.tixora.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Commande en cours de paiement. Les places sont reservees des la creation ; les billets ne sont emis qu'apres
 * confirmation du paiement (SUCCESS). PENDING -> SUCCESS | FAILED | EXPIRED (| REFUND_NEEDED).
 */
@Entity
@Table(name = "purchase_order")
public class PurchaseOrder {
  @Embeddable
  public static class Line {
    public UUID ticketTypeId;
    public String name;
    public int price;
    public int quantity;
  }

  @Id @GeneratedValue public UUID id;
  public UUID buyerId;
  public UUID eventId;
  public String status = Const.ORDER_PENDING;
  public String operatorKey;
  public String phone;
  /** Prix des billets, frais de service, total debite au client. */
  public int subtotal;
  public int fees;
  public int total;
  @Column(unique = true) public String transactionId;
  public String processCode;
  @Column(length = 300) public String failureReason;
  public Instant createdAt = Instant.now();
  public Instant expiresAt;
  public Instant paidAt;
  public Instant lastCheckedAt;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "purchase_order_line", joinColumns = @JoinColumn(name = "order_id"))
  public List<Line> lines = new ArrayList<>();
}
