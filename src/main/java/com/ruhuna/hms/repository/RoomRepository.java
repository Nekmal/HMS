package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * ============================================================================
 * Room Physical Infrastructure Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'rooms' table using Spring Data JPA.
 * 
 * Provides persistence and lookup operations for room entities across
 * Blocks A, B, C, and D, enabling bed capacity and occupancy tracking.
 * ============================================================================
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
}

