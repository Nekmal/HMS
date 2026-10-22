package com.ruhuna.hms.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Service for dispatching transactional email notifications and receipts across the HMS system.
 * <p>
 * Integrates with Spring Framework's {@link JavaMailSender} over SMTP to deliver automated alerts
 * to students and administrators. Key use cases include:
 * <ul>
 *   <li>Payment receipt issuance upon successful fee settlements</li>
 *   <li>Maintenance complaint resolution notifications</li>
 *   <li>Emergency gate pass status alerts</li>
 * </ul>
 * Errors during email transmission are gracefully caught and logged to prevent interrupting
 * database transactions or core user workflows.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
@Service
public class EmailService {

    /**
     * Spring Mail sender component configured with external SMTP credentials.
     */
    @Autowired
    private JavaMailSender mailSender;

    /**
     * Dispatches a plaintext transactional email to the designated recipient.
     * <p>
     * Assembles a {@link SimpleMailMessage} with sender address, recipient address,
     * subject header, and message body text. Catches any mail exceptions (such as network
     * timeouts or authentication failures) and writes diagnostic traces to standard error
     * without bubbling runtime exceptions up to the calling service.
     * </p>
     *
     * @param to The recipient's email address (e.g. "student@ruhuna.ac.lk").
     * @param subject The email subject line.
     * @param body The text content of the message body.
     */
    public void sendEmail(String to, String subject, String body) {
        try {
            // Construct message payload
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("ruhunahms@gmail.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            // Transmit email through configured JavaMailSender SMTP session
            mailSender.send(message);
            System.out.println("Email sent successfully to: " + to);
        } catch (Exception e) {
            // Log failure diagnostics without breaking the caller's transaction
            System.err.println("Failed to send email to " + to + " : " + e.getMessage());
        }
    }
}
