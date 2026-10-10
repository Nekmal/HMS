package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.repository.ComplaintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintRepository complaintRepository;

    @GetMapping
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    @GetMapping("/user/{userId}")
    public List<Complaint> getUserComplaints(@PathVariable Long userId) {
        return complaintRepository.findByUserId(userId);
    }

    @PostMapping
    public Complaint createComplaint(@RequestBody Complaint complaint) {
        complaint.setStatus("PENDING");
        complaint.setCreatedAt(LocalDate.now());
        return complaintRepository.save(complaint);
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id) {
        Complaint complaint = complaintRepository.findById(id).orElse(null);
        if (complaint == null) {
            return ResponseEntity.badRequest().body("Complaint not found");
        }
        complaint.setStatus("RESOLVED");
        complaintRepository.save(complaint);
        return ResponseEntity.ok(complaint);
    }
}
