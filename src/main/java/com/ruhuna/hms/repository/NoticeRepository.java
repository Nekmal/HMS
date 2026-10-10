package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findAllByOrderByDatePostedDesc();
}
