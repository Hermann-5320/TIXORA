package com.tixora.security;

import com.tixora.model.Const;
import com.tixora.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtFilter extends OncePerRequestFilter {
  private final JwtService jwt;
  private final UserRepository users;

  public JwtFilter(JwtService jwt, UserRepository users) {
    this.jwt = jwt;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String header = req.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        Claims claims = jwt.parse(header.substring(7));
        // Le compte est relu en base : un compte bloque ou supprime perd l'acces immediatement,
        // et le role vient de la base (pas du jeton) pour que les changements soient instantanes.
        users.findById(UUID.fromString(claims.getSubject()))
            .filter(u -> !Const.BLOCKED.equals(u.status))
            .ifPresent(u -> SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(u.id.toString(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + u.role)))));
      } catch (JwtException | IllegalArgumentException e) {
        // Jeton invalide ou expire : la requete reste anonyme.
      }
    }
    chain.doFilter(req, res);
  }
}
