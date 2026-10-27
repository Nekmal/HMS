package com.ruhuna.hms.entity;

/**
 * ============================================================================
 * Inventory Domain Model (Centralized Warehouse Asset Logistics)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: inventory
 * ============================================================================
 */
public class Inventory {

    private Long id;
    private String itemName;
    private int totalQuantity;
    private int availableQuantity;
    private int brokenQuantity;
    private String category;

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

