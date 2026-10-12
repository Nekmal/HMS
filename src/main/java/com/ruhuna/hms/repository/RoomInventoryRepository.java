package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.RoomInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * JPA repository for room inventory and damaged item entities.
 */
@Repository
public interface RoomInventoryRepository extends JpaRepository<RoomInventory, Long> {
    // Find all damages reported for a specific room
    List<RoomInventory> findByRoomId(Long roomId);

    // Find all damages by status (e.g. BROKEN, REPAIRED)
    List<RoomInventory> findByStatus(String status);
}
