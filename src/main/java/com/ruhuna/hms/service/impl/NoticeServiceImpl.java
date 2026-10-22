package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Notice;
import com.ruhuna.hms.repository.NoticeRepository;
import com.ruhuna.hms.service.NoticeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Service Implementation for managing official hostel announcements and broadcast notices.
 * <p>
 * This class implements {@link NoticeService} and encapsulates business logic for creating,
 * broadcasting, and chronological retrieval of official circulars published by the Chief Warden,
 * Sub Warden, or administrative staff to students and hostel personnel.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
@Service
public class NoticeServiceImpl implements NoticeService {

    /**
     * Spring Data JPA repository for notice persistence operations.
     */
    private final NoticeRepository noticeRepository;

    /**
     * Constructs a new {@code NoticeServiceImpl} injecting the notice repository.
     *
     * @param noticeRepository The JPA repository for {@link Notice} entities.
     */
    @Autowired
    public NoticeServiceImpl(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    /**
     * Retrieves all published circular notices sorted in reverse chronological order (newest first).
     *
     * @return List of all {@link Notice} records ordered by `datePosted` descending.
     */
    @Override
    public List<Notice> getAllNotices() {
        // Query database for notices ordered by publication date descending
        return noticeRepository.findAllByOrderByDatePostedDesc();
    }

    /**
     * Creates and publishes a new official hostel notice.
     * <p>
     * Default attribute assignment:
     * 1. If publication date is omitted, defaults to the current system calendar date.
     * 2. If target audience is unspecified, defaults to broadcast code "ALL" (visible to all users).
     * </p>
     *
     * @param notice The notice data entity containing title, content, target audience, and poster info.
     * @return The persisted {@link Notice} entity with its generated identifier.
     */
    @Override
    public Notice createNotice(Notice notice) {
        // Apply default date posted if not explicitly set
        if (notice.getDatePosted() == null) {
            notice.setDatePosted(LocalDate.now());
        }
        // Apply default target audience to 'ALL' if blank
        if (notice.getTargetAudience() == null || notice.getTargetAudience().trim().isEmpty()) {
            notice.setTargetAudience("ALL");
        }
        // Persist circular notice to the database
        return noticeRepository.save(notice);
    }
}
