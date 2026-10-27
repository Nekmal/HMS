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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * ============================================================================
 * Room Equipment Damage & Warehouse Stock Synchronization Service Implementation
 * ============================================================================
 * Coordinates room-level asset health and automatically maintains mathematical
 * consistency with the master warehouse stock ledger:
 * 1. Damage Reporting: Increments broken count and decrements available warehouse stock.
 * 2. Repair Completion: When marked 'REPAIRED', restores warehouse functional inventory.
 * 3. Deletion Rollback: Reverses temporary broken holds if an inspection ticket is discarded.
 * 
 * ACID Compliance:
 * - Annotated with {@link Transactional} ensuring atomic multi-table updates across
 *   'room_inventory' and 'inventory' tables.
 * ============================================================================
 */
@Service
@Transactional
public class RoomInventoryServiceImpl implements RoomInventoryService {

    private final RoomInventoryRepository roomInventoryRepository;
    private final RoomRepository roomRepository;
    private final InventoryRepository inventoryRepository;

    /**
     * Dependency injection of repositories.
     *
     * @param roomInventoryRepository Pure SQL repository for room inventory damages.
     * @param roomRepository Pure SQL repository for rooms.
     * @param inventoryRepository Pure SQL repository for master warehouse items.
     */
    @Autowired
    public RoomInventoryServiceImpl(RoomInventoryRepository roomInventoryRepository,
                                   RoomRepository roomRepository,
                                   InventoryRepository inventoryRepository) {
        this.roomInventoryRepository = roomInventoryRepository;
        this.roomRepository = roomRepository;
        this.inventoryRepository = inventoryRepository;
    }

    /**
     * Retrieves all reported room damage records across all hostel blocks.
     *
     * @return List of all RoomInventory records.
     */
    @Override
    public List<RoomInventory> getAllRoomDamages() {
        return roomInventoryRepository.findAll();
    }

    /**
     * Retrieves damaged items reported for a specific room.
     *
     * @param roomId Primary key ID of the target room.
     * @return List of equipment damage records belonging to the given room.
     */
    @Override
    public List<RoomInventory> getDamagesByRoomId(Long roomId) {
        return roomInventoryRepository.findByRoomId(roomId);
    }


    /**
     * Reports damaged or missing furniture/equipment inside a specific hostel room.
     * <p>
     * Transactional flow:
     * 1. Resolves Room and Inventory master entities; throws 404 if either is missing.
     * 2. Sanitizes broken item quantity (minimum 1).
     * 3. Creates a new {@link RoomInventory} log with initial status 'BROKEN' and today's date.
     * 4. Updates master warehouse balances: increments `brokenQuantity` and decrements `availableQuantity`.
     * 5. Saves both entities to synchronize inventory levels.
     * </p>
     *
     * @param roomId Primary key ID of the hostel room.
     * @param inventoryId Primary key ID of the master inventory item.
     * @param quantity Number of damaged units.
     * @param description Failure description (e.g. "Broken chair leg", "Study table drawer cracked").
     * @return The persisted {@link RoomInventory} damage report.
     * @throws ResourceNotFoundException if room or inventory item does not exist.
     */
    @Override
    public RoomInventory reportDamage(Long roomId, Long inventoryId, int quantity, String description) {
        // Step 1: Look up parent room entity
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        // Step 2: Look up master inventory item
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + inventoryId));

        // Ensure minimum quantity is at least 1 unit
        int qty = Math.max(1, quantity);

        // Instantiate damage record
        RoomInventory damage = new RoomInventory(
                room,
                inventory,
                qty,
                description,
                "BROKEN",
                LocalDate.now()
        );

        // Step 3: Synchronize master inventory counts (transfer from available to broken)
        inventory.setBrokenQuantity(inventory.getBrokenQuantity() + qty);
        inventory.setAvailableQuantity(Math.max(0, inventory.getAvailableQuantity() - qty));
        inventoryRepository.save(inventory);

        // Step 4: Persist and return damage entry
        return roomInventoryRepository.save(damage);
    }

    /**
     * Updates the repair workflow status of a room damage incident.
     * <p>
     * Automated stock reconciliation:
     * When transitioning from an unrepaired status ('BROKEN' or 'IN_REPAIR') to 'REPAIRED',
     * the system automatically reverses the master inventory figures (decrements `brokenQuantity`
     * and increments `availableQuantity`), restoring asset readiness.
     * </p>
     *
     * @param id The primary key ID of the damage record.
     * @param status New lifecycle status (e.g. "IN_REPAIR", "REPAIRED").
     * @return The updated {@link RoomInventory} entity.
     * @throws ResourceNotFoundException if the damage record is not found.
     */
    @Override
    public RoomInventory updateStatus(Long id, String status) {
        // Fetch existing damage incident
        RoomInventory damage = roomInventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Damage record not found with id: " + id));

        // Check if item is transitioning to REPAIRED from an active damage state
        if (!"REPAIRED".equalsIgnoreCase(damage.getStatus()) && "REPAIRED".equalsIgnoreCase(status)) {
            Inventory inventory = damage.getInventory();
            if (inventory != null) {
                // Restore master item stock levels: decrease broken, return to available pool
                inventory.setBrokenQuantity(Math.max(0, inventory.getBrokenQuantity() - damage.getBrokenQuantity()));
                inventory.setAvailableQuantity(inventory.getAvailableQuantity() + damage.getBrokenQuantity());
                inventoryRepository.save(inventory);
            }
        }

        // Apply new status and persist
        damage.setStatus(status.toUpperCase());
        return roomInventoryRepository.save(damage);
    }

    /**
     * Deletes a room damage record from the database.
     * <p>
     * Stock restoration guarantee:
     * If the damage record is deleted before being repaired (e.g., entered by mistake),
     * the master inventory's broken count is decremented and available count is restored,
     * preventing permanent asset leakage.
     * </p>
     *
     * @param id The primary key ID of the damage record to purge.
     * @throws ResourceNotFoundException if the damage record does not exist.
     */
    @Override
    public void deleteDamage(Long id) {
        RoomInventory damage = roomInventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Damage record not found with id: " + id));

        // If the damage record was never repaired, reverse master stock allocations
        if (!"REPAIRED".equalsIgnoreCase(damage.getStatus())) {
            Inventory inventory = damage.getInventory();
            if (inventory != null) {
                inventory.setBrokenQuantity(Math.max(0, inventory.getBrokenQuantity() - damage.getBrokenQuantity()));
                inventory.setAvailableQuantity(inventory.getAvailableQuantity() + damage.getBrokenQuantity());
                inventoryRepository.save(inventory);
            }
        }

        // Permanently remove damage record
        roomInventoryRepository.delete(damage);
    }
}
