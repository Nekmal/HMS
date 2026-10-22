package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.RoomInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ============================================================================
 * Room Equipment Damage & Asset Dispatch Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'room_inventory' table using Spring Data JPA.
 * 
 * Maps damaged warehouse items to physical room locations and supports
 * maintenance technician repair status updates.
 * ============================================================================
 */
@Repository
public interface RoomInventoryRepository extends JpaRepository<RoomInventory, Long> {

    /**
     * Finds all equipment damage tickets filed for a specific room.
     *
     * @param roomId Primary key ID of the target room.
     * @return List of damaged asset records for the room.
     */
    List<RoomInventory> findByRoomId(Long roomId);

    /**
     * Finds all room inventory damage tickets filtered by repair lifecycle status.
     *
     * @param status Status string: 'BROKEN', 'IN_REPAIR', or 'REPAIRED'.
     * @return List of matching RoomInventory records.
     */
    List<RoomInventory> findByStatus(String status);
}

