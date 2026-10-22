package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * ============================================================================
 * GatePass Entity (Student Campus Leave & Security Pass)
 * ============================================================================
 * Database Table: gate_passes
 * 
 * Represents an official campus exit permission request submitted by a resident
 * student to depart the university hostel for home visits, medical appointments,
 * or academic fieldwork.
 * 
 * Workflow & Status Transitions:
 * - PENDING: Initial request submitted by student.
 * - APPROVED: Authorized by Sub Warden administration.
 * - REJECTED: Denied by Sub Warden administration.
 * - DEPARTED: Student cleared by Security Officer at the main gate and physically exited.
 * - RETURNED: Student reentered the hostel campus through the main gate.
 * 
 * Integrity Enforcement:
 * - Validated by database trigger 'trg_BeforeGatePassInsert' ensuring toDate >= fromDate.
 * 
 * Performance Index:
 * - 'idx_gate_passes_user_status' on (user_id, status)
 * ============================================================================
 */
@Entity
@Table(name = "gate_passes")
public class GatePass {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Foreign key relationship referencing the applicant resident student.
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Specific reason or justification for requesting leave (e.g. "Family wedding").
     */
    private String reason;

    /**
     * Departure date when the student plans to leave the hostel campus.
     */
    private LocalDate fromDate;

    /**
     * Expected return date when the student plans to arrive back at the hostel.
     */
    private LocalDate toDate;
    
    /**
     * Authorization and clearance status: 'PENDING', 'APPROVED', 'REJECTED', 'DEPARTED', 'RETURNED'.
     */
    private String status;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public GatePass() {}

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDate getFromDate() { return fromDate; }
    public void setFromDate(LocalDate fromDate) { this.fromDate = fromDate; }

    public LocalDate getToDate() { return toDate; }
    public void setToDate(LocalDate toDate) { this.toDate = toDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

