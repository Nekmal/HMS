package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ============================================================================
 * User Accounts & Resident Directory Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'users' table using Spring Data JPA.
 * 
 * Provides credential authentication lookups, role filtering, and registration
 * indexing for resident undergraduates and campus staff.
 * 
 * Performance Index Optimization:
 * - Queries benefit from index 'idx_users_student_id' on (student_id)
 * - Queries benefit from index 'idx_users_room_role' on (room_id, role).
 * ============================================================================
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds all system users assigned to a specific role (e.g. STUDENT, SECURITY, CLEANING, ADMIN, MAINTENANCE).
     *
     * @param role The role string identifier.
     * @return List of matching User entities.
     */
    List<User> findByRole(String role);

    /**
     * Locates a user by their unique student registration index (e.g. "TG/2021/0001") or staff username.
     * Used as the primary lookup during login authentication.
     *
     * @param studentId The unique student or staff identifier string.
     * @return The matching User entity, or null if not found.
     */
    User findByStudentId(String studentId);
}

