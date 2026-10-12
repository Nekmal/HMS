package com.ruhuna.hms.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing master hostel inventory items and overall stock status.
 */
@Entity
@Table(name = "inventory")
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Item name (e.g. Bed Frame, Study Table, Ceiling Fan)
    private String itemName;

    // Total purchased stock
    private int totalQuantity;

    // Currently functional and in-use quantity
    private int availableQuantity;

    // Currently damaged or broken quantity pending repair
    private int brokenQuantity;

    // Category (e.g. Furniture, Electrical, Plumbing)
    private String category;

    public Inventory() {}

    // Getters and Setters
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
