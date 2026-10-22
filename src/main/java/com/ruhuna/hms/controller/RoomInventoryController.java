package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.RoomInventory;
import com.ruhuna.hms.service.RoomInventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * Room-Specific Equipment Damages & Asset Maintenance REST Controller
 * ============================================================================
 * Base Endpoint: /api/room-inventory
 * 
 * Responsibilities:
 * 1. Tracks physical assets assigned to individual hostel rooms (Study chairs, desks,
 *    ceiling fans, bed frames, window latches).
 * 2. Connects broken item reports to warehouse inventory items.
 * 3. Supports maintenance technician repair workflows: transitions status from
 *    'BROKEN' / 'IN_PROGRESS' to 'REPAIRED'.
 * 4. Integrates with analytical view 'vw_RoomDamagesTracker' for facility health audits.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/room-inventory")
public class RoomInventoryController {

    private final RoomInventoryService roomInventoryService;

    /**
     * Dependency injection of RoomInventoryService.
     *
     * @param roomInventoryService Business service handling room asset damages and stock adjustments.
     */
    @Autowired
    public RoomInventoryController(RoomInventoryService roomInventoryService) {
        this.roomInventoryService = roomInventoryService;
    }

    /**
     * GET /api/room-inventory
     * Retrieves all reported room equipment damage records across all hostel rooms.
     * Used by Maintenance command portal and Sub Warden facility overview.
     *
     * @return List of all RoomInventory damage records.
     */
    @GetMapping
    public List<RoomInventory> getAllRoomDamages() {
        return roomInventoryService.getAllRoomDamages();
    }

    /**
     * GET /api/room-inventory/room/{roomId}
     * Retrieves all equipment damage tickets reported for a specific room.
     * Used by Student Portal under "Room & Maintenance" to see room asset health.
     *
     * @param roomId Primary key ID of the target room.
     * @return List of equipment damage records belonging to the given room.
     */
    @GetMapping("/room/{roomId}")
    public List<RoomInventory> getDamagesByRoomId(@PathVariable Long roomId) {
        return roomInventoryService.getDamagesByRoomId(roomId);
    }

    /**
     * POST /api/room-inventory
     * Reports a damaged or broken item inside a specific room and decrements warehouse stock.
     *
     * @param payload Map containing:
     *                - 'roomId': Target room ID
     *                - 'inventoryId': Warehouse item catalog ID
     *                - 'quantity': Number of broken items (default: 1)
     *                - 'description': Defect notes (e.g. "Fan motor burned out")
     * @return ResponseEntity with the persisted RoomInventory damage entity.
     */
    @PostMapping
    public ResponseEntity<RoomInventory> reportDamage(@RequestBody Map<String, Object> payload) {
        Long roomId = Long.valueOf(payload.get("roomId").toString());
        Long inventoryId = Long.valueOf(payload.get("inventoryId").toString());
        int quantity = payload.containsKey("quantity") ? Integer.parseInt(payload.get("quantity").toString()) : 1;
        String description = payload.containsKey("description") ? payload.get("description").toString() : "Reported broken";

        RoomInventory damage = roomInventoryService.reportDamage(roomId, inventoryId, quantity, description);
        return ResponseEntity.ok(damage);
    }

    /**
     * PUT /api/room-inventory/{id}/status
     * Updates maintenance repair status (e.g. IN_PROGRESS, REPAIRED, CANCELLED).
     *
     * @param id Primary key ID of the damage record.
     * @param payload Map containing new 'status' value.
     * @return ResponseEntity with the updated RoomInventory record.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<RoomInventory> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.getOrDefault("status", "REPAIRED");
        RoomInventory updated = roomInventoryService.updateStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    /**
     * PUT /api/room-inventory/{id}/repair
     * Single-click repair endpoint for maintenance staff.
     * Restores damaged room equipment and transitions status to 'REPAIRED'.
     *
     * @param id Primary key ID of the damage record to mark repaired.
     * @return ResponseEntity with the repaired RoomInventory record.
     */
    @PutMapping("/{id}/repair")
    public ResponseEntity<RoomInventory> markRepaired(@PathVariable Long id) {
        RoomInventory updated = roomInventoryService.updateStatus(id, "REPAIRED");
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/room-inventory/{id}
     * Removes an equipment damage record upon resolution or inspection completion.
     *
     * @param id Primary key ID of the record to delete.
     * @return Empty HTTP 200 OK response.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDamage(@PathVariable Long id) {
        roomInventoryService.deleteDamage(id);
        return ResponseEntity.ok().build();
    }
}

