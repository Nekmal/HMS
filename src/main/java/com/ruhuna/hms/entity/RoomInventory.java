package com.ruhuna.hms.entity;

import java.time.LocalDate;

/**
 * ============================================================================
 * RoomInventory Domain Model (Room Damage & Asset Dispatches)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: room_inventory
 * ============================================================================
 */
public class RoomInventory {

    private Long id;
    private Room room;
    private Inventory inventory;
    private int brokenQuantity;
    private String damageDescription;
    private String status;
    private LocalDate reportedDate;

    public RoomInventory() {}

    /**
     * Parameterized constructor for equipment issue creation.
     */
    public RoomInventory(Room room, Inventory inventory, int brokenQuantity, String damageDescription, String status, LocalDate reportedDate) {
        this.room = room;
        this.inventory = inventory;
        this.brokenQuantity = brokenQuantity;
        this.damageDescription = damageDescription;
        this.status = status;
        this.reportedDate = reportedDate;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public Inventory getInventory() { return inventory; }
    public void setInventory(Inventory inventory) { this.inventory = inventory; }

    public int getBrokenQuantity() { return brokenQuantity; }
    public void setBrokenQuantity(int brokenQuantity) { this.brokenQuantity = brokenQuantity; }

    public String getDamageDescription() { return damageDescription; }
    public void setDamageDescription(String damageDescription) { this.damageDescription = damageDescription; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getReportedDate() { return reportedDate; }
    public void setReportedDate(LocalDate reportedDate) { this.reportedDate = reportedDate; }
}

