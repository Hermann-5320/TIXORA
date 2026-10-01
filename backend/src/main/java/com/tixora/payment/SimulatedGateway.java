package com.tixora.payment;

import java.util.List;

/**
 * Passerelle de developpement (CTPAY_MODE=simulate) : aucun appel reseau, aucun debit.
 * Le paiement reussit apres 4 s, sauf si le numero se termine par 00 (echec simule).
 */
public class SimulatedGateway implements PaymentGateway {
  @Override
  public boolean live() {
    return false;
  }

  @Override
  public List<Operator> operators() {
    return List.of(new Operator("MOMO", "MTN Mobile Money"), new Operator("OM", "Orange Money"));
  }

  @Override
  public Initiation initiate(int amount, String motif, String operatorKey, String phone, String transactionId, String callbackUrl) {
    return new Initiation("SIM_" + System.currentTimeMillis() + (phone.endsWith("00") ? "_F" : "_S"), "PENDING", null, null);
  }

  @Override
  public String status(String processCode) {
    String[] parts = processCode.split("_");
    if (parts.length < 3) return "FAILED";
    long started;
    try {
      started = Long.parseLong(parts[1]);
    } catch (NumberFormatException e) {
      return "FAILED";
    }
    if (System.currentTimeMillis() - started < 4000) return "PENDING";
    return "F".equals(parts[2]) ? "FAILED" : "SUCCESS";
  }
}
