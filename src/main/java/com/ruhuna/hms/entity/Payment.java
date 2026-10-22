package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * ============================================================================
 * Payment Entity (Hostel Treasury & Fee Settlements)
 * ============================================================================
 * Database Table: payments
 * 
 * Represents a student accommodation fee payment transaction and receipt invoice.
 * 
 * Audit & Integrity Integration:
 * - Automatically audited by trigger 'trg_AfterPaymentInsertAudit' into table 'payment_audit_log'.
 * - Enforced by trigger 'trg_BeforePaymentValidateAmount' requiring strictly positive amount (> 0.00).
 * - Supported by Stored Procedure 'sp_RecordStudentPayment' with ACID rollback compensation.
 * 
 * Performance Indexes:
 * - 'idx_payments_month_status' on (month, status)
 * - 'idx_payments_user_date' on (user_id, payment_date)
 * ============================================================================
 */
@Entity
@Table(name = "payments")
public class Payment {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique financial invoice identifier formatted as "INV-[TIMESTAMP]" (e.g. "INV-17180001").
     */
    @Column(unique = true, nullable = false)
    private String invoiceNo;

    /**
     * Foreign key relationship referencing the resident student who paid the fee.
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Total currency value settled in Sri Lankan Rupees (LKR).
     */
    private double amount;

    /**
     * Academic or calendar billing month (e.g. "January 2026", "December 2026").
     */
    private String month;
    
    /**
     * Settlement status: 'PAID', 'PENDING', or 'OVERDUE'.
     */
    private String status;
    
    /**
     * Exact date when payment was settled and recorded.
     */
    private LocalDate paymentDate;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public Payment() {}

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getInvoiceNo() { return invoiceNo; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }
}

