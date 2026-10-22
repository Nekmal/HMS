package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Inventory;
import com.ruhuna.hms.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * Warehouse Inventory & Logistics Management REST Controller
 * ============================================================================
 * Base Endpoint: /api/inventory
 * 
 * Responsibilities:
 * 1. Tracks centralized warehouse stock for furniture, bedding, and electrical fixtures
 *    (e.g., Bed Frames, Mattresses, Study Tables, Ceiling Fans, LED Bulbs).
 * 2. Monitors available vs broken stock quantities per asset category.
 * 3. Enforces inventory integrity via database triggers ('trg_BeforeInventoryStockUpdate')
 *    preventing available quantity from exceeding mathematically valid balances.
 * 4. Supplies analytical dashboards with real-time inventory health data.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    /**
     * Dependency injection of InventoryService.
     *
     * @param inventoryService Business service managing stock balances, acquisitions, and alerts.
     */
    @Autowired
    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /**
     * GET /api/inventory
     * Retrieves all inventory items stored in the master hostel warehouse catalog.
     * Used by Sub Warden and Maintenance inventory stock dashboards.
     *
     * @return List of all Inventory entities with current total, available, and broken counts.
     */
    @GetMapping
    public List<Inventory> getAllInventory() {
        return inventoryService.getAllInventory();
    }

    /**
     * POST /api/inventory
     * Adds a new warehouse catalog item or updates existing stock balances.
     *
     * @param inventory JSON payload specifying itemName, category, totalQuantity, and availableQuantity.
     * @return The persisted Inventory entity.
     */
    @PostMapping
    public Inventory createInventory(@RequestBody Inventory inventory) {
        return inventoryService.createInventory(inventory);
    }
}

