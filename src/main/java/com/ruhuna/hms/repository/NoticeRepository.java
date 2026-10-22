package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ============================================================================
 * Notice Board Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'notices' table using Spring Data JPA.
 * 
 * Provides automated chronological sorting of administrative bulletin notices.
 * ============================================================================
 */
@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    /**
     * Retrieves all published hostel notices sorted in descending order by publication date.
     * Ensures students and staff see the latest announcements first.
     *
     * @return List of Notice entities ordered by datePosted DESC.
     */
    List<Notice> findAllByOrderByDatePostedDesc();
}

