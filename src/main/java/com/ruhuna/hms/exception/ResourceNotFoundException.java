package com.ruhuna.hms.exception;

/**
 * ============================================================================
 * HTTP 404 Resource Not Found Exception
 * ============================================================================
 * Thrown across service layers when a requested domain entity (User, Room,
 * Complaint, GatePass, Payment, Inventory item) cannot be located in the database.
 * 
 * Intercepted by {@link GlobalExceptionHandler} to return a standard HTTP 404 status.
 * ============================================================================
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Constructs a new ResourceNotFoundException with the missing entity description.
     *
     * @param message Human-readable message detailing which entity ID or lookup failed.
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

