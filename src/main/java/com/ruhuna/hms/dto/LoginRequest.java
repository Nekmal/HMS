package com.ruhuna.hms.dto;

/**
 * DTO carrying user authentication credentials during login.
 */
public class LoginRequest {
    private String studentId;
    private String password;

    public LoginRequest() {}

    public LoginRequest(String studentId, String password) {
        this.studentId = studentId;
        this.password = password;
    }

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
