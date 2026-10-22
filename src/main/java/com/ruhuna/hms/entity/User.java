package com.ruhuna.hms.entity;

import jakarta.persistence.*;

/**
 * ============================================================================
 * User Entity (System Resident & Staff Directory)
 * ============================================================================
 * Database Table: users
 * 
 * Represents all human actors operating within the Hostel Management System:
 * - STUDENT: Resident undergraduate living in a hostel room.
 * - ADMIN: Sub Warden managing allocations, passes, treasury, and staff.
 * - SECURITY: Gate officer recording campus entries and departures.
 * - MAINTENANCE: Technician resolving facility and equipment complaints.
 * - CLEANING: Housekeeping assistant managing block sanitation.
 *
 * Relationships:
 * - ManyToOne with {@link Room}: Links a resident student to their assigned hostel room.
 * 
 * Performance Indexes:
 * - 'idx_users_student_id' on (student_id)
 * - 'idx_users_room_role' on (room_id, role)
 * ============================================================================
 */
@Entity
@Table(name = "users")
public class User {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique student registration index (e.g. "TG/2021/0001") or staff username (e.g. "SEC001", "admin").
     */
    @Column(unique = true, nullable = false)
    private String studentId;

    /**
     * Full legal name of the user (e.g. "Kasun Silva", "Nimal Perera").
     */
    private String fullName;

    /**
     * Plaintext or hashed password used for authentication.
     */
    private String password;

    /**
     * University or personal contact email address for automated notifications.
     */
    private String email;

    /**
     * Mobile phone number for SMS or emergency warden contact.
     */
    private String phone;
    
    /**
     * System authorization role: STUDENT, ADMIN, SECURITY, CLEANING, MAINTENANCE.
     */
    private String role;

    /**
     * Foreign key reference to the assigned hostel room (for students).
     * Nullable for non-resident staff and administrators.
     */
    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
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

