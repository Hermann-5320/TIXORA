package com.tixora.web;

import java.util.UUID;
import org.springframework.security.core.Authentication;

/** Acces simple a l'utilisateur courant (les routes publiques recoivent aussi un visiteur anonyme). */
final class Actor {
  private Actor() {}

  static UUID id(Authentication auth) {
    if (auth == null) return null;
    try {
      return UUID.fromString(auth.getName());
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  static boolean isAdmin(Authentication auth) {
    return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
  }
}
