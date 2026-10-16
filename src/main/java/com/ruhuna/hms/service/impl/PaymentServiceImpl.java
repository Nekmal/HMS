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
 * Service implementation for managing hostel fee payments, transaction records,
 * and automated email receipt notifications.
 */
@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    @Autowired
    public PaymentServiceImpl(PaymentRepository paymentRepository, EmailService emailService) {
        this.paymentRepository = paymentRepository;
        this.emailService = emailService;
    }

    // Fetches all payments received across the hostel
    @Override
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    // Fetches payment records for a specific student
    @Override
    public List<Payment> getPaymentsByUserId(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    // Processes fee payment, marks as PAID, and sends email receipt
    @Override
    @Transactional
    public Payment processPayment(Payment payment) {
        payment.setStatus("PAID");
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
        }

        Payment saved = paymentRepository.save(payment);

        // Send Email confirmation if user email is present
        if (saved.getUser() != null && saved.getUser().getEmail() != null && !saved.getUser().getEmail().isEmpty()) {
            String subject = "Payment Confirmation - Ruhuna HMS";
            String body = "Dear " + (saved.getUser().getFullName() != null ? saved.getUser().getFullName() : "Student") + ",\n\n" +
                          "Your payment of Rs. " + saved.getAmount() + " for the month of " + saved.getMonth() + " has been received successfully.\n" +
                          "Invoice No: " + saved.getInvoiceNo() + "\n\nThank You for using Ruhuna HMS!";
            emailService.sendEmail(saved.getUser().getEmail(), subject, body);
        }

        return saved;
    }

    // Updates an existing fee transaction record
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

    // Deletes a payment transaction record
    @Override
    @Transactional
    public void deletePayment(Long id) {
        paymentRepository.deleteById(id);
    }
}
