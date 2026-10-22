package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * ============================================================================
 * RoomInventory Entity (Room Damage & Asset Dispatches)
 * ============================================================================
 * Database Table: room_inventory
 * 
 * Maps damaged warehouse equipment items directly to individual hostel rooms.
 * Serves as the junction entity between physical rooms and warehouse stock.
 * 
 * Repair Lifecycle:
 * - BROKEN: Defect reported by resident student or room inspector.
 * - IN_REPAIR: Spare parts dispatched; work initiated by maintenance technician.
 * - REPAIRED: Restored to working condition.
 * 
 * Database Integration:
 * - Enforces trigger 'trg_PreventRoomCheckoutWithDamages' preventing student room
 *   deallocation if unsettled damaged equipment exists.
 * ============================================================================
 */
@Entity
@Table(name = "room_inventory")
public class RoomInventory {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Foreign key relationship referencing the room containing the damaged item.
     */
    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /**
     * Foreign key relationship referencing the warehouse inventory equipment category.
     */
    @ManyToOne
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    /**
     * Number of defective units of this equipment item inside the room.
     */
    private int brokenQuantity;

    /**
     * Physical defect observation notes (e.g. "Fan blade bent, capacitor blown").
     */
    @Column(length = 500)
    private String damageDescription;

    /**
     * Restoration status: 'BROKEN', 'IN_REPAIR', or 'REPAIRED'.
     */
    private String status;

    /**
     * Calendar date when damage was officially recorded.
     */
    private LocalDate reportedDate;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
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

