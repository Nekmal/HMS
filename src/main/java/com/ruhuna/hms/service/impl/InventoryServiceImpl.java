package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Inventory;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.InventoryRepository;
import com.ruhuna.hms.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service Implementation for managing Hostel Inventory assets and warehouse stock.
 * <p>
 * Implements {@link InventoryService} to handle university logistics, furniture, electrical fittings,
 * and physical equipment accounting (beds, study tables, chairs, mattresses, ceiling fans, locks).
 * Manages total stock, items in active use, available reserves, and broken equipment awaiting repair.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
@Service
public class InventoryServiceImpl implements InventoryService {

    /**
     * Spring Data JPA repository for inventory data access operations.
     */
    private final InventoryRepository inventoryRepository;

    /**
     * Constructs a new {@code InventoryServiceImpl} with required repository dependency.
     *
     * @param inventoryRepository The JPA repository for {@link Inventory} items.
     */
    @Autowired
    public InventoryServiceImpl(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    /**
     * Retrieves all inventory items and equipment listings stored in the university database.
     *
     * @return List of all {@link Inventory} records with their current stock levels.
     */
    @Override
    public List<Inventory> getAllInventory() {
        // Query Spring Data JPA repository to fetch all warehouse inventory records
        return inventoryRepository.findAll();
    }

    /**
     * Retrieves a single inventory item by its unique database identifier.
     *
     * @param id The primary key ID of the inventory item.
     * @return The requested {@link Inventory} entity.
     * @throws ResourceNotFoundException if no item exists with the provided ID.
     */
    @Override
    public Inventory getInventoryById(Long id) {
        // Find inventory item or throw HTTP 404 ResourceNotFoundException
        return inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));
    }

    /**
     * Adds and persists a new inventory item / equipment category to the central asset registry.
     *
     * @param inventory The {@link Inventory} entity containing item name, category, and quantity metrics.
     * @return The saved {@link Inventory} entity with its generated database primary key.
     */
    @Override
    public Inventory createInventory(Inventory inventory) {
        // Persist new inventory record to the database
        return inventoryRepository.save(inventory);
    }
}
