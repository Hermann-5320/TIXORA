package com.tixora.web;

import com.tixora.model.Const;
import com.tixora.model.User;
import com.tixora.service.GoogleTokenVerifier;
import com.tixora.repository.UserRepository;
import com.tixora.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  record RegisterReq(@NotBlank String firstName, @NotBlank String lastName, @NotBlank @Email String email,
                     @NotBlank @Size(min = 8) String password, @NotBlank String role, String phone, String organization) {}
  record LoginReq(@NotBlank String email, @NotBlank String password) {}
  record LoginRes(String token, User user) {}
  record GoogleReq(@NotBlank String credential) {}

  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final GoogleTokenVerifier google;

  public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, GoogleTokenVerifier google) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
    this.google = google;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  User register(@Valid @RequestBody RegisterReq r) {
    if (!Set.of("CLIENT", "ORGANISATEUR").contains(r.role())) throw new ApiException(HttpStatus.BAD_REQUEST, "Role invalide");
    String email = r.email().trim().toLowerCase();
    if (users.existsByEmail(email)) throw new ApiException(HttpStatus.CONFLICT, "Un compte existe deja avec cet email");
    User u = new User();
    u.firstName = r.firstName().trim();
    u.lastName = r.lastName().trim();
    u.email = email;
    u.passwordHash = encoder.encode(r.password());
    u.role = r.role();
    u.phone = r.phone();
    u.organization = r.organization();
    return users.save(u);
  }

  @PostMapping("/login")
  LoginRes login(@Valid @RequestBody LoginReq r) {
    User u = users.findByEmail(r.email().trim().toLowerCase())
        .filter(x -> encoder.matches(r.password(), x.passwordHash))
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email ou mot de passe incorrect"));
    if (Const.BLOCKED.equals(u.status)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Ce compte a ete bloque. Contactez le support Tixora.");
    }
    return new LoginRes(jwt.generate(u), u);
  }

  /** Connexion (ou premiere inscription) d'un client avec son compte Google. */
  @PostMapping("/google")
  LoginRes google(@Valid @RequestBody GoogleReq r) {
    GoogleTokenVerifier.Profile p = google.verify(r.credential());
    User u = users.findByEmail(p.email()).orElse(null);
    if (u == null) {
      u = new User();
      u.email = p.email();
      u.firstName = p.givenName() != null && !p.givenName().isBlank() ? p.givenName() : p.email().substring(0, p.email().indexOf('@'));
      u.lastName = p.familyName() == null ? "" : p.familyName();
      u.passwordHash = encoder.encode(UUID.randomUUID() + "." + UUID.randomUUID()); // aucun mot de passe utilisable : connexion via Google
      u.role = "CLIENT";
      u = users.save(u);
    } else if (!"CLIENT".equals(u.role)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "La connexion Google est reservee aux comptes clients");
    }
    if (Const.BLOCKED.equals(u.status)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Ce compte a ete bloque. Contactez le support Tixora.");
    }
    return new LoginRes(jwt.generate(u), u);
  }

  @GetMapping("/me")
  User me(Authentication auth) {
    return users.findById(UUID.fromString(auth.getName()))
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session invalide"));
  }
}
