package com.ruhuna.hms.controller;

import com.ruhuna.hms.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for dispatching email notices and messages from administrators to students or staff.
 */
@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final EmailService emailService;

    @Autowired
    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendEmail(@RequestBody EmailRequest request) {
        if (request.getTo() == null || request.getTo().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Recipient email address is required");
            return ResponseEntity.badRequest().body(err);
        }

        String subject = request.getSubject() != null ? request.getSubject() : "Hostel Notice - University of Ruhuna";
        String body = request.getBody() != null ? request.getBody() : "";

        emailService.sendEmail(request.getTo(), subject, body);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Email dispatched to " + request.getTo());
        return ResponseEntity.ok(response);
    }

    public static class EmailRequest {
        private String to;
        private String subject;
        private String body;

        public String getTo() { return to; }
        public void setTo(String to) { this.to = to; }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }

        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }
    }
}
