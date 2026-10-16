package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Payment;
import com.ruhuna.hms.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for student hostel fee payments and transactions.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    @Autowired
    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Retrieve all hostel fee payment transactions
    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }

    // Retrieve fee payment receipts for a specific student
    @GetMapping("/user/{userId}")
    public List<Payment> getUserPayments(@PathVariable Long userId) {
        return paymentService.getPaymentsByUserId(userId);
    }

    // Process a student hostel fee payment
    @PostMapping
    public Payment createPayment(@RequestBody Payment payment) {
        return paymentService.processPayment(payment);
    }

    // Update an existing student hostel fee payment record
    @PutMapping("/{id}")
    public Payment updatePayment(@PathVariable Long id, @RequestBody Payment payment) {
        return paymentService.updatePayment(id, payment);
    }

    // Delete a payment transaction record
    @DeleteMapping("/{id}")
    public void deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
    }
}
