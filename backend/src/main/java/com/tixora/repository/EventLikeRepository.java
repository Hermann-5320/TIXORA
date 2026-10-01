package com.tixora.repository;

import com.tixora.model.EventLike;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventLikeRepository extends JpaRepository<EventLike, UUID> {
  boolean existsByUserIdAndEventId(UUID userId, UUID eventId);

  long countByEventId(UUID eventId);

  /** Ajout idempotent : un double clic simultane ne provoque ni erreur ni transaction annulee. */
  @Modifying
  @Query(value = "insert into event_like (id, user_id, event_id, created_at) values (gen_random_uuid(), :userId, :eventId, now()) on conflict do nothing", nativeQuery = true)
  int addIfAbsent(@Param("userId") UUID userId, @Param("eventId") UUID eventId);

  @Modifying
  @Query("delete from EventLike l where l.userId = :userId and l.eventId = :eventId")
  int remove(@Param("userId") UUID userId, @Param("eventId") UUID eventId);

  @Modifying
  @Query("delete from EventLike l where l.eventId in :ids")
  void deleteByEventIds(@Param("ids") Collection<UUID> ids);

  @Modifying
  @Query("delete from EventLike l where l.userId = :userId")
  void deleteByUser(@Param("userId") UUID userId);

  /** Retourne des paires [eventId, nombre de j'aime]. */
  @Query("select l.eventId, count(l) from EventLike l where l.eventId in :ids group by l.eventId")
  List<Object[]> countByEventIds(@Param("ids") Collection<UUID> ids);

  @Query("select l.eventId from EventLike l where l.userId = :userId and l.eventId in :ids")
  List<UUID> likedAmong(@Param("userId") UUID userId, @Param("ids") Collection<UUID> ids);

  @Query("select l.eventId from EventLike l where l.userId = :userId order by l.createdAt desc")
  List<UUID> favoriteIds(@Param("userId") UUID userId);
}
