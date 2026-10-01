package com.tixora.web;

import com.tixora.model.User;
import com.tixora.repository.EventRepository;
import com.tixora.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/controllers")
public class ControllerAccountController {
  record Req(@NotBlank String firstName, @NotBlank String lastName, @NotBlank @Email String email,
             @NotBlank @Size(min = 8) String password, @NotNull UUID eventId) {}

  private final UserRepository users;
  private final EventRepository events;
  private final PasswordEncoder encoder;

  public ControllerAccountController(UserRepository users, EventRepository events, PasswordEncoder encoder) {
    this.users = users;
    this.events = events;
    this.encoder = encoder;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  User create(Authentication auth, @Valid @RequestBody Req r) {
    UUID organizerId = UUID.fromString(auth.getName());
    events.findById(r.eventId()).filter(e -> e.organizerId.equals(organizerId))
        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Evenement invalide"));
    String email = r.email().trim().toLowerCase();
    if (users.existsByEmail(email)) throw new ApiException(HttpStatus.CONFLICT, "Un compte existe deja avec cet email");
    User u = new User();
    u.firstName = r.firstName().trim();
    u.lastName = r.lastName().trim();
    u.email = email;
    u.passwordHash = encoder.encode(r.password());
    u.role = "CONTROLEUR";
    u.eventId = r.eventId();
    u.organizerId = organizerId;
    return users.save(u);
  }

  @GetMapping
  List<User> list(Authentication auth) {
    return users.findByRoleAndOrganizerId("CONTROLEUR", UUID.fromString(auth.getName()));
  }
}
