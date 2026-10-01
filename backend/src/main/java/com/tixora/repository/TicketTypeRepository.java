package com.tixora.repository;

import com.tixora.model.TicketType;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface TicketTypeRepository extends JpaRepository<TicketType, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<TicketType> findWithLockById(UUID id);
}
