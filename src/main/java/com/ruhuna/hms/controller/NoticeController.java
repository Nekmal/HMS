package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Notice;
import com.ruhuna.hms.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    @Autowired
    private NoticeRepository noticeRepository;

    @GetMapping
    public List<Notice> getAllNotices() {
        return noticeRepository.findAllByOrderByDatePostedDesc();
    }

    @PostMapping
    public Notice createNotice(@RequestBody Notice notice) {
        notice.setDatePosted(LocalDate.now());
        return noticeRepository.save(notice);
    }
}
