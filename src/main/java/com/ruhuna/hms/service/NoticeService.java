package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Notice;
import java.util.List;

/**
 * Service Interface defining the contract for managing official hostel announcements and circulars.
 * <p>
 * Provides communication capabilities between university wardens, administrative offices,
 * resident students, and facility employees. Supports targeted and university-wide bulletins.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface NoticeService {

    /**
     * Retrieves all published official notices sorted with the latest circulars first.
     *
     * @return List of all {@link Notice} entities ordered chronologically descending.
     */
    List<Notice> getAllNotices();

    /**
     * Creates and broadcasts a new official announcement to the specified target audience.
     *
     * @param notice The {@link Notice} entity containing announcement title, body, date, and audience code.
     * @return The persisted {@link Notice} record with its database identifier.
     */
    Notice createNotice(Notice notice);
}
