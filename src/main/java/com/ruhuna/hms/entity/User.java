package com.ruhuna.hms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String studentId; // Or Admin username

    private String fullName;
    private String password;
    private String email;
    private String phone;
    private String role; // "STUDENT" or "ADMIN"

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    public User() {}

    public User(String studentId, String fullName, String password, String role) {
        this.studentId = studentId;
        this.fullName = fullName;
        this.password = password;
        this.role = role;
    }

    // Getters and Setters
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
