package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ============================================================================
 * Payment & Fee Settlement Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'payments' table using Spring Data JPA.
 * 
 * Performance Index Optimization:
 * - Queries benefit from index 'idx_payments_month_status' on (month, status)
 * - Queries benefit from index 'idx_payments_user_date' on (user_id, payment_date).
 * ============================================================================
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /**
     * Retrieves all payment receipts and invoices belonging to a specific student user.
     *
     * @param userId The unique user ID of the resident student.
     * @return List of matching Payment records.
     */
    List<Payment> findByUserId(Long userId);
}

