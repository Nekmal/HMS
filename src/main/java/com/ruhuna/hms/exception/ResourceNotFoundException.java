package com.ruhuna.hms.exception;

/**
 * Custom runtime exception thrown when an entity is not found in the database (HTTP 404).
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
