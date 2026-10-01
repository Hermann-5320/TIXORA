package com.tixora.repository;

import com.tixora.model.EventImage;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventImageRepository extends JpaRepository<EventImage, UUID> {
  @Modifying
  @Query("delete from EventImage i where i.eventId in :ids")
  void deleteByEventIds(@Param("ids") Collection<UUID> ids);
}
