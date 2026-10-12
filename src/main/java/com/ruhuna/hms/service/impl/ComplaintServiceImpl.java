package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.repository.ComplaintRepository;
import com.ruhuna.hms.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;

    @Autowired
    public ComplaintServiceImpl(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    @Override
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    @Override
    public List<Complaint> getComplaintsByUserId(Long userId) {
        return complaintRepository.findByUserId(userId);
    }

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
