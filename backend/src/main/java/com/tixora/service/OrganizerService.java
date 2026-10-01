package com.tixora.service;

import com.tixora.model.OrganizerLogo;
import com.tixora.model.User;
import com.tixora.repository.OrganizerLogoRepository;
import com.tixora.repository.UserRepository;
import com.tixora.web.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizerService {
  private final UserRepository users;
  private final OrganizerLogoRepository logos;

  public OrganizerService(UserRepository users, OrganizerLogoRepository logos) {
    this.users = users;
    this.logos = logos;
  }

  @Transactional
  public User saveLogo(UUID userId, byte[] data, String contentType) {
    User u = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    OrganizerLogo logo = logos.findById(userId).orElseGet(OrganizerLogo::new);
    logo.userId = userId;
    logo.contentType = contentType;
    logo.data = data;
    logo.updatedAt = Instant.now();
    logos.save(logo);
    u.hasLogo = true;
    u.logoUpdatedAt = logo.updatedAt;
    return users.save(u);
  }

  @Transactional
  public User removeLogo(UUID userId) {
    User u = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    logos.deleteById(userId);
    u.hasLogo = false;
    u.logoUpdatedAt = null;
    return users.save(u);
  }
}
