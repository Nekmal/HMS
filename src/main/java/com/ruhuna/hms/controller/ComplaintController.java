package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for student complaints and issue reporting.
 * Handles complaint lodging, user history, and administrative resolution.
 */
@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    @Autowired
    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    // Retrieve all complaints across the hostel for administration review
    @GetMapping
    public List<Complaint> getAllComplaints() {
        return complaintService.getAllComplaints();
    }

    // Retrieve complaints lodged by a specific student
    @GetMapping("/user/{userId}")
    public List<Complaint> getUserComplaints(@PathVariable Long userId) {
        return complaintService.getComplaintsByUserId(userId);
    }

    // Submit a new student complaint
    @PostMapping
    public Complaint createComplaint(@RequestBody Complaint complaint) {
        return complaintService.createComplaint(complaint);
    }

    // Mark a complaint as resolved
    @PutMapping("/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id) {
        Complaint resolved = complaintService.resolveComplaint(id);
        return ResponseEntity.ok(resolved);
    }

    // Notify and dispatch complaint to maintenance personnel with single click or options
    @PutMapping("/{id}/notify-maintenance")
    public ResponseEntity<?> notifyMaintenance(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String assignedTo = body != null ? body.get("assignedTo") : null;
        String priority = body != null ? body.get("priority") : null;
        String adminNotes = body != null ? body.get("adminNotes") : null;
        String dueDateStr = body != null ? body.get("dueDate") : null;
        java.time.LocalDate dueDate = dueDateStr != null && !dueDateStr.trim().isEmpty() 
                ? java.time.LocalDate.parse(dueDateStr.trim()) : null;

        Complaint updated = complaintService.notifyMaintenance(id, assignedTo, priority, dueDate, adminNotes);
        return ResponseEntity.ok(updated);
    }

    // Send urgent reminder or escalate delayed overdue maintenance
    @PutMapping("/{id}/escalate")
    public ResponseEntity<?> escalateComplaint(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String note = body != null ? body.get("note") : null;
        Complaint escalated = complaintService.escalateComplaint(id, note);
        return ResponseEntity.ok(escalated);
    }
}
