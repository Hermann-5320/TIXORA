package com.tixora.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Client CT Pay (https://gateway-prod.connecttechnology.io). Le token marchand reste cote serveur :
 * il n'est jamais envoye au navigateur ni ecrit dans les journaux.
 */
public class CtPayGateway implements PaymentGateway {
  private static final Logger log = LoggerFactory.getLogger(CtPayGateway.class);
  static final String OPERATORS = "/ct-payment/api/operator/getAll";
  static final String PAY = "/ct-payment/payments/pay/withPhone";
  static final String PROCESS = "/ct-payment/api/processes/";

  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private final ObjectMapper mapper = new ObjectMapper();
  private final String baseUrl;
  private final String token;
  private final java.util.Set<String> allowedOperators;
  private volatile List<Operator> operatorCache;
  private volatile long operatorCacheAt;

  public CtPayGateway(String baseUrl, String token, java.util.Set<String> allowedOperators) {
    this.baseUrl = baseUrl.replaceAll("/+$", "");
    this.token = token;
    this.allowedOperators = allowedOperators;
  }

  @Override
  public boolean live() {
    return true;
  }

  @Override
  public List<Operator> operators() {
    List<Operator> cached = operatorCache;
    if (cached != null && System.currentTimeMillis() - operatorCacheAt < 600_000) return cached;
    JsonNode root = send(request(OPERATORS).GET().build());
    ensureSuccess(root);
    List<Operator> list = new ArrayList<>();
    for (JsonNode n : root.path("data")) {
      // CT Pay marque MOMO et OM "CREATE_BUT_NOT_ACTIVE" tout en les acceptant : on se fie a une liste explicite (CTPAY_OPERATORS).
      String key = n.path("operatorKey").asText("").trim();
      if (!key.isEmpty() && allowedOperators.contains(key.toUpperCase())) list.add(new Operator(key, n.path("operatorName").asText(key)));
    }
    operatorCache = List.copyOf(list);
    operatorCacheAt = System.currentTimeMillis();
    return operatorCache;
  }

  @Override
  public Initiation initiate(int amount, String motif, String operatorKey, String phone, String transactionId, String callbackUrl) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("amount", amount);
    body.put("motif", motif);
    body.put("operatorKey", operatorKey);
    body.put("sourcePhoneNumber", phone);
    body.put("transactionUniqueID", transactionId);
    HttpRequest.Builder b = request(PAY);
    if (callbackUrl != null && !callbackUrl.isBlank()) b.header("callbackUrl", callbackUrl);
    try {
      b.POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
    } catch (IOException e) {
      throw new PaymentException("Requete de paiement invalide", false);
    }
    JsonNode root = send(b.build());
    ensureSuccess(root);
    JsonNode data = root.path("data");
    String code = data.path("processCode").asText("");
    if (code.isBlank()) throw new PaymentException("Reponse de paiement incomplete", false);
    Integer fees = data.has("processFees") ? (int) Math.ceil(data.path("processFees").asDouble()) : null;
    Integer total = data.has("processTotalAmount") ? (int) Math.ceil(data.path("processTotalAmount").asDouble()) : null;
    return new Initiation(code, normalize(data.path("processStatus").asText("PENDING")), fees, total);
  }

  @Override
  public String status(String processCode) {
    JsonNode root = send(request(PROCESS + URLEncoder.encode(processCode, StandardCharsets.UTF_8)).GET().build());
    ensureSuccess(root);
    return normalize(root.path("data").path("processStatus").asText("PENDING"));
  }

  /**
   * Etat CT Pay -> SUCCESS | PENDING | FAILED. CT Pay renvoie "SUCCESSFUL" (constate en reel). Tout statut inconnu reste PENDING :
   * on ne libere jamais des places pour un statut qu'on ne comprend pas (le delai d'expiration tranche).
   */
  static String normalize(String raw) {
    String s = raw == null ? "" : raw.trim().toUpperCase();
    if (s.equals("SUCCESS") || s.equals("SUCCESSFUL")) return "SUCCESS";
    if (s.equals("FAILED") || s.equals("FAILURE") || s.equals("ERROR") || s.equals("CANCELLED") || s.equals("CANCELED")
        || s.equals("REJECTED") || s.equals("DECLINED") || s.equals("EXPIRED")) return "FAILED";
    return "PENDING";
  }

  private HttpRequest.Builder request(String path) {
    return HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(Duration.ofSeconds(20))
        .header("Token", token).header("Content-Type", "application/json");
  }

  private JsonNode send(HttpRequest req) {
    try {
      HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() == 401 || res.statusCode() == 403) {
        log.error("CT Pay a refuse le token marchand (HTTP {}) : verifiez CTPAY_TOKEN", res.statusCode());
        throw new PaymentException("Service de paiement momentanement indisponible", false);
      }
      JsonNode root;
      try {
        root = mapper.readTree(res.body());
      } catch (IOException e) {
        log.warn("Reponse CT Pay illisible (HTTP {})", res.statusCode());
        throw new PaymentException("Service de paiement momentanement indisponible", false);
      }
      if (root == null || root.isMissingNode()) throw new PaymentException("Service de paiement momentanement indisponible", false);
      return root;
    } catch (IOException e) {
      log.warn("CT Pay injoignable : {}", e.getClass().getSimpleName());
      throw new PaymentException("Service de paiement momentanement indisponible", false);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new PaymentException("Service de paiement momentanement indisponible", false);
    }
  }

  private void ensureSuccess(JsonNode root) {
    if (!"SUCCESS".equalsIgnoreCase(root.path("status").asText(""))) {
      String message = root.path("message").asText("Paiement refuse");
      throw new PaymentException(message.length() > 200 ? message.substring(0, 200) : message, true);
    }
  }
}
