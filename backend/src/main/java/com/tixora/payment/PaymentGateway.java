package com.tixora.payment;

import java.util.List;

/** Passerelle de paiement Mobile Money (CT Pay en production, simulation en developpement). */
public interface PaymentGateway {
  record Operator(String key, String name) {}

  /** `fees` et `total` : valeurs reelles annoncees par CT Pay (null en simulation). */
  record Initiation(String processCode, String status, Integer fees, Integer total) {}

  List<Operator> operators();

  /** Lance le paiement : le client recoit un message USSD et saisit son code PIN. */
  Initiation initiate(int amount, String motif, String operatorKey, String phone, String transactionId, String callbackUrl);

  /** Etat normalise du paiement : SUCCESS, PENDING ou FAILED (FAILED, ERROR et CANCELLED de CT Pay). */
  String status(String processCode);

  boolean live();

  /** Echec d'appel : `rejected` = CT Pay a repondu par une erreur affichable au client, sinon service injoignable. */
  class PaymentException extends RuntimeException {
    public final boolean rejected;

    public PaymentException(String message, boolean rejected) {
      super(message);
      this.rejected = rejected;
    }
  }
}
