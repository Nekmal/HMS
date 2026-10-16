package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Payment;
import java.util.List;

/**
 * Service interface for processing student hostel fee payments.
 */
public interface PaymentService {
    // Retrieve all payment transaction logs
    List<Payment> getAllPayments();

    // Retrieve payment transaction history for a specific student
    List<Payment> getPaymentsByUserId(Long userId);

    // Process and record a student fee payment
    Payment processPayment(Payment payment);

    // Update an existing payment transaction record
    Payment updatePayment(Long id, Payment paymentDetails);

    // Delete a payment record by id
    void deletePayment(Long id);
}
