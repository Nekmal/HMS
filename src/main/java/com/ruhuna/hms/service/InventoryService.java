package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Inventory;
import java.util.List;

/**
 * Service Interface defining the contract for managing central hostel inventory assets.
 * <p>
 * Regulates physical equipment records (beds, study chairs, wardrobes, electrical fittings)
 * across the university halls of residence. Handles cataloging, quantity tracking,
 * and stock allocations.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface InventoryService {

    /**
     * Retrieves all inventory items and asset entries stored in the university warehouse registry.
     *
     * @return List of all {@link Inventory} items with their respective balance counts.
     */
    List<Inventory> getAllInventory();

    /**
     * Retrieves an inventory asset item by its unique database identifier.
     *
     * @param id The primary key ID of the inventory item.
     * @return The corresponding {@link Inventory} entity.
     */
    Inventory getInventoryById(Long id);

    /**
     * Registers and persists a new equipment item in the master inventory database.
     *
     * @param inventory The {@link Inventory} entity containing category, name, total quantity, and status.
     * @return The persisted {@link Inventory} entity with generated ID.
     */
    Inventory createInventory(Inventory inventory);
}
