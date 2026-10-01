package com.tixora.repository;

import com.tixora.model.PurchaseOrder;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<PurchaseOrder, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<PurchaseOrder> findWithLockById(UUID id);

  Optional<PurchaseOrder> findByProcessCode(String processCode);

  Optional<PurchaseOrder> findByTransactionId(String transactionId);

  List<PurchaseOrder> findByStatusAndExpiresAtBefore(String status, Instant before);

  long countByStatus(String status);

  @Query("select o from PurchaseOrder o where (:status = '' or o.status = :status) order by o.createdAt desc")
  Page<PurchaseOrder> adminSearch(@Param("status") String status, Pageable pageable);
}
