package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * ============================================================================
 * Complaint Entity (Student Maintenance & Issue Tickets)
 * ============================================================================
 * Database Table: complaints
 * 
 * Represents a maintenance or repair ticket filed by a resident student regarding
 * defective room furnishings, sanitary fixtures, or electrical appliances.
 * 
 * Lifecycle States:
 * - PENDING: Newly filed ticket awaiting administrative dispatch.
 * - IN_PROGRESS: Dispatched to maintenance technician with assigned due date.
 * - RESOLVED: Repair completed and tested. Triggers 'trg_AfterComplaintResolvedLog'.
 * 
 * Performance Indexes:
 * - 'idx_complaints_status_room' on (status, room_number)
 * ============================================================================
 */
@Entity
@Table(name = "complaints")
public class Complaint {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Foreign key relationship referencing the resident student who filed this complaint.
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Detailed problem description submitted by student (e.g., "Fan regulator smoking").
     */
    private String description;
    
    /**
     * Ticket resolution status: 'PENDING', 'IN_PROGRESS', or 'RESOLVED'.
     */
    private String status;
    
    /**
     * Date when the complaint was initially submitted by the student.
     */
    private LocalDate createdAt;

    /**
     * Physical room location where the issue occurred (e.g. "C-112", "A-105").
     */
    @Column(name = "room_number")
    private String roomNumber;

    /**
     * Defective equipment name (e.g. "Ceiling Fan", "Study Table", "LED Bulb", "Water Tap").
     */
    @Column(name = "item")
    private String item;

    /**
     * Timestamp when the Sub Warden dispatched this ticket to maintenance.
     */
    @Column(name = "notified_at")
    private LocalDate notifiedAt;

    /**
     * Name of the assigned maintenance technician (e.g. "Sunil Rathnayake").
     */
    @Column(name = "assigned_to")
    private String assignedTo;

    /**
     * Repair priority level: 'LOW', 'NORMAL', 'HIGH', or 'URGENT'.
     */
    @Column(name = "priority")
    private String priority = "NORMAL";

    /**
     * Count tracking how many times administration escalated this ticket due to delays.
     */
    @Column(name = "escalation_count")
    private Integer escalationCount = 0;

    /**
     * Target resolution due date set by the Sub Warden.
     */
    @Column(name = "due_date")
    private LocalDate dueDate;

    /**
     * Administrative instructions, escalation logs, or technician notes.
     */
    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public Complaint() {}

    /**
     * Dynamic business helper determining if this ticket has breached service SLAs.
     * Evaluates against target dueDate, dispatch notifiedAt (+2 days), or createdAt (+3 days).
     *
     * @return true if resolution is overdue, false otherwise.
     */
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

    /**
     * Calculates elapsed days past the expected completion SLA.
     *
     * @return Number of days overdue (0 if on schedule or resolved).
     */
    public long getDaysLate() {
        if (!isOverdue()) return 0;
        LocalDate today = LocalDate.now();
        LocalDate base = this.dueDate != null ? this.dueDate : (this.notifiedAt != null ? this.notifiedAt.plusDays(2) : (this.createdAt != null ? this.createdAt.plusDays(3) : today));
        long days = java.time.temporal.ChronoUnit.DAYS.between(base, today);
        return days > 0 ? days : 1;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

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

