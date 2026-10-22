package com.ruhuna.hms.exception;

/**
 * ============================================================================
 * HTTP 400 Bad Request Exception
 * ============================================================================
 * Thrown across service layers when a client request violates business logic
 * constraints, validation rules, or semantic requirements.
 * 
 * Common Scenarios:
 * - Room overcapacity attempt (e.g. attempting to assign a 5th student to a 4-bed room).
 * - Gate pass date anomalies (return date configured earlier than departure date).
 * - Zero or negative payment amount submission.
 * - Missing mandatory fields in JSON payload.
 * ============================================================================
 */
public class BadRequestException extends RuntimeException {

    /**
     * Constructs a new BadRequestException with a descriptive error message.
     *
     * @param message Human-readable reason why the request was rejected.
     */
    public BadRequestException(String message) {
        super(message);
    }
}

