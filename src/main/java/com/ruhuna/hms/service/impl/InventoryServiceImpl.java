package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Inventory;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.InventoryRepository;
import com.ruhuna.hms.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service implementation for managing inventory data operations and database persistence.
 */
@Service
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;

    @Autowired
    public InventoryServiceImpl(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    // Fetches all inventory items and stock levels
    @Override
    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    // Fetches an inventory item by ID
    @Override
    public Inventory getInventoryById(Long id) {
        return inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));
    }

    // Saves an inventory item record
    @Override
    public Inventory createInventory(Inventory inventory) {
        return inventoryRepository.save(inventory);
    }
}
