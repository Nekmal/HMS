package com.ruhuna.hms.entity;

import jakarta.persistence.*;

/**
 * ============================================================================
 * Room Entity (Hostel Physical Residential Units)
 * ============================================================================
 * Database Table: rooms
 * 
 * Represents an individual living quarter within the University of Ruhuna hostel.
 * 
 * Architectural & Physical Distribution:
 * - Distributed across 4 residential blocks: Block A, Block B, Block C, Block D.
 * - Standard student bed capacity: 4 beds per room.
 * 
 * Integrity Enforcement:
 * - Maintained by database trigger 'trg_PreventExceedRoomCapacity', aborting updates
 *   if current_occupancy ever exceeds capacity.
 * - Occupancy synchronized dynamically by 'trg_AfterUserRoomChange'.
 * ============================================================================
 */
@Entity
@Table(name = "rooms")
public class Room {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique room code identifier formatted as "[Block]-[Floor][Number]" (e.g. "A-101", "C-204").
     */
    @Column(unique = true, nullable = false)
    private String roomNumber;

    /**
     * Name of the residential building block (e.g. "Block A", "Block B", "Block C", "Block D").
     */
    private String blockName;

    /**
     * Maximum allowed bed capacity (typically 4 residents per room).
     */
    private int capacity;

    /**
     * Real-time count of active student residents assigned to this room.
     */
    private int currentOccupancy;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public Room() {}

    /**
     * Parameterized constructor for room initialization.
     *
     * @param roomNumber Unique room string.
     * @param blockName Residential building block.
     * @param capacity Maximum bed capacity.
     */
    public Room(String roomNumber, String blockName, int capacity) {
        this.roomNumber = roomNumber;
        this.blockName = blockName;
        this.capacity = capacity;
        this.currentOccupancy = 0;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getBlockName() { return blockName; }
    public void setBlockName(String blockName) { this.blockName = blockName; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public int getCurrentOccupancy() { return currentOccupancy; }
    public void setCurrentOccupancy(int currentOccupancy) { this.currentOccupancy = currentOccupancy; }
}

