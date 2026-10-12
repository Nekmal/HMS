package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Inventory;
import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.entity.RoomInventory;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.InventoryRepository;
import com.ruhuna.hms.repository.RoomInventoryRepository;
import com.ruhuna.hms.repository.RoomRepository;
import com.ruhuna.hms.service.RoomInventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Service implementation for managing room inventory damage tracking and synchronization
 * with master inventory stock counters.
 */
@Service
public class RoomInventoryServiceImpl implements RoomInventoryService {

    private final RoomInventoryRepository roomInventoryRepository;
    private final RoomRepository roomRepository;
    private final InventoryRepository inventoryRepository;

    @Autowired
    public RoomInventoryServiceImpl(RoomInventoryRepository roomInventoryRepository,
                                   RoomRepository roomRepository,
                                   InventoryRepository inventoryRepository) {
        this.roomInventoryRepository = roomInventoryRepository;
        this.roomRepository = roomRepository;
        this.inventoryRepository = inventoryRepository;
    }

    // Fetches all reported room damages
    @Override
    public List<RoomInventory> getAllRoomDamages() {
        return roomInventoryRepository.findAll();
    }

    // Fetches damaged items reported for a specific room
    @Override
    public List<RoomInventory> getDamagesByRoomId(Long roomId) {
        return roomInventoryRepository.findByRoomId(roomId);
    }

    // Reports damaged equipment in a room and decrements master available stock
    @Override
    public RoomInventory reportDamage(Long roomId, Long inventoryId, int quantity, String description) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + inventoryId));

        int qty = Math.max(1, quantity);

        RoomInventory damage = new RoomInventory(
                room,
                inventory,
                qty,
                description,
                "BROKEN",
                LocalDate.now()
        );

        // Update master inventory counts: increase broken, decrease available
        inventory.setBrokenQuantity(inventory.getBrokenQuantity() + qty);
        inventory.setAvailableQuantity(Math.max(0, inventory.getAvailableQuantity() - qty));
        inventoryRepository.save(inventory);

        return roomInventoryRepository.save(damage);
    }

    // Updates repair status and restores stock counts when marked as REPAIRED
    @Override
    public RoomInventory updateStatus(Long id, String status) {
        RoomInventory damage = roomInventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Damage record not found with id: " + id));

        // When marked as REPAIRED from BROKEN / IN_REPAIR, restore inventory counts
        if (!"REPAIRED".equalsIgnoreCase(damage.getStatus()) && "REPAIRED".equalsIgnoreCase(status)) {
            Inventory inventory = damage.getInventory();
            if (inventory != null) {
                inventory.setBrokenQuantity(Math.max(0, inventory.getBrokenQuantity() - damage.getBrokenQuantity()));
                inventory.setAvailableQuantity(inventory.getAvailableQuantity() + damage.getBrokenQuantity());
                inventoryRepository.save(inventory);
            }
        }

        damage.setStatus(status.toUpperCase());
        return roomInventoryRepository.save(damage);
    }

    // Deletes damage record and restores master stock if item was still pending repair
    @Override
    public void deleteDamage(Long id) {
        RoomInventory damage = roomInventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Damage record not found with id: " + id));

        // If still broken, restore master inventory before deleting
        if (!"REPAIRED".equalsIgnoreCase(damage.getStatus())) {
            Inventory inventory = damage.getInventory();
            if (inventory != null) {
                inventory.setBrokenQuantity(Math.max(0, inventory.getBrokenQuantity() - damage.getBrokenQuantity()));
                inventory.setAvailableQuantity(inventory.getAvailableQuantity() + damage.getBrokenQuantity());
                inventoryRepository.save(inventory);
            }
        }

        roomInventoryRepository.delete(damage);
    }
}
