package com.tixora.security;

import com.tixora.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final long ttlMs;

  public JwtService(@Value("${app.jwt-secret}") String secret, @Value("${app.jwt-ttl-minutes}") long ttlMinutes) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.ttlMs = ttlMinutes * 60_000;
  }

  public String generate(User user) {
    Date now = new Date();
    return Jwts.builder().subject(user.id.toString()).claim("role", user.role)
        .issuedAt(now).expiration(new Date(now.getTime() + ttlMs)).signWith(key).compact();
  }

  public Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }

  /** Signature HMAC utilisee pour rendre les codes QR infalsifiables. */
  public String sign(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key.getEncoded(), "HmacSHA256"));
      byte[] hash = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hash).substring(0, 16);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
