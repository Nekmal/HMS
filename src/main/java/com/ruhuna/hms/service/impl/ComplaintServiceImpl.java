package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.repository.ComplaintRepository;
import com.ruhuna.hms.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Service implementation for managing complaint workflow, persistence, and status updates.
 */
@Service
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;

    @Autowired
    public ComplaintServiceImpl(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    // Fetches all complaints submitted by hostel residents
    @Override
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    // Fetches complaints filed by a specific user
    @Override
    public List<Complaint> getComplaintsByUserId(Long userId) {
        return complaintRepository.findByUserId(userId);
    }

    // Saves a new complaint with PENDING status and current date
    @Override
    public Complaint createComplaint(Complaint complaint) {
        if (complaint.getStatus() == null || complaint.getStatus().isEmpty()) {
            complaint.setStatus("PENDING");
        }
        if (complaint.getCreatedAt() == null) {
            complaint.setCreatedAt(LocalDate.now());
        }
        return complaintRepository.save(complaint);
    }

    // Marks a complaint as RESOLVED
    @Override
    public Complaint resolveComplaint(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElse(null);
        if (complaint == null) {
            throw new BadRequestException("Complaint not found");
        }
        complaint.setStatus("RESOLVED");
        return complaintRepository.save(complaint);
    }
}
