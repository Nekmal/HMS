package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * JPA entity tracking daily duty attendance and administrator marked absences for hostel staff.
 */
@Entity
@Table(name = "staff_attendance")
public class StaffAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Staff member (Security, Cleaning, Maintenance)
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User staff;

    private LocalDate date;

    // Attendance status: PRESENT, ABSENT, ON_LEAVE
    private String status;

    private String checkInTime;

    private String checkOutTime;

    // Source of the attendance entry: STAFF (self check-in) or ADMIN (Sub Warden)
    private String markedBy;

    @Column(length = 500)
    private String remarks;

    public StaffAttendance() {}

    public StaffAttendance(User staff, LocalDate date, String status, String checkInTime, String checkOutTime, String markedBy, String remarks) {
        this.staff = staff;
        this.date = date;
        this.status = status;
        this.checkInTime = checkInTime;
        this.checkOutTime = checkOutTime;
        this.markedBy = markedBy;
        this.remarks = remarks;
    }

    // Getters and Setters
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
