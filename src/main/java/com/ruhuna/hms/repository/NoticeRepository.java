package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * JPA repository for notice board announcements.
 */
public interface NoticeRepository extends JpaRepository<Notice, Long> {
    // Find all notices sorted by newest publication date first
    List<Notice> findAllByOrderByDatePostedDesc();
}
