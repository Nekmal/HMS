package com.ruhuna.hms.entity;

/**
 * ============================================================================
 * User Domain Model (System Resident & Staff Directory)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: users
 * ============================================================================
 */
public class User {

    private Long id;
    private String studentId;
    private String fullName;
    private String password;
    private String email;
    private String phone;
    private String role;
    private Room room;

    public User() {}

    /**
     * Parameterized constructor for account creation and test bootstrapping.
     */
    public User(String studentId, String fullName, String password, String role) {
        this.studentId = studentId;
        this.fullName = fullName;
        this.password = password;
        this.role = role;
    }

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
}

