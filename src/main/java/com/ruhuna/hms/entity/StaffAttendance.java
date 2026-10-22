package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * ============================================================================
 * StaffAttendance Entity (Support Personnel Duty & Absence Tracking)
 * ============================================================================
 * Database Table: staff_attendance
 * 
 * Records daily shift attendance, duty timestamps, and administrative absences
 * for non-academic hostel support staff across departments:
 * - Security Officers (Gate duty, campus perimeter surveillance).
 * - Maintenance Personnel (Electrical, plumbing, carpentry repairs).
 * - Cleaning & Housekeeping Assistants (Daily residential block sanitation).
 * 
 * Auto-Remark Enforcement:
 * - Handled by database trigger 'trg_BeforeStaffCheckOutUpdate' auto-populating
 *   completion remarks when checkout timestamp is recorded.
 * 
 * Performance Index:
 * - 'idx_staff_att_user_date' on (user_id, date, status)
 * ============================================================================
 */
@Entity
@Table(name = "staff_attendance")
public class StaffAttendance {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Foreign key relationship referencing the staff employee user account.
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User staff;

    /**
     * Calendar duty date.
     */
    private LocalDate date;

    /**
     * Work attendance state: 'PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'.
     */
    private String status;

    /**
     * Clock-in time string formatted as HH:mm:ss (e.g. "08:00:15").
     */
    private String checkInTime;

    /**
     * Clock-out time string formatted as HH:mm:ss (e.g. "17:00:30").
     */
    private String checkOutTime;

    /**
     * Origin of the attendance log: 'STAFF' (self check-in portal) or 'ADMIN' (Sub Warden).
     */
    private String markedBy;

    /**
     * Justification note, shift observation, or auto-populated checkout remark.
     */
    @Column(length = 500)
    private String remarks;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public StaffAttendance() {}

    /**
     * Parameterized constructor for duty record initialization.
     */
    public StaffAttendance(User staff, LocalDate date, String status, String checkInTime, String checkOutTime, String markedBy, String remarks) {
        this.staff = staff;
        this.date = date;
        this.status = status;
        this.checkInTime = checkInTime;
        this.checkOutTime = checkOutTime;
        this.markedBy = markedBy;
        this.remarks = remarks;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getStaff() { return staff; }
    public void setStaff(User staff) { this.staff = staff; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCheckInTime() { return checkInTime; }
    public void setCheckInTime(String checkInTime) { this.checkInTime = checkInTime; }

    public String getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(String checkOutTime) { this.checkOutTime = checkOutTime; }

    public String getMarkedBy() { return markedBy; }
    public void setMarkedBy(String markedBy) { this.markedBy = markedBy; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}

