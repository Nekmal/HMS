package com.ruhuna.hms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * ============================================================================
 * Global REST Exception Interceptor & Handler
 * ============================================================================
 * Centralized exception translation aspect annotated with {@link RestControllerAdvice}.
 * 
 * Purpose:
 * Intercepts uncaught runtime exceptions originating from any REST controller
 * in the application and converts them into standardized, clean HTTP error responses.
 *
 * Handled Exception Types:
 * 1. {@link ResourceNotFoundException} -> Translates to HTTP 404 (Not Found)
 * 2. {@link BadRequestException} -> Translates to HTTP 400 (Bad Request)
 * 3. {@link Exception} (Generic unhandled) -> Translates to HTTP 500 (Internal Server Error)
 * ============================================================================
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Intercepts ResourceNotFoundException when queried records are missing from MySQL.
     *
     * @param ex The captured ResourceNotFoundException instance.
     * @return HTTP 404 response with plaintext or localized message.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFoundException(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    /**
     * Intercepts BadRequestException when input data violates business validation rules.
     *
     * @param ex The captured BadRequestException instance.
     * @return HTTP 400 response with descriptive validation failure message.
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<String> handleBadRequestException(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    /**
     * Catch-all handler for unexpected system exceptions and runtime errors.
     * Prevents stack traces from leaking to client frontend portals.
     *
     * @param ex The unexpected generic exception.
     * @return HTTP 500 response containing structured JSON error payload.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", true);
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}

