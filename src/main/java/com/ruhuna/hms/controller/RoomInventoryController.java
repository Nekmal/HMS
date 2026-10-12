package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.RoomInventory;
import com.ruhuna.hms.service.RoomInventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for room-specific inventory and equipment damage tracking.
 * Connects rooms with broken inventory items and handles maintenance repair status updates.
 */
@RestController
@RequestMapping("/api/room-inventory")
public class RoomInventoryController {

    private final RoomInventoryService roomInventoryService;

    @Autowired
    public RoomInventoryController(RoomInventoryService roomInventoryService) {
        this.roomInventoryService = roomInventoryService;
    }

    // Retrieve all reported room equipment damages across hostel blocks
    @GetMapping
    public List<RoomInventory> getAllRoomDamages() {
        return roomInventoryService.getAllRoomDamages();
    }

    // Retrieve reported damages and equipment issues for a specific room
    @GetMapping("/room/{roomId}")
    public List<RoomInventory> getDamagesByRoomId(@PathVariable Long roomId) {
        return roomInventoryService.getDamagesByRoomId(roomId);
    }

    // Report damaged or broken item in a specific room and update inventory stock
    @PostMapping
    public ResponseEntity<RoomInventory> reportDamage(@RequestBody Map<String, Object> payload) {
        Long roomId = Long.valueOf(payload.get("roomId").toString());
        Long inventoryId = Long.valueOf(payload.get("inventoryId").toString());
        int quantity = payload.containsKey("quantity") ? Integer.parseInt(payload.get("quantity").toString()) : 1;
        String description = payload.containsKey("description") ? payload.get("description").toString() : "Reported broken";

        RoomInventory damage = roomInventoryService.reportDamage(roomId, inventoryId, quantity, description);
        return ResponseEntity.ok(damage);
    }

    // Update maintenance progress status (e.g. IN_PROGRESS, REPAIRED)
    @PutMapping("/{id}/status")
    public ResponseEntity<RoomInventory> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.getOrDefault("status", "REPAIRED");
        RoomInventory updated = roomInventoryService.updateStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    // Complete repair for a damaged room item and restore stock
    @PutMapping("/{id}/repair")
    public ResponseEntity<RoomInventory> markRepaired(@PathVariable Long id) {
        RoomInventory updated = roomInventoryService.updateStatus(id, "REPAIRED");
        return ResponseEntity.ok(updated);
    }

    // Delete a room damage record
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDamage(@PathVariable Long id) {
        roomInventoryService.deleteDamage(id);
        return ResponseEntity.ok().build();
    }
}
