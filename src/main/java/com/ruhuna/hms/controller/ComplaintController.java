package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * Student Complaints & Facility Issue REST Controller
 * ============================================================================
 * Base Endpoint: /api/complaints
 * 
 * Responsibilities:
 * 1. Allows resident students to lodge complaints regarding damaged room equipment
 *    (broken fans, fused lights, damaged doors, leaking plumbing).
 * 2. Provides Sub Warden and administrative staff with hostel-wide complaint overviews.
 * 3. Supports dispatching repair tickets to maintenance technicians with assigned priorities and due dates.
 * 4. Enables maintenance personnel to update ticket progress and mark complaints as resolved.
 * 5. Provides escalation mechanisms for tickets exceeding resolution service level agreements (SLAs).
 * ============================================================================
 */
@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    /**
     * Dependency injection of ComplaintService through constructor.
     *
     * @param complaintService Business service handling complaint persistence and notifications.
     */
    @Autowired
    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    /**
     * GET /api/complaints
     * Retrieves all lodged complaints across all hostel blocks (A, B, C, D).
     * Used by Sub Warden and Maintenance command dashboards.
     *
     * @return List of all Complaint entities ordered by submission date.
     */
    @GetMapping
    public List<Complaint> getAllComplaints() {
        return complaintService.getAllComplaints();
    }

    /**
     * GET /api/complaints/user/{userId}
     * Retrieves all complaints lodged specifically by the student identified by userId.
     * Used by the Student Portal to render personal complaint history.
     *
     * @param userId Primary key ID of the student user.
     * @return List of complaints filed by the specific student.
     */
    @GetMapping("/user/{userId}")
    public List<Complaint> getUserComplaints(@PathVariable Long userId) {
        return complaintService.getComplaintsByUserId(userId);
    }

    /**
     * POST /api/complaints
     * Submits a new facility repair or maintenance complaint into the system.
     * Automatically initializes complaint status as 'PENDING'.
     *
     * @param complaint JSON payload containing roomNumber, title, description, category, and userId.
     * @return The persisted Complaint entity with auto-generated database ID.
     */
    @PostMapping
    public Complaint createComplaint(@RequestBody Complaint complaint) {
        return complaintService.createComplaint(complaint);
    }

    /**
     * PUT /api/complaints/{id}/resolve
     * Marks an open or in-progress complaint as RESOLVED.
     * Triggers the database trigger 'trg_AfterComplaintResolvedLog' to create a permanent audit log entry.
     *
     * @param id Primary key ID of the complaint to mark as resolved.
     * @return ResponseEntity with the updated Complaint entity.
     */
    @PutMapping("/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id) {
        Complaint resolved = complaintService.resolveComplaint(id);
        return ResponseEntity.ok(resolved);
    }

    /**
     * PUT /api/complaints/{id}/notify-maintenance
     * Dispatches an existing complaint ticket to a designated maintenance technician.
     * Sets priority level (LOW, MEDIUM, HIGH, URGENT), target due date, and admin instructions.
     *
     * @param id Complaint ID to dispatch.
     * @param body Optional JSON map with keys: 'assignedTo', 'priority', 'dueDate', 'adminNotes'.
     * @return ResponseEntity with the dispatched Complaint record.
     */
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

    /**
     * PUT /api/complaints/{id}/escalate
     * Escalates an overdue or urgent complaint ticket to higher administrative authority.
     * Increases ticket priority and appends escalation notes.
     *
     * @param id Complaint ID to escalate.
     * @param body Optional JSON map containing escalation 'note'.
     * @return ResponseEntity with the escalated Complaint record.
     */
    @PutMapping("/{id}/escalate")
    public ResponseEntity<?> escalateComplaint(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String note = body != null ? body.get("note") : null;
        Complaint escalated = complaintService.escalateComplaint(id, note);
        return ResponseEntity.ok(escalated);
    }
}

