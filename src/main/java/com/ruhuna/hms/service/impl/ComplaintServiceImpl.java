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

    // Saves a new complaint with PENDING status, current date, and room reference
    @Override
    public Complaint createComplaint(Complaint complaint) {
        if (complaint.getStatus() == null || complaint.getStatus().isEmpty()) {
            complaint.setStatus("PENDING");
        }
        if (complaint.getCreatedAt() == null) {
            complaint.setCreatedAt(LocalDate.now());
        }
        if ((complaint.getRoomNumber() == null || complaint.getRoomNumber().trim().isEmpty()) 
                && complaint.getUser() != null && complaint.getUser().getRoom() != null) {
            complaint.setRoomNumber(complaint.getUser().getRoom().getRoomNumber());
        }
        return complaintRepository.save(complaint);
    }

    // Marks a complaint as RESOLVED
    @Override
    public Complaint resolveComplaint(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElse(null);
        if (complaint == null) {
            throw new BadRequestException("Complaint not found with id: " + id);
        }
        complaint.setStatus("RESOLVED");
        return complaintRepository.save(complaint);
    }

    // Dispatches notification to maintenance crew for action
    @Override
    public Complaint notifyMaintenance(Long id, String assignedTo, String priority, LocalDate dueDate, String adminNotes) {
        Complaint complaint = complaintRepository.findById(id).orElse(null);
        if (complaint == null) {
            throw new BadRequestException("Complaint not found with id: " + id);
        }

        complaint.setStatus("IN_PROGRESS");
        complaint.setNotifiedAt(LocalDate.now());
        complaint.setAssignedTo(assignedTo != null && !assignedTo.trim().isEmpty() ? assignedTo : "Sunil Rathnayake (Maintenance Specialist)");
        complaint.setPriority(priority != null && !priority.trim().isEmpty() ? priority : "HIGH");
        complaint.setDueDate(dueDate != null ? dueDate : LocalDate.now().plusDays(2));
        if (adminNotes != null && !adminNotes.trim().isEmpty()) {
            complaint.setAdminNotes(adminNotes);
        }
        return complaintRepository.save(complaint);
    }

    // Sends urgent reminder or escalates delayed overdue maintenance
    @Override
    public Complaint escalateComplaint(Long id, String escalationNote) {
        Complaint complaint = complaintRepository.findById(id).orElse(null);
        if (complaint == null) {
            throw new BadRequestException("Complaint not found with id: " + id);
        }

        int count = (complaint.getEscalationCount() == null ? 0 : complaint.getEscalationCount()) + 1;
        complaint.setEscalationCount(count);
        complaint.setPriority("URGENT");
        complaint.setStatus("OVERDUE");

        String reminderText = "[URGENT LATE REMINDER #" + count + " on " + LocalDate.now() + "]: " + 
                (escalationNote != null && !escalationNote.trim().isEmpty() ? escalationNote : "Resolution is delayed. Immediate technical attention required!");
        String existingNotes = complaint.getAdminNotes();
        complaint.setAdminNotes(existingNotes != null && !existingNotes.isEmpty() ? existingNotes + "\n" + reminderText : reminderText);

        return complaintRepository.save(complaint);
    }
}
