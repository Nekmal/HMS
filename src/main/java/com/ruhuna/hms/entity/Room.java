package com.ruhuna.hms.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing a hostel room with block assignment and student occupancy limits.
 */
@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique room number identifier (e.g. A-101, B-205)
    @Column(unique = true, nullable = false)
    private String roomNumber;

    // Block or floor name: Block A, Block B, Block C, Block D
    private String blockName;

    // Maximum capacity (default 4 students per room)
    private int capacity;

    // Current assigned student count
    private int currentOccupancy;

    public Room() {}

    public Room(String roomNumber, String blockName, int capacity) {
        this.roomNumber = roomNumber;
        this.blockName = blockName;
        this.capacity = capacity;
        this.currentOccupancy = 0;
    }

    // Getters and Setters
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
