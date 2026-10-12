package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * JPA entity mapping damaged inventory items to specific hostel rooms.
 */
@Entity
@Table(name = "room_inventory")
public class RoomInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Room where the damage occurred
    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // Damaged inventory equipment item
    @ManyToOne
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    private int brokenQuantity;

    @Column(length = 500)
    private String damageDescription;

    // Repair lifecycle status: BROKEN, IN_REPAIR, REPAIRED
    private String status;

    private LocalDate reportedDate;

    public RoomInventory() {}

    public RoomInventory(Room room, Inventory inventory, int brokenQuantity, String damageDescription, String status, LocalDate reportedDate) {
        this.room = room;
        this.inventory = inventory;
        this.brokenQuantity = brokenQuantity;
        this.damageDescription = damageDescription;
        this.status = status;
        this.reportedDate = reportedDate;
    }

    // Getters and Setters
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
