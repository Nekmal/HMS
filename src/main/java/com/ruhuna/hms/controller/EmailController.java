package com.ruhuna.hms.controller;

import com.ruhuna.hms.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * ============================================================================
 * Administrative Email Dispatch REST Controller
 * ============================================================================
 * Base Endpoint: /api/email
 * 
 * Responsibilities:
 * 1. Enables hostel wardens and administrative staff to send official notification
 *    emails directly to students or staff members.
 * 2. Integrates with JavaMailSender configured via application.properties.
 * 3. Supports room inspection notices, payment overdue reminders, and urgent alerts.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final EmailService emailService;

    /**
     * Dependency injection of EmailService through constructor.
     *
     * @param emailService Mail service handling SMTP transmission via Gmail/University mail server.
     */
    @Autowired
    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    /**
     * POST /api/email/send
     * Transmits an email message to the designated recipient.
     *
     * @param request JSON payload containing recipient email ('to'), 'subject', and message 'body'.
     * @return ResponseEntity with confirmation message or HTTP 400 if recipient address is missing.
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendEmail(@RequestBody EmailRequest request) {
        // Validate presence of recipient email address
        if (request.getTo() == null || request.getTo().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Recipient email address is required");
            return ResponseEntity.badRequest().body(err);
        }

        // Apply default hostel subject heading if not specified
        String subject = request.getSubject() != null ? request.getSubject() : "Hostel Notice - University of Ruhuna";
        String body = request.getBody() != null ? request.getBody() : "";

        // Dispatch email via Spring Mail
        emailService.sendEmail(request.getTo(), subject, body);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Email dispatched to " + request.getTo());
        return ResponseEntity.ok(response);
    }

    /**
     * Inner DTO representing outgoing email payload structure.
     */
    public static class EmailRequest {
        /**
         * Destination email address (e.g. "student@ruhuna.lk").
         */
        private String to;

        /**
         * Subject line of the email.
         */
        private String subject;

        /**
         * Text content of the email body.
         */
        private String body;

        public String getTo() { return to; }
        public void setTo(String to) { this.to = to; }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }

        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }
    }
}

