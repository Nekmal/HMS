package com.ruhuna.hms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "inventory")
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemName;
    private int totalQuantity;
    private int availableQuantity;
    private int brokenQuantity;
    private String category; // e.g. "Furniture", "Electronics"

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
