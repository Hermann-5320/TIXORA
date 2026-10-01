package com.tixora.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tixora.web.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Verifie un jeton d'identite Google (Google Identity Services) : signature RS256 controlee avec les cles publiques de Google,
 * emetteur, audience (notre Client ID), expiration et email verifie.
 */
@Service
public class GoogleTokenVerifier {
  private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
  private static final String CERTS = "https://www.googleapis.com/oauth2/v3/certs";

  public record Profile(String email, String givenName, String familyName) {}

  private final String clientId;
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  private final ObjectMapper mapper = new ObjectMapper();
  private volatile Map<String, PublicKey> keys = Map.of();
  private volatile long keysAt;

  public GoogleTokenVerifier(@Value("${app.google-client-id}") String clientId) {
    this.clientId = clientId == null ? "" : clientId.trim();
  }

  public boolean enabled() {
    return !clientId.isEmpty();
  }

  public Profile verify(String idToken) {
    if (!enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Connexion Google non configuree");
    try {
      String[] parts = idToken.split("\\.");
      if (parts.length != 3) throw invalid();
      JsonNode header = mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
      if (!"RS256".equals(header.path("alg").asText())) throw invalid();
      PublicKey key = key(header.path("kid").asText());
      if (key == null) throw invalid();

      Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(idToken).getPayload(); // verifie signature + expiration
      String iss = c.getIssuer();
      if (!"https://accounts.google.com".equals(iss) && !"accounts.google.com".equals(iss)) throw invalid();
      if (c.getAudience() == null || !c.getAudience().contains(clientId)) throw invalid();
      Object verified = c.get("email_verified");
      if (!Boolean.TRUE.equals(verified) && !"true".equals(String.valueOf(verified))) throw invalid();
      String email = c.get("email", String.class);
      if (email == null || email.isBlank()) throw invalid();
      return new Profile(email.trim().toLowerCase(), c.get("given_name", String.class), c.get("family_name", String.class));
    } catch (JwtException | IllegalArgumentException e) {
      throw invalid();
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      log.warn("Verification Google impossible : {}", e.getClass().getSimpleName());
      throw new ApiException(HttpStatus.BAD_GATEWAY, "Impossible de verifier la connexion Google, reessayez");
    }
  }

  private ApiException invalid() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Connexion Google invalide");
  }

  private PublicKey key(String kid) throws Exception {
    PublicKey k = keys.get(kid);
    boolean stale = System.currentTimeMillis() - keysAt > 3_600_000;
    if (k != null && !stale) return k;
    if (System.currentTimeMillis() - keysAt > 30_000 || stale) refreshKeys(); // au plus un rechargement toutes les 30 s
    return keys.get(kid);
  }

  private synchronized void refreshKeys() throws Exception {
    HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(CERTS)).timeout(Duration.ofSeconds(8)).GET().build(),
        HttpResponse.BodyHandlers.ofString());
    JsonNode root = mapper.readTree(res.body());
    Map<String, PublicKey> fresh = new HashMap<>();
    KeyFactory rsa = KeyFactory.getInstance("RSA");
    for (JsonNode n : root.path("keys")) {
      if (!"RSA".equals(n.path("kty").asText())) continue;
      BigInteger mod = new BigInteger(1, Base64.getUrlDecoder().decode(n.path("n").asText()));
      BigInteger exp = new BigInteger(1, Base64.getUrlDecoder().decode(n.path("e").asText()));
      fresh.put(n.path("kid").asText(), rsa.generatePublic(new RSAPublicKeySpec(mod, exp)));
    }
    if (!fresh.isEmpty()) {
      keys = fresh;
      keysAt = System.currentTimeMillis();
    }
  }
}
