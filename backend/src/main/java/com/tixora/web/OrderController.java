package com.tixora.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tixora.model.PurchaseOrder;
import com.tixora.payment.PaymentGateway.Operator;
import com.tixora.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class OrderController {
  record PaymentReq(String operatorKey, String phone) {}

  record OrderReq(@NotNull UUID eventId, @NotEmpty List<OrderService.Item> items, PaymentReq payment) {}

  /** `subtotal` = prix des billets, `fees` = frais de service payes par le client, `total` = montant debite. */
  record OrderDto(UUID id, String status, int subtotal, int fees, int total, String failureReason, Instant expiresAt) {
    static OrderDto of(PurchaseOrder o) {
      return new OrderDto(o.id, o.status, o.subtotal, o.fees, o.total, o.failureReason, o.expiresAt);
    }
  }

  private final OrderService service;
  private final ObjectMapper mapper = new ObjectMapper();

  public OrderController(OrderService service) {
    this.service = service;
  }

  @GetMapping("/payments/operators")
  List<Operator> operators() {
    return service.operators();
  }

  /** Reserve les places et lance le paiement Mobile Money ; les billets sont emis une fois le paiement confirme. */
  @PostMapping("/orders")
  @ResponseStatus(HttpStatus.CREATED)
  OrderDto create(Authentication auth, @Valid @RequestBody OrderReq r) {
    var pay = r.payment() == null ? null : new OrderService.Payment(r.payment().operatorKey(), r.payment().phone());
    return OrderDto.of(service.place(UUID.fromString(auth.getName()), r.eventId(), r.items(), pay));
  }

  @GetMapping("/orders/{id}")
  OrderDto get(Authentication auth, @PathVariable UUID id) {
    return OrderDto.of(service.poll(id, UUID.fromString(auth.getName())));
  }

  /**
   * Notification CT Pay (parametres `status` et `id`). Elle n'est pas signee : on l'utilise seulement comme declencheur
   * et on reverifie l'etat reel du paiement aupres de CT Pay. Repond toujours 200 pour confirmer la reception.
   */
  @RequestMapping(value = "/payments/ctpay/callback", method = {RequestMethod.POST, RequestMethod.GET})
  ResponseEntity<Map<String, Boolean>> callback(HttpServletRequest req) {
    String id = req.getParameter("id");
    if (id == null && req.getContentLength() > 0 && req.getContentLength() < 10_000) {
      try {
        JsonNode body = mapper.readTree(req.getInputStream());
        id = body.path("id").asText(body.path("processCode").asText(null));
      } catch (Exception ignored) {
        // corps illisible : on repond quand meme 200
      }
    }
    service.onCallback(id);
    return ResponseEntity.ok(Map.of("received", true));
  }
}
