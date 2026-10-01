package com.tixora.security;

import com.tixora.repository.UserRepository;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, UserRepository users) throws Exception {
    http.csrf(c -> c.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .authorizeHttpRequests(a -> a
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/api/auth/register", "/api/auth/login", "/actuator/health").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            // Routes d'evenements reservees : a declarer AVANT la lecture publique /api/events/*
            .requestMatchers(HttpMethod.GET, "/api/events/mine").hasRole("ORGANISATEUR")
            .requestMatchers(HttpMethod.GET, "/api/events/favorites").authenticated()
            .requestMatchers(HttpMethod.GET, "/api/events", "/api/events/*", "/api/events/*/image").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/stats", "/api/share/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/events").hasRole("ORGANISATEUR")
            .requestMatchers(HttpMethod.PUT, "/api/events/*").hasRole("ORGANISATEUR")
            .requestMatchers(HttpMethod.POST, "/api/events/*/image").hasAnyRole("ORGANISATEUR", "ADMIN")
            .requestMatchers(HttpMethod.POST, "/api/events/*/like").authenticated()
            .requestMatchers(HttpMethod.DELETE, "/api/events/*/like").authenticated()
            .requestMatchers("/api/controllers").hasRole("ORGANISATEUR")
            .requestMatchers(HttpMethod.GET, "/api/config", "/api/organizers/*/logo").permitAll()
            .requestMatchers("/api/payments/ctpay/callback").permitAll()
            .requestMatchers("/api/auth/google").permitAll()
            .requestMatchers("/api/organizer/**").hasRole("ORGANISATEUR")
            .requestMatchers("/api/places/**").hasAnyRole("ORGANISATEUR", "ADMIN")
            .requestMatchers("/api/payments/operators", "/api/orders", "/api/orders/*", "/api/tickets/mine").hasRole("CLIENT")
            .requestMatchers("/api/tickets/scan").hasAnyRole("CONTROLEUR", "ORGANISATEUR")
            .anyRequest().authenticated())
        .addFilterBefore(new JwtFilter(jwt, users), UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(@Value("${app.cors-origins}") String origins) {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept-Language"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cfg);
    return source;
  }
}
