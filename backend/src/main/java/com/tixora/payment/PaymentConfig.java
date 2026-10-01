package com.tixora.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PaymentConfig {
  private static final Logger log = LoggerFactory.getLogger(PaymentConfig.class);

  @Bean
  PaymentGateway paymentGateway(@Value("${app.ctpay.mode}") String mode, @Value("${app.ctpay.base-url}") String baseUrl,
                                @Value("${app.ctpay.token}") String token, @Value("${app.ctpay.operators}") String operators) {
    if ("live".equalsIgnoreCase(mode)) {
      if (token == null || token.isBlank()) throw new IllegalStateException("CTPAY_MODE=live exige CTPAY_TOKEN");
      log.info("Paiement CT Pay en mode LIVE ({})", baseUrl);
      java.util.Set<String> allowed = new java.util.HashSet<>();
      for (String k : operators.split(",")) if (!k.isBlank()) allowed.add(k.trim().toUpperCase());
      return new CtPayGateway(baseUrl, token.trim(), allowed);
    }
    log.warn("Paiement en mode SIMULATE : aucun vrai debit (definir CTPAY_MODE=live pour utiliser CT Pay)");
    return new SimulatedGateway();
  }
}
