package com.ruhuna.hms.dto;

/**
 * ============================================================================
 * Login Request Credentials DTO
 * ============================================================================
 * Encapsulates incoming user login credentials sent from the frontend login form
 * (/hms/login.html) to the authentication endpoint (POST /hms/api/users/login).
 *
 * Supported User Identity Formats:
 * - Student ID: "TG/2021/0001", "TG/2021/0140", etc.
 * - Staff ID: "SEC001" (Security), "MNT001" (Maintenance), "CLN001" (Cleaning)
 * - Administrator: "admin" (Sub Warden)
 * ============================================================================
 */
public class LoginRequest {

    /**
     * Unique identifier for the account (Student registration number, Staff employee ID, or admin username).
     */
    private String studentId;

    /**
     * Plaintext or encrypted user password credential submitted for validation.
     */
    private String password;

    /**
     * Default no-argument constructor required by Spring Web MVC Jackson deserializer.
     */
    public LoginRequest() {}

    /**
     * Parameterized constructor for programmatic test assertions and authentication token initialization.
     *
     * @param studentId The user's account ID or registration string.
     * @param password The account secret password.
     */
    public LoginRequest(String studentId, String password) {
        this.studentId = studentId;
        this.password = password;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}

