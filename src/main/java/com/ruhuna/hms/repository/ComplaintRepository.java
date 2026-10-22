package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ============================================================================
 * Complaint Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'complaints' table using Spring Data JPA.
 * 
 * Performance Index Optimization:
 * - Queries benefit from index 'idx_complaints_status_room' on (status, room_number).
 * ============================================================================
 */
@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    /**
     * Retrieves all maintenance complaints lodged by a specific resident student.
     *
     * @param userId The unique user ID of the resident.
     * @return List of matching Complaint entities.
     */
    List<Complaint> findByUserId(Long userId);
}

