package com.ruhuna.hms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * ============================================================================
 * Notice Entity (Administrative Circulars & Public Bulletin Board)
 * ============================================================================
 * Database Table: notices
 * 
 * Represents an official announcement or circular published by the Sub Warden
 * to disseminate critical hostel information to residents and staff.
 * 
 * Content Examples:
 * - Hostel fee payment settlement deadlines.
 * - Scheduled power cuts and water tank cleaning shutdowns.
 * - Security gate curfew reminders and leave pass policies.
 * - Disciplinary rules and hostel inspection schedules.
 * ============================================================================
 */
@Entity
@Table(name = "notices")
public class Notice {

    /**
     * Primary key auto-increment ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Bold headline of the announcement (e.g. "Water Supply Maintenance Shutdown").
     */
    private String title;
    
    /**
     * Full detailed bulletin text body formatted as long-form content.
     */
    @Column(columnDefinition = "TEXT")
    private String content;
    
    /**
     * Calendar date when this notice was authored and posted by the Sub Warden.
     */
    private LocalDate datePosted;

    /**
     * Target stakeholder audience: 'ALL', 'STUDENTS', 'STAFF', or 'SECURITY'.
     */
    @Column(name = "target_audience")
    private String targetAudience = "ALL";

    /**
     * Default no-argument constructor required by Hibernate ORM.
     */
    public Notice() {}

    // ==========================================
    // Standard Getters and Setters
    // ==========================================

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

