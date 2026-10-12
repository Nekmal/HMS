package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.RoomInventory;
import java.util.List;

/**
 * Service interface for managing room equipment damages and repairs.
 */
public interface RoomInventoryService {
    // Retrieve all reported room item damages
    List<RoomInventory> getAllRoomDamages();

    // Retrieve damaged item reports for a specific room
    List<RoomInventory> getDamagesByRoomId(Long roomId);

    // Report damaged item in a room and adjust stock quantities
    RoomInventory reportDamage(Long roomId, Long inventoryId, int quantity, String description);

    // Update repair status (e.g. IN_PROGRESS, REPAIRED) and restore stock if repaired
    RoomInventory updateStatus(Long id, String status);

    // Delete a room damage record
    void deleteDamage(Long id);
}
