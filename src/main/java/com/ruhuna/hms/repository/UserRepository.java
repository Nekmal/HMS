package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByRole(String role);
}
