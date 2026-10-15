package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * JPA entity representing an official hostel bulletin announcement.
 */
@Entity
@Table(name = "notices")
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Notice title or header
    private String title;
    
    // Notice body text / announcement content
    @Column(columnDefinition = "TEXT")
    private String content;
    
    // Date posted by Sub Warden
    private LocalDate datePosted;

    // Target Audience: ALL, STUDENTS, STAFF
    @Column(name = "target_audience")
    private String targetAudience = "ALL";

    public Notice() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDate getDatePosted() { return datePosted; }
    public void setDatePosted(LocalDate datePosted) { this.datePosted = datePosted; }

    public String getTargetAudience() { return targetAudience; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }
}
