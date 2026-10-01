package com.tixora.web;

import com.tixora.payment.PaymentGateway;
import com.tixora.service.PricingService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Configuration publique lue par le frontend (aucun secret : le Client ID Google est public par nature). */
@RestController
@RequestMapping("/api")
public class ConfigController {
  private final PricingService pricing;
  private final PaymentGateway gateway;
  private final String googleClientId;

  public ConfigController(PricingService pricing, PaymentGateway gateway, @Value("${app.google-client-id}") String googleClientId) {
    this.pricing = pricing;
    this.gateway = gateway;
    this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
  }

  @GetMapping("/config")
  Map<String, Object> config() {
    Map<String, Object> c = new LinkedHashMap<>();
    c.put("commissionPercent", pricing.commissionPercent());
    c.put("feePercent", pricing.feePercent());
    c.put("paymentMode", gateway.live() ? "live" : "simulate");
    c.put("googleClientId", googleClientId);
    return c;
  }
}
