package com.tixora.repository;

import com.tixora.model.OrganizerLogo;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizerLogoRepository extends JpaRepository<OrganizerLogo, UUID> {}
