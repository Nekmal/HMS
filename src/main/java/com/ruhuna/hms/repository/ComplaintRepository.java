package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * JPA repository for student complaint entities.
 */
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    // Find all complaints submitted by a particular user
    List<Complaint> findByUserId(Long userId);
}
