package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Notice;
import java.util.List;

/**
 * Service interface for hostel announcements and notices.
 */
public interface NoticeService {
    // Retrieve all active notices
    List<Notice> getAllNotices();

    // Publish a new notice
    Notice createNotice(Notice notice);
}
