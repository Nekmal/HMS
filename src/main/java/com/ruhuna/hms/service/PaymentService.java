package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Payment;
import java.util.List;

public interface PaymentService {
    List<Payment> getAllPayments();
    List<Payment> getPaymentsByUserId(Long userId);
    Payment processPayment(Payment payment);
}
