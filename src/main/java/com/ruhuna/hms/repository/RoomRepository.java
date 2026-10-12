package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * JPA repository for hostel room entities.
 */
public interface RoomRepository extends JpaRepository<Room, Long> {
}
