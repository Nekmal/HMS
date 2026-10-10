package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Payment;
import com.ruhuna.hms.repository.PaymentRepository;
import com.ruhuna.hms.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    @GetMapping("/user/{userId}")
    public List<Payment> getUserPayments(@PathVariable Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    @PostMapping
    public Payment createPayment(@RequestBody Payment payment) {
        payment.setStatus("PAID");
        Payment saved = paymentRepository.save(payment);

        // Send Email
        if (saved.getUser() != null && saved.getUser().getEmail() != null && !saved.getUser().getEmail().isEmpty()) {
            String subject = "Payment Confirmation - Ruhuna HMS";
            String body = "Dear " + saved.getUser().getFullName() + ",\n\n" +
                          "Your payment of Rs. " + saved.getAmount() + " for the month of " + saved.getMonth() + " has been received successfully.\n" +
                          "Invoice No: " + saved.getInvoiceNo() + "\n\nThank You for using Ruhuna HMS!";
            emailService.sendEmail(saved.getUser().getEmail(), subject, body);
        }

        return saved;
    }
}
