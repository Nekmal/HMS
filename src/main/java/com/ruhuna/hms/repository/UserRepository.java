package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * JPA repository for system user entities.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    // Find users assigned to a specific role (e.g. STUDENT, SECURITY, CLEANING, ADMIN)
    List<User> findByRole(String role);

    // Find a user by their unique student or staff identifier
    User findByStudentId(String studentId);
}
