package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.User;
import java.util.List;

/**
 * Service Interface defining the contract for user account management, authentication, and hostel room allocations.
 * <p>
 * Acts as the core identity management layer of the University of Ruhuna Hostel Management System.
 * Coordinates multi-role access control (STUDENT, SUB_WARDEN, DEAN, RECTOR, SECURITY, CLEANING),
 * credential authentication, profile creation, and student-to-room assignment workflows.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface UserService {

    /**
     * Retrieves all registered user accounts across all roles in the university.
     *
     * @return List of all {@link User} entities.
     */
    List<User> getAllUsers();

    /**
     * Retrieves a user entity by their unique database primary key ID.
     *
     * @param id The primary key ID of the user.
     * @return The requested {@link User} entity.
     */
    User getUserById(Long id);

    /**
     * Registers and persists a new user profile in the database.
     *
     * @param user The {@link User} entity containing username, registration/student ID, email, role, and password.
     * @return The saved {@link User} entity with generated ID.
     */
    User createUser(User user);

    /**
     * Allocates or re-assigns a student resident to a designated hostel room.
     * <p>
     * Implements capacity checks, occupancy updates on both old and new rooms,
     * and room status transitions (e.g., to 'FULL' when limit is reached).
     * </p>
     *
     * @param userId The primary key ID of the student user.
     * @param roomId The primary key ID of the target hostel room.
     * @return The updated {@link User} entity reflecting the assigned room.
     */
    User allocateRoom(Long userId, Long roomId);

    /**
     * Authenticates a user attempting to log into the hostel management portal.
     *
     * @param studentId The user's registration number, staff ID, or administrative username.
     * @param password The plaintext authentication password.
     * @return The authenticated {@link User} entity if credentials match.
     */
    User authenticate(String studentId, String password);

    /**
     * Looks up an active user account by their official university student or employee ID.
     *
     * @param studentId The unique student registration number or employee ID (e.g. "TG/2021/1001").
     * @return The matching {@link User} entity, or null/exception if not found.
     */
    User findByStudentId(String studentId);
}
