package com.ruhuna.hms.exception;

/**
 * Custom runtime exception thrown when client request validation fails (HTTP 400).
 */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
