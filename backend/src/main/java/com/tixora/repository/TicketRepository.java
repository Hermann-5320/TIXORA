package com.tixora.repository;

import com.tixora.model.Ticket;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
  List<Ticket> findByOwnerIdOrderByStartsAtDesc(UUID ownerId);
  Optional<Ticket> findByCode(String code);
  boolean existsByOwnerId(UUID ownerId);

  @Query("select count(t) from Ticket t where t.eventId in :ids")
  long countByEventIds(@Param("ids") Collection<UUID> ids);

  /** Lignes [eventId, type de billet, nombre vendu, montant] : seuls les billets payes existent. */
  @Query("select t.eventId, t.categoryName, count(t), coalesce(sum(t.price), 0) from Ticket t where t.eventId in :ids group by t.eventId, t.categoryName")
  List<Object[]> statsByEvent(@Param("ids") Collection<UUID> ids);

  /** Lignes [organizerId, billets vendus, montant] pour les reversements. */
  @Query("select e.organizerId, count(t), coalesce(sum(t.price), 0) from Ticket t, Event e where t.eventId = e.id group by e.organizerId")
  List<Object[]> salesByOrganizer();

  @Query("select coalesce(sum(t.price), 0) from Ticket t")
  long revenue();

  @Modifying
  @Query("update Ticket t set t.status = 'USED' where t.code = :code and t.status = 'VALID'")
  int markUsed(@Param("code") String code);
}
