package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Notice;
import com.ruhuna.hms.service.NoticeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * Official Notice Board & Bulletin Circulars REST Controller
 * ============================================================================
 * Base Endpoint: /api/notices
 * 
 * Responsibilities:
 * 1. Enables Sub Warden administration to publish official university notices,
 *    curfew alerts, electrical safety instructions, and maintenance schedules.
 * 2. Delivers announcement feeds to the Student, Security, Maintenance, and Cleaning portals.
 * 3. Supports timestamping and bulletin archiving.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeService noticeService;

    /**
     * Dependency injection of NoticeService.
     *
     * @param noticeService Business service handling notice persistence and broadcast retrieval.
     */
    @Autowired
    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    /**
     * GET /api/notices
     * Retrieves all published circulars and notices ordered chronologically.
     * Consumed by all portal dashboards to display the latest news and bulletin updates.
     *
     * @return List of all published Notice records.
     */
    @GetMapping
    public List<Notice> getAllNotices() {
        return noticeService.getAllNotices();
    }

    /**
     * POST /api/notices
     * Publishes a new official administrative announcement across the hostel complex.
     *
     * @param notice JSON payload containing notice title, detailed message body, and postedBy author.
     * @return Newly saved Notice entity.
     */
    @PostMapping
    public Notice createNotice(@RequestBody Notice notice) {
        return noticeService.createNotice(notice);
    }
}

