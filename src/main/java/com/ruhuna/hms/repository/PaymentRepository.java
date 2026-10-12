package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * JPA repository for student hostel payment transactions.
 */
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    // Find all payment records for a given user ID
    List<Payment> findByUserId(Long userId);
}
