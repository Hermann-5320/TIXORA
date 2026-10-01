package com.tixora.repository;

import com.tixora.model.Event;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, UUID> {
  /** Evenement visible du public : valide par l'admin et organisateur non bloque. */
  String VISIBLE = "e.status = 'APPROVED' and e.organizerId not in (select u.id from User u where u.status = 'BLOCKED')";
  /** Evenement pas encore termine (sans heure de fin, il dure 6 h : voir EventRules). */
  String NOT_ENDED = "((e.endsAt is not null and e.endsAt >= :now) or (e.endsAt is null and e.startsAt >= :nowMinusDefault))";

  @Query("select e from Event e where " + VISIBLE + " and " + NOT_ENDED
      + " and (:category = '' or e.category = :category)"
      + " and (:city = '' or lower(e.city) = :city)"
      + " and (:q = '' or lower(e.title) like concat('%', :q, '%') or lower(e.venue) like concat('%', :q, '%')"
      + " or lower(coalesce(e.city, '')) like concat('%', :q, '%'))")
  Page<Event> search(@Param("q") String q, @Param("category") String category, @Param("city") String city,
                     @Param("now") LocalDateTime now, @Param("nowMinusDefault") LocalDateTime nowMinusDefault,
                     Pageable pageable);

  @Query("select e from Event e where " + VISIBLE + " and " + NOT_ENDED
      + " and e.latitude between :minLat and :maxLat and e.longitude between :minLng and :maxLng")
  List<Event> withinBox(@Param("minLat") double minLat, @Param("maxLat") double maxLat,
                        @Param("minLng") double minLng, @Param("maxLng") double maxLng,
                        @Param("now") LocalDateTime now, @Param("nowMinusDefault") LocalDateTime nowMinusDefault);

  @Query("select e from Event e where e.id in :ids and " + VISIBLE)
  List<Event> visibleByIds(@Param("ids") Collection<UUID> ids);

  List<Event> findByOrganizerIdOrderByStartsAtDesc(UUID organizerId);

  List<Event> findByOrganizerId(UUID organizerId);

  @Query("select e from Event e where (:status = '' or e.status = :status)"
      + " and (:q = '' or lower(e.title) like concat('%', :q, '%') or lower(e.venue) like concat('%', :q, '%'))")
  Page<Event> adminSearch(@Param("status") String status, @Param("q") String q, Pageable pageable);

  long countByStatus(String status);

  @Query("select count(e) from Event e where " + VISIBLE)
  long countVisible();

  @Query("select count(distinct lower(e.city)) from Event e where " + VISIBLE + " and e.city is not null and e.city <> ''")
  long countVisibleCities();
}
