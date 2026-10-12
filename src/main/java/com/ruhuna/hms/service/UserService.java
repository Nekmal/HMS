package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.User;
import java.util.List;

/**
 * Service interface for user account management, authentication, and room allocations.
 */
public interface UserService {
    // Retrieve all registered system users
    List<User> getAllUsers();

    // Find a user by their database ID
    User getUserById(Long id);

    // Register a new user
    User createUser(User user);

    // Allocate a student to a room and update occupancy count
    User allocateRoom(Long userId, Long roomId);

    // Authenticate user with student ID / username and password
    User authenticate(String studentId, String password);

    // Lookup user by their unique student or staff identifier
    User findByStudentId(String studentId);
}
