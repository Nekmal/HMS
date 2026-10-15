package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * JPA entity representing a resident complaint or reported hostel issue.
 */
@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Student who filed the complaint
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String description;
    
    // Status: PENDING or RESOLVED
    private String status;
    
    private LocalDate createdAt;

    // Room number where issue occurred (e.g., C-112, A-105, Common Bathroom)
    @Column(name = "room_number")
    private String roomNumber;

    // Item/Fixture needing maintenance (e.g., Ceiling Fan, Study Table, Bed, Light Bulb, Window Latch, Tap)
    @Column(name = "item")
    private String item;

    public Complaint() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDate createdAt) { this.createdAt = createdAt; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }
}
