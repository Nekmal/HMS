package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Notice;
import com.ruhuna.hms.service.NoticeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeService noticeService;

    @Autowired
    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping
    public List<Notice> getAllNotices() {
        return noticeService.getAllNotices();
    }

    @PostMapping
    public Notice createNotice(@RequestBody Notice notice) {
        return noticeService.createNotice(notice);
    }
}
