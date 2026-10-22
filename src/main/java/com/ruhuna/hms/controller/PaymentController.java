package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Payment;
import com.ruhuna.hms.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * Hostel Treasury & Student Fee Payments REST Controller
 * ============================================================================
 * Base Endpoint: /api/payments
 * 
 * Responsibilities:
 * 1. Financial Ledger Management: Records student accommodation fee payments,
 *    tuition/hostel dues, and monthly invoices.
 * 2. Automated Financial Auditing: Triggers the database trigger 'trg_AfterPaymentInsertAudit'
 *    which writes every settled payment to the permanent 'payment_audit_log' table.
 * 3. Validation: Enforces positive payment amounts via database trigger 'trg_BeforePaymentValidateAmount'.
 * 4. Provides individual student payment history for receipt download and statement printing.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Dependency injection of PaymentService.
     *
     * @param paymentService Treasury service managing invoice generation and database transaction commits.
     */
    @Autowired
    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * GET /api/payments
     * Retrieves all recorded fee payments and invoices across the entire hostel complex.
     * Used by Sub Warden Treasury and Revenue analytics dashboards.
     *
     * @return List of all Payment entities.
     */
    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }

    /**
     * GET /api/payments/user/{userId}
     * Retrieves all historical fee payment transactions and statements for a specific student.
     * Used by the Student Portal under "My Payments".
     *
     * @param userId Primary key ID of the resident student.
     * @return List of payments made by the student.
     */
    @GetMapping("/user/{userId}")
    public List<Payment> getUserPayments(@PathVariable Long userId) {
        return paymentService.getPaymentsByUserId(userId);
    }

    /**
     * POST /api/payments
     * Processes a new student fee payment transaction.
     * Atomically issues an invoice number, stamps the current date, and marks status as 'PAID'.
     *
     * @param payment JSON payload containing user, amount, month, and paymentMethod.
     * @return Persisted Payment record with generated invoice number.
     */
    @PostMapping
    public Payment createPayment(@RequestBody Payment payment) {
        return paymentService.processPayment(payment);
    }

    /**
     * PUT /api/payments/{id}
     * Updates an existing student hostel fee payment record (e.g. status reconciliation).
     *
     * @param id Primary key ID of the payment transaction.
     * @param payment Updated payment entity details.
     * @return The updated Payment record.
     */
    @PutMapping("/{id}")
    public Payment updatePayment(@PathVariable Long id, @RequestBody Payment payment) {
        return paymentService.updatePayment(id, payment);
    }

    /**
     * DELETE /api/payments/{id}
     * Removes an errant payment transaction record from the system.
     *
     * @param id Primary key ID of the payment to delete.
     */
    @DeleteMapping("/{id}")
    public void deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
    }
}

