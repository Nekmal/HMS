package com.ruhuna.hms.entity;

import jakarta.persistence.*;

/**
 * ============================================================================
 * Inventory Entity (Centralized Warehouse Asset Logistics)
 * ============================================================================
 * Database Table: inventory
 * 
 * Represents master catalog stock items stored in the hostel central storage warehouse
 * for outfitting rooms and repairing damaged facilities.
 * 
 * Categories:
 * - Furniture: Study Tables, Wooden Chairs, Bed Frames, Wardrobes.
 * - Electrical: Ceiling Fans, LED Tube Lights, Wall Sockets, Switches.
 * - Plumbing: Water Taps, Shower Heads, PVC Pipes, Float Valves.
 * - Sanitation: Brooms, Buckets, Mopping Units.
 * 
 * Integrity Enforcement:
 * - Enforced by database trigger 'trg_BeforeInventoryStockUpdate' preventing
 *   available + broken quantities from mathematically exceeding total quantity.
 * 
 * Performance Index:
 * - 'idx_inventory_category_avail' on (category, available_quantity)
 * ============================================================================
 */
@Entity
@Table(name = "inventory")
public class Inventory {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Common name of the asset (e.g. "Ceiling Fan", "Study Desk", "LED Tube Light").
     */
    private String itemName;

    /**
     * Total physical units owned and cataloged in the hostel complex.
     */
    private int totalQuantity;

    /**
     * Units currently functional, unassigned, or active in warehouse stock.
     */
    private int availableQuantity;

    /**
     * Units currently decommissioned, defective, or undergoing repair.
     */
    private int brokenQuantity;

    /**
     * Equipment domain classification (e.g. "Furniture", "Electrical", "Plumbing", "Bedding").
     */
    private String category;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public Inventory() {}

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public int getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(int totalQuantity) { this.totalQuantity = totalQuantity; }

    public int getAvailableQuantity() { return availableQuantity; }
    public void setAvailableQuantity(int availableQuantity) { this.availableQuantity = availableQuantity; }

    public int getBrokenQuantity() { return brokenQuantity; }
    public void setBrokenQuantity(int brokenQuantity) { this.brokenQuantity = brokenQuantity; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}

