package com.ruhuna.hms.entity;

import java.time.LocalDate;

/**
 * ============================================================================
 * GatePass Domain Model (Student Campus Leave & Security Pass)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: gate_passes
 * ============================================================================
 */
public class GatePass {

    private Long id;
    private User user;
    private String reason;
    private LocalDate fromDate;
    private LocalDate toDate;
    private String status;

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

