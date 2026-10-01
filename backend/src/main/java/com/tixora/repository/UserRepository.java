package com.tixora.repository;

import com.tixora.model.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);
  boolean existsByEmail(String email);
  List<User> findByRoleAndOrganizerId(String role, UUID organizerId);
  long countByRole(String role);
  long countByStatus(String status);

  @Query("select u from User u where (:role = '' or u.role = :role) and (:q = '' or lower(u.email) like concat('%', :q, '%')"
      + " or lower(coalesce(u.firstName, '')) like concat('%', :q, '%') or lower(coalesce(u.lastName, '')) like concat('%', :q, '%')"
      + " or lower(coalesce(u.organization, '')) like concat('%', :q, '%'))")
  Page<User> search(@Param("role") String role, @Param("q") String q, Pageable pageable);

  @Modifying
  @Query("delete from User u where u.role = 'CONTROLEUR' and u.organizerId = :organizerId")
  void deleteControllersOf(@Param("organizerId") UUID organizerId);
}
