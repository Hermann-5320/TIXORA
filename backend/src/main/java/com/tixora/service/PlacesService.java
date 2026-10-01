package com.tixora.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tixora.web.ApiException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Recherche de lieux precise via SerpApi (Google Maps). La cle SerpApi reste cote serveur ; les resultats sont mis en cache
 * 24 h et chaque utilisateur est limite (40 recherches par heure) pour economiser le quota.
 */
@Service
public class PlacesService {
  private static final Logger log = LoggerFactory.getLogger(PlacesService.class);
  private static final long TTL_MS = 24L * 3600 * 1000;
  private static final int PER_HOUR = 40;

  public record Place(String title, String address, double latitude, double longitude) {}

  private record Cached(long at, List<Place> places) {}

  private final String apiKey;
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  private final ObjectMapper mapper = new ObjectMapper();
  private final Map<String, Cached> cache = new ConcurrentHashMap<>();
  private final Map<UUID, Deque<Long>> usage = new ConcurrentHashMap<>();

  public PlacesService(@Value("${app.serpapi-key}") String apiKey) {
    this.apiKey = apiKey == null ? "" : apiKey.trim();
  }

  public List<Place> search(String rawQuery, UUID userId) {
    if (apiKey.isEmpty()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Recherche de lieux non configuree");
    String q = rawQuery == null ? "" : rawQuery.trim();
    if (q.length() < 3 || q.length() > 120) throw new ApiException(HttpStatus.BAD_REQUEST, "Saisissez au moins 3 caracteres");
    String normalized = q.toLowerCase(Locale.ROOT);
    Cached hit = cache.get(normalized);
    if (hit != null && System.currentTimeMillis() - hit.at < TTL_MS) return hit.places;
    throttle(userId);

    String query = normalized.contains("cameroun") || normalized.contains("cameroon") ? q : q + ", Cameroun";
    String url = "https://serpapi.com/search.json?engine=google_maps&type=search&hl=fr&gl=cm"
        + "&ll=" + enc("@5.6,12.4,6z") + "&q=" + enc(query) + "&api_key=" + enc(apiKey);
    try {
      HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15)).GET().build(),
          HttpResponse.BodyHandlers.ofString());
      JsonNode root = mapper.readTree(res.body());
      List<Place> places = new ArrayList<>();
      if (root.has("error") && !root.path("error").asText().toLowerCase(Locale.ROOT).contains("hasn't returned any results")) {
        log.warn("SerpApi a repondu une erreur (HTTP {})", res.statusCode()); // le message peut citer la requete : non journalise
        throw new ApiException(HttpStatus.BAD_GATEWAY, "Recherche de lieux indisponible");
      }
      JsonNode single = root.path("place_results");
      if (single.isObject()) add(places, single);
      for (JsonNode n : root.path("local_results")) {
        if (places.size() >= 6) break;
        add(places, n);
      }
      if (cache.size() > 500) cache.clear();
      cache.put(normalized, new Cached(System.currentTimeMillis(), List.copyOf(places)));
      return places;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      log.warn("SerpApi injoignable : {}", e.getClass().getSimpleName());
      throw new ApiException(HttpStatus.BAD_GATEWAY, "Recherche de lieux indisponible");
    }
  }

  private void add(List<Place> out, JsonNode n) {
    JsonNode gps = n.path("gps_coordinates");
    if (!gps.has("latitude") || !gps.has("longitude")) return;
    out.add(new Place(n.path("title").asText(""), n.path("address").asText(""), gps.path("latitude").asDouble(), gps.path("longitude").asDouble()));
  }

  private void throttle(UUID userId) {
    Deque<Long> q = usage.computeIfAbsent(userId, k -> new ArrayDeque<>());
    long now = System.currentTimeMillis();
    synchronized (q) {
      while (!q.isEmpty() && now - q.peekFirst() > 3_600_000) q.pollFirst();
      if (q.size() >= PER_HOUR) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Trop de recherches, reessayez plus tard");
      q.addLast(now);
    }
  }

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }
}
