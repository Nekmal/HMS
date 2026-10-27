package com.ruhuna.hms.entity;

import java.time.LocalDate;

/**
 * ============================================================================
 * StaffAttendance Domain Model (Support Personnel Duty & Absence Tracking)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: staff_attendance
 * ============================================================================
 */
public class StaffAttendance {

    private Long id;
    private User staff;
    private LocalDate date;
    private String status;
    private String checkInTime;
    private String checkOutTime;
    private String markedBy;
    private String remarks;

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

