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

@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    @Autowired
    public PaymentServiceImpl(PaymentRepository paymentRepository, EmailService emailService) {
        this.paymentRepository = paymentRepository;
        this.emailService = emailService;
    }

    @Override
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    @Override
    public List<Payment> getPaymentsByUserId(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

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
}
