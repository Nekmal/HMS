package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.RoomInventory;
import java.util.List;

/**
 * Service Interface defining the contract for room asset damage management and repair tracking.
 * <p>
 * Connects hostel rooms to the central equipment inventory. When equipment (e.g., bed frame,
 * ceiling fan, study chair) is broken or vandalized inside a student room, this service coordinates
 * damage incident logging, automatic master stock adjustments, repair dispatch, and post-repair stock recovery.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface RoomInventoryService {

    /**
     * Retrieves all recorded room equipment damage incidents across the entire hostel facility.
     *
     * @return List of all {@link RoomInventory} records.
     */
    List<RoomInventory> getAllRoomDamages();

    /**
     * Retrieves all reported equipment damages for a specific hostel room.
     *
     * @param roomId The primary key ID of the hostel room.
     * @return List of matching {@link RoomInventory} incident reports.
     */
    List<RoomInventory> getDamagesByRoomId(Long roomId);

    /**
     * Logs a newly discovered damaged item in a room and decrements master available stock.
     *
     * @param roomId Primary key ID of the damaged room.
     * @param inventoryId Primary key ID of the affected master equipment item.
     * @param quantity Number of damaged pieces.
     * @param description Narrative of the damage (e.g. "Broken chair armrest").
     * @return The persisted {@link RoomInventory} damage report.
     */
    RoomInventory reportDamage(Long roomId, Long inventoryId, int quantity, String description);

    /**
     * Updates the maintenance/repair lifecycle status of a damage incident.
     * <p>
     * When marked as 'REPAIRED', automatically restores available warehouse inventory.
     * </p>
     *
     * @param id The primary key ID of the room damage record.
     * @param status New status code ("IN_REPAIR", "REPAIRED").
     * @return The updated {@link RoomInventory} entity.
     */
    RoomInventory updateStatus(Long id, String status);

    /**
     * Deletes a room damage record, safely restoring master stock allocations if unresolved.
     *
     * @param id The primary key ID of the record to remove.
     */
    void deleteDamage(Long id);
}
