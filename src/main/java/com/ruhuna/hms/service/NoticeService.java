package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Notice;
import java.util.List;

public interface NoticeService {
    List<Notice> getAllNotices();
    Notice createNotice(Notice notice);
}
