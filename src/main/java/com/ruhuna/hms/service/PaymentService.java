package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Payment;
import java.util.List;

/**
 * Service Interface defining the contract for student hostel fee payment processing and ledger accounting.
 * <p>
 * Governs university financial compliance, fee structures (admission fees, room rental, key deposits,
 * damage penalties), multi-channel payment verification (Cash, Bank Transfer, Online Payment Gateway),
 * transaction auditing, and automatic email receipt dispatching.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface PaymentService {

    /**
     * Retrieves all payment transactions recorded across all university hostel bursary accounts.
     *
     * @return List of all {@link Payment} entities.
     */
    List<Payment> getAllPayments();

    /**
     * Retrieves the complete payment ledger and payment history for a specific student.
     *
     * @param userId The unique primary key ID of the student.
     * @return List of matching {@link Payment} transaction records.
     */
    List<Payment> getPaymentsByUserId(Long userId);

    /**
     * Processes, records, and settles a hostel fee payment.
     * <p>
     * Implements transaction validation, auto-stamping of settlement date, persistence,
     * and triggers automated transactional email receipts to the student's registered address.
     * </p>
     *
     * @param payment The {@link Payment} entity containing student reference, amount, fee type, and method.
     * @return The persisted {@link Payment} entity with its generated transaction ID.
     */
    Payment processPayment(Payment payment);

    /**
     * Updates an existing payment transaction record with administrative corrections.
     *
     * @param id The primary key ID of the payment record.
     * @param paymentDetails Entity payload containing updated payment fields (amount, status, method).
     * @return The updated {@link Payment} entity.
     */
    Payment updatePayment(Long id, Payment paymentDetails);

    /**
     * Permanently deletes a payment transaction entry by its unique database identifier.
     *
     * @param id The primary key ID of the payment record to remove.
     */
    void deletePayment(Long id);
}
