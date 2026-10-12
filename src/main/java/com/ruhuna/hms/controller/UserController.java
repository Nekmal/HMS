package com.ruhuna.hms.controller;

import com.ruhuna.hms.dto.LoginRequest;
import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for user authentication, management, and hostel room allocation.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Retrieve all registered system users (students, staff, warden)
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    // Register a new user in the system
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    // Allocate a student to a specific hostel room (max 4 per room)
    @PutMapping("/{userId}/allocate/{roomId}")
    public ResponseEntity<?> allocateRoom(@PathVariable Long userId, @PathVariable Long roomId) {
        User allocated = userService.allocateRoom(userId, roomId);
        return ResponseEntity.ok(allocated);
    }

    // Authenticate user credentials and return user profile with role
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        User user = userService.authenticate(loginRequest.getStudentId(), loginRequest.getPassword());
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(401).body("Invalid credentials");
    }
}
