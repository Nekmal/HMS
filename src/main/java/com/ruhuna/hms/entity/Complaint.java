package com.ruhuna.hms.entity;

import java.time.LocalDate;

/**
 * ============================================================================
 * Complaint Domain Model (Student Maintenance & Issue Tickets)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: complaints
 * ============================================================================
 */
public class Complaint {

    private Long id;
    private User user;
    private String description;
    private String status;
    private LocalDate createdAt;
    private String roomNumber;
    private String item;
    private LocalDate notifiedAt;
    private String assignedTo;
    private String priority = "NORMAL";
    private Integer escalationCount = 0;
    private LocalDate dueDate;
    private String adminNotes;

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

