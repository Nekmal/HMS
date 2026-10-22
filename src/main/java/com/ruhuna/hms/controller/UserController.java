package com.ruhuna.hms.controller;

import com.ruhuna.hms.dto.LoginRequest;
import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * User Accounts, Authentication & Room Allocation REST Controller
 * ============================================================================
 * Base Endpoint: /api/users
 * 
 * Responsibilities:
 * 1. User Authentication: Validates credentials for Sub Wardens, Students, Security,
 *    Maintenance, and Cleaning personnel, returning role-based profile tokens.
 * 2. Resident Directory: Manages user profiles (TG/2021/xxxx student numbers, staff IDs).
 * 3. Atomic Room Allocation: Assigns students to rooms, synchronizing occupancy counters
 *    through database triggers ('trg_AfterUserRoomChange') and logging audit trails ('user_audit_log').
 * 4. Index Utilization: Powered by performance index 'idx_users_student_id' for O(log n) lookups.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    /**
     * Dependency injection of UserService.
     *
     * @param userService Service handling user CRUD, authentication, and room assignment.
     */
    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * GET /api/users
     * Retrieves all registered accounts across all roles (STUDENT, ADMIN, SECURITY, MAINTENANCE, CLEANING).
     * Used by the Sub Warden user administration directory.
     *
     * @return List of all User entities.
     */
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    /**
     * POST /api/users
     * Registers a new user account into the hostel system.
     *
     * @param user JSON payload specifying studentId, fullName, email, phone, role, and password.
     * @return The persisted User entity.
     */
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    /**
     * PUT /api/users/{userId}/allocate/{roomId}
     * Allocates a resident student to a designated hostel room.
     * Verifies room capacity constraints (maximum 4 beds per room).
     *
     * @param userId Primary key ID of the student.
     * @param roomId Primary key ID of the target room.
     * @return ResponseEntity with the updated User entity reflecting assigned room.
     */
    @PutMapping("/{userId}/allocate/{roomId}")
    public ResponseEntity<?> allocateRoom(@PathVariable Long userId, @PathVariable Long roomId) {
        User allocated = userService.allocateRoom(userId, roomId);
        return ResponseEntity.ok(allocated);
    }

    /**
     * POST /api/users/login
     * Authenticates credentials submitted from /hms/login.html.
     * Returns the full User profile upon success or HTTP 401 Unauthorized upon failure.
     *
     * @param loginRequest DTO containing username (studentId) and password.
     * @return ResponseEntity with authenticated User profile, or HTTP 401 error message.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        User user = userService.authenticate(loginRequest.getStudentId(), loginRequest.getPassword());
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(401).body("Invalid credentials");
    }
}

