package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.GatePass;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * JPA repository for student gate pass entities.
 */
public interface GatePassRepository extends JpaRepository<GatePass, Long> {
    // Find all gate passes filed by a specific user
    List<GatePass> findByUserId(Long userId);
}
