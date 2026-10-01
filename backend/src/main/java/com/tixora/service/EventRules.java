package com.tixora.service;

import com.tixora.model.Event;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Regles de temps des evenements : un evenement termine est verrouille (vente, modification, controle). */
@Component
public class EventRules {
  /** Duree supposee quand l'organisateur n'a pas indique d'heure de fin. */
  public static final int DEFAULT_DURATION_HOURS = 6;

  private final ZoneId zone;

  public EventRules(@Value("${app.timezone}") String timezone) {
    this.zone = ZoneId.of(timezone);
  }

  public LocalDateTime now() {
    return LocalDateTime.now(zone);
  }

  public LocalDateTime nowMinusDefault() {
    return now().minusHours(DEFAULT_DURATION_HOURS);
  }

  public LocalDateTime endOf(Event e) {
    return e.endsAt != null ? e.endsAt : e.startsAt.plusHours(DEFAULT_DURATION_HOURS);
  }

  public boolean isEnded(Event e) {
    return now().isAfter(endOf(e));
  }
}
