package com.tixora.web;

import com.tixora.service.PlacesService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
public class PlacesController {
  private final PlacesService places;

  public PlacesController(PlacesService places) {
    this.places = places;
  }

  @GetMapping("/search")
  List<PlacesService.Place> search(Authentication auth, @RequestParam String q) {
    return places.search(q, UUID.fromString(auth.getName()));
  }
}
