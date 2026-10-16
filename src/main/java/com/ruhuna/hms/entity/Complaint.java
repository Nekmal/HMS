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

    // Date when Sub Warden/Admin dispatched notification to maintenance
    @Column(name = "notified_at")
    private LocalDate notifiedAt;

    // Assigned maintenance personnel (e.g. Sunil Rathnayake - Maintenance Specialist)
    @Column(name = "assigned_to")
    private String assignedTo;

    // Priority: NORMAL, HIGH, URGENT
    @Column(name = "priority")
    private String priority = "NORMAL";

    // Escalation count (how many times admin reminded / escalated due to delay)
    @Column(name = "escalation_count")
    private Integer escalationCount = 0;

    // Target completion due date
    @Column(name = "due_date")
    private LocalDate dueDate;

    // Admin notes or escalation comments
    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    public Complaint() {}

    // Overdue helper for JSON serialization
    public boolean isOverdue() {
        if ("RESOLVED".equalsIgnoreCase(this.status)) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (this.dueDate != null && this.dueDate.isBefore(today)) {
            return true;
        }
        if (this.notifiedAt != null && this.notifiedAt.isBefore(today.minusDays(2))) {
            return true;
        }
        if (this.createdAt != null && this.createdAt.isBefore(today.minusDays(3))) {
            return true;
        }
        return false;
    }

    // Days late helper
    public long getDaysLate() {
        if (!isOverdue()) return 0;
        LocalDate today = LocalDate.now();
        LocalDate base = this.dueDate != null ? this.dueDate : (this.notifiedAt != null ? this.notifiedAt.plusDays(2) : (this.createdAt != null ? this.createdAt.plusDays(3) : today));
        long days = java.time.temporal.ChronoUnit.DAYS.between(base, today);
        return days > 0 ? days : 1;
    }

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

    public LocalDate getNotifiedAt() { return notifiedAt; }
    public void setNotifiedAt(LocalDate notifiedAt) { this.notifiedAt = notifiedAt; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Integer getEscalationCount() { return escalationCount != null ? escalationCount : 0; }
    public void setEscalationCount(Integer escalationCount) { this.escalationCount = escalationCount; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
}
