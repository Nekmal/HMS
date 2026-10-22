package com.ruhuna.hms.dto;

/**
 * ============================================================================
 * Generic API Response Envelope DTO
 * ============================================================================
 * Provides a uniform, structured JSON payload contract across all HMS REST controllers.
 * 
 * Standard JSON Contract:
 * {
 *   "success": true | false,
 *   "message": "Human-readable status or error description",
 *   "data": { ... } | [ ... ] | null
 * }
 *
 * Benefits:
 * - Simplifies frontend error and response handling in JavaScript Fetch API calls.
 * - Uniformly transports execution status, feedback messages, and payload objects.
 * ============================================================================
 */
public class ApiResponse {

    /**
     * Flag indicating whether the HTTP operation completed successfully (true) or failed (false).
     */
    private boolean success;

    /**
     * Informational, confirmation, or error message intended for UI display (e.g. alert modals).
     */
    private String message;

    /**
     * Optional payload object (Entity, List, DTO, or null) containing operation results.
     */
    private Object data;

    /**
     * Default no-argument constructor required for JSON serialization/deserialization frameworks (Jackson).
     */
    public ApiResponse() {}

    /**
     * Convenience constructor for simple status responses without payload data.
     *
     * @param success Boolean indicating operation outcome.
     * @param message Descriptive feedback message.
     */
    public ApiResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    /**
     * Full constructor for responses delivering status, message, and payload data.
     *
     * @param success Boolean indicating operation outcome.
     * @param message Descriptive feedback message.
     * @param data Payload object to return to the calling client.
     */
    public ApiResponse(boolean success, String message, Object data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }
}

