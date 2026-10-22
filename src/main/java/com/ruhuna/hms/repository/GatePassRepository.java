package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.GatePass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ============================================================================
 * GatePass Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'gate_passes' table using Spring Data JPA.
 * 
 * Performance Index Optimization:
 * - Queries benefit from index 'idx_gate_passes_user_status' on (user_id, status).
 * ============================================================================
 */
@Repository
public interface GatePassRepository extends JpaRepository<GatePass, Long> {

    /**
     * Retrieves all campus leave and gate pass applications filed by a specific student.
     *
     * @param userId The unique user ID of the resident student.
     * @return List of matching GatePass records.
     */
    List<GatePass> findByUserId(Long userId);
}

