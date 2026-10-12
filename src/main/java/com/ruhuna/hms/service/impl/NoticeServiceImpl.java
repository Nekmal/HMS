package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Notice;
import com.ruhuna.hms.repository.NoticeRepository;
import com.ruhuna.hms.service.NoticeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class NoticeServiceImpl implements NoticeService {

    private final NoticeRepository noticeRepository;

    @Autowired
    public NoticeServiceImpl(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    @Override
    public List<Notice> getAllNotices() {
        return noticeRepository.findAllByOrderByDatePostedDesc();
    }

    @Override
    public Notice createNotice(Notice notice) {
        if (notice.getDatePosted() == null) {
            notice.setDatePosted(LocalDate.now());
        }
        return noticeRepository.save(notice);
    }
}
