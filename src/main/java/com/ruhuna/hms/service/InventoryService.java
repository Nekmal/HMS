package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Inventory;
import java.util.List;

/**
 * Service interface for hostel inventory items and master stock quantities.
 */
public interface InventoryService {
    // Retrieve all inventory items in the system
    List<Inventory> getAllInventory();

    // Find an inventory item by its ID
    Inventory getInventoryById(Long id);

    // Create or save an inventory item record
    Inventory createInventory(Inventory inventory);
}
