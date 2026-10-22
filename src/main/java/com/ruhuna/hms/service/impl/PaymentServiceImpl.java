package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Payment;
import com.ruhuna.hms.repository.PaymentRepository;
import com.ruhuna.hms.service.EmailService;
import com.ruhuna.hms.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * ============================================================================
 * Payment & Treasury Business Logic Service Implementation
 * ============================================================================
 * Manages financial accounting for hostel resident fee collections, invoice
 * generation, automated email confirmations, and transaction consistency.
 * 
 * ACID & Database Transaction Control:
 * - Annotated with {@link Transactional} ensuring atomic database commits.
 * - Triggers 'trg_AfterPaymentInsertAudit' on MySQL to write permanent audit logs.
 * - Enforces positive billing values via 'trg_BeforePaymentValidateAmount'.
 * ============================================================================
 */
@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    /**
     * Dependency injection of PaymentRepository and EmailService.
     *
     * @param paymentRepository JPA repository for payment entities.
     * @param emailService Service used to dispatch email payment receipts.
     */
    @Autowired
    public PaymentServiceImpl(PaymentRepository paymentRepository, EmailService emailService) {
        this.paymentRepository = paymentRepository;
        this.emailService = emailService;
    }

    /**
     * Retrieves all recorded fee payments and invoices across the hostel complex.
     *
     * @return List of all Payment entities.
     */
    @Override
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    /**
     * Retrieves all historical fee payment receipts for a specific resident student.
     *
     * @param userId The unique user ID of the resident student.
     * @return List of payments made by the student.
     */
    @Override
    public List<Payment> getPaymentsByUserId(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    /**
     * Processes and records an incoming student accommodation fee payment.
     * 1. Validates or defaults status to 'PAID'.
     * 2. Automatically generates an invoice number (INV-XXXXXXX) if not present.
     * 3. Sets current payment date if omitted.
     * 4. Persists payment entity to MySQL (firing database trigger 'trg_AfterPaymentInsertAudit').
     * 5. Dispatches an asynchronous email confirmation receipt to the student.
     *
     * @param payment The payment details to process.
     * @return The persisted Payment entity with generated invoice number.
     */
    @Override
    @Transactional
    public Payment processPayment(Payment payment) {
        // Default payment status to PAID
        if (payment.getStatus() == null || payment.getStatus().isEmpty()) {
            payment.setStatus("PAID");
        }
        // Auto-generate invoice number if missing
        if (payment.getInvoiceNo() == null || payment.getInvoiceNo().isEmpty()) {
            payment.setInvoiceNo("INV-" + (System.currentTimeMillis() % 10000000));
        }
        // Set payment settlement date to today
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
        }

        Payment saved = paymentRepository.save(payment);

        // Send Email confirmation if student email is configured
        if (saved.getUser() != null && saved.getUser().getEmail() != null && !saved.getUser().getEmail().isEmpty()) {
            String subject = "Payment Confirmation - Ruhuna HMS";
            String body = "Dear " + (saved.getUser().getFullName() != null ? saved.getUser().getFullName() : "Student") + ",\n\n" +
                          "Your payment of Rs. " + saved.getAmount() + " for the month of " + saved.getMonth() + " has been received successfully.\n" +
                          "Invoice No: " + saved.getInvoiceNo() + "\n\nThank You for using Ruhuna HMS!";
            emailService.sendEmail(saved.getUser().getEmail(), subject, body);
        }

        return saved;
    }

    /**
     * Updates an existing fee transaction record (e.g. status reconciliation).
     *
     * @param id Primary key ID of the payment transaction.
     * @param paymentDetails Updated payment entity fields.
     * @return The updated Payment record.
     */
    @Override
    @Transactional
    public Payment updatePayment(Long id, Payment paymentDetails) {
        Payment existing = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment record not found with id: " + id));

        existing.setAmount(paymentDetails.getAmount());
        if (paymentDetails.getStatus() != null && !paymentDetails.getStatus().isEmpty()) {
            existing.setStatus(paymentDetails.getStatus());
        }
        if (paymentDetails.getMonth() != null && !paymentDetails.getMonth().isEmpty()) {
            existing.setMonth(paymentDetails.getMonth());
        }
        if (paymentDetails.getPaymentDate() != null) {
            existing.setPaymentDate(paymentDetails.getPaymentDate());
        }
        if (paymentDetails.getInvoiceNo() != null && !paymentDetails.getInvoiceNo().isEmpty()) {
            existing.setInvoiceNo(paymentDetails.getInvoiceNo());
        }

        return paymentRepository.save(existing);
    }

    /**
     * Deletes a payment transaction record from the database.
     *
     * @param id Primary key ID of the payment to delete.
     */
    @Override
    @Transactional
    public void deletePayment(Long id) {
        paymentRepository.deleteById(id);
    }
}

