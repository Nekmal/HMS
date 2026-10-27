package com.ruhuna.hms.entity;

import java.time.LocalDate;

/**
 * ============================================================================
 * Notice Domain Model (Administrative Circulars & Public Bulletin Board)
 * ============================================================================
 * Pure POJO Model mapped via Pure SQL & JDBC RowMappers (Zero ORM).
 * Database Table: notices
 * ============================================================================
 */
public class Notice {

    private Long id;
    private String title;
    private String content;
    private LocalDate datePosted;
    private String targetAudience = "ALL";

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

