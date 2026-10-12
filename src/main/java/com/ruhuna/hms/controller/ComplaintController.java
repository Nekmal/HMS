package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    @Autowired
    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @GetMapping
    public List<Complaint> getAllComplaints() {
        return complaintService.getAllComplaints();
    }

    @GetMapping("/user/{userId}")
    public List<Complaint> getUserComplaints(@PathVariable Long userId) {
        return complaintService.getComplaintsByUserId(userId);
    }

    @PostMapping
    public Complaint createComplaint(@RequestBody Complaint complaint) {
        return complaintService.createComplaint(complaint);
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id) {
        Complaint resolved = complaintService.resolveComplaint(id);
        return ResponseEntity.ok(resolved);
    }
}
