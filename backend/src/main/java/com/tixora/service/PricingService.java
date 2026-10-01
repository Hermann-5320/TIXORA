package com.tixora.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Frais de paiement (supportes par le client) et commission Tixora (prelevee sur les ventes de l'organisateur). */
@Service
public class PricingService {
  private final double feePercent;
  private final long feeBasisPoints;
  private final int commissionPercent;

  public PricingService(@Value("${app.ctpay.fee-percent}") double feePercent, @Value("${app.commission-percent}") int commissionPercent) {
    if (feePercent < 0 || feePercent > 50) throw new IllegalArgumentException("CTPAY_FEE_PERCENT invalide");
    if (commissionPercent < 0 || commissionPercent > 100) throw new IllegalArgumentException("COMMISSION_PERCENT invalide");
    this.feePercent = feePercent;
    this.feeBasisPoints = Math.round(feePercent * 100);
    this.commissionPercent = commissionPercent;
  }

  /**
   * Estimation du montant paye par le client : CT Pay AJOUTE ses frais au montant envoye. Mesures reelles : 100 -> 105,
   * 1000 -> 1048, 5000 -> 5239, soit environ 4,78 % arrondi au superieur. On envoie le prix exact des billets ; ceci ne sert qu'a
   * l'affichage avant paiement, les montants reels renvoyes par CT Pay les remplacent ensuite.
   */
  public int totalWithFees(int subtotal) {
    if (subtotal <= 0) return 0;
    return subtotal + (int) (((long) subtotal * feeBasisPoints + 9_999) / 10_000);
  }

  public long commissionOf(long revenue) {
    return (revenue * commissionPercent + 50) / 100;
  }

  public double feePercent() {
    return feePercent;
  }

  public int commissionPercent() {
    return commissionPercent;
  }
}
