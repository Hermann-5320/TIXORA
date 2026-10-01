package com.tixora.model;

import java.util.Set;

/** Valeurs metier partagees (statuts, categories, roles). */
public final class Const {
  private Const() {}

  public static final String PENDING = "PENDING";
  public static final String APPROVED = "APPROVED";
  public static final String REJECTED = "REJECTED";

  public static final String ACTIVE = "ACTIVE";
  public static final String BLOCKED = "BLOCKED";

  public static final Set<String> TEMPLATES = Set.of("CLASSIC", "MODERN", "FESTIVAL", "MINIMAL");

  public static final String ORDER_PENDING = "PENDING";
  public static final String ORDER_SUCCESS = "SUCCESS";
  public static final String ORDER_FAILED = "FAILED";
  public static final String ORDER_EXPIRED = "EXPIRED";
  /** Paiement recu mais plus de place : a rembourser manuellement. */
  public static final String ORDER_REFUND = "REFUND_NEEDED";

  public static final Set<String> CATEGORIES =
      Set.of("MUSIQUE", "SPORT", "CULTURE", "TECH", "GASTRONOMIE", "BUSINESS", "GALA");
}
