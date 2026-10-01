package com.tixora.service;

import com.tixora.model.Const;
import com.tixora.model.Event;
import com.tixora.model.User;
import com.tixora.repository.EventImageRepository;
import com.tixora.repository.EventLikeRepository;
import com.tixora.repository.EventRepository;
import com.tixora.repository.TicketRepository;
import com.tixora.repository.UserRepository;
import com.tixora.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
  private final UserRepository users;
  private final EventRepository events;
  private final TicketRepository tickets;
  private final EventImageRepository images;
  private final EventLikeRepository likes;

  public AdminService(UserRepository users, EventRepository events, TicketRepository tickets,
                      EventImageRepository images, EventLikeRepository likes) {
    this.users = users;
    this.events = events;
    this.tickets = tickets;
    this.images = images;
    this.likes = likes;
  }

  @Transactional
  public User setBlocked(UUID actorId, UUID userId, boolean blocked) {
    User u = target(actorId, userId);
    u.status = blocked ? Const.BLOCKED : Const.ACTIVE;
    return users.save(u);
  }

  /**
   * Suppression definitive. Refusee quand le compte a une activite financiere (billets achetes ou vendus) :
   * il faut alors le bloquer, pour ne pas orpheliner des billets valides.
   */
  @Transactional
  public void delete(UUID actorId, UUID userId) {
    User u = target(actorId, userId);
    if ("CLIENT".equals(u.role) && tickets.existsByOwnerId(u.id)) {
      throw new ApiException(HttpStatus.CONFLICT, "Ce client possede des billets : bloquez-le plutot que de le supprimer");
    }
    if ("ORGANISATEUR".equals(u.role)) {
      List<Event> mine = events.findByOrganizerId(u.id);
      if (!mine.isEmpty()) {
        List<UUID> ids = mine.stream().map(e -> e.id).toList();
        if (tickets.countByEventIds(ids) > 0) {
          throw new ApiException(HttpStatus.CONFLICT, "Cet organisateur a vendu des billets : bloquez-le plutot que de le supprimer");
        }
        likes.deleteByEventIds(ids);
        images.deleteByEventIds(ids);
        events.deleteAll(mine);
      }
      users.deleteControllersOf(u.id);
    }
    likes.deleteByUser(u.id);
    users.delete(u);
  }

  private User target(UUID actorId, UUID userId) {
    User u = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    if (u.id.equals(actorId)) throw new ApiException(HttpStatus.BAD_REQUEST, "Vous ne pouvez pas agir sur votre propre compte");
    if ("ADMIN".equals(u.role)) throw new ApiException(HttpStatus.FORBIDDEN, "Les comptes administrateur sont proteges");
    return u;
  }
}
