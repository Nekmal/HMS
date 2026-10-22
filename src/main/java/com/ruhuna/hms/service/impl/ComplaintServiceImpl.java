package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.Complaint;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.repository.ComplaintRepository;
import com.ruhuna.hms.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * ============================================================================
 * Complaint Workflow & Repair Dispatch Service Implementation
 * ============================================================================
 * Manages the full lifecycle of student-reported maintenance issues:
 * 1. Initial lodging with room location resolution and default 'PENDING' status.
 * 2. Administrative dispatch to maintenance specialists with target completion dates.
 * 3. SLA escalation tracking when repairs exceed acceptable resolution windows.
 * 4. Ticket resolution with automated MySQL audit logging via 'trg_AfterComplaintResolvedLog'.
 * ============================================================================
 */
@Service
@Transactional
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;

    /**
     * Dependency injection of ComplaintRepository.
     *
     * @param complaintRepository JPA repository for complaint entities.
     */
    @Autowired
    public ComplaintServiceImpl(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

    /**
     * Retrieves all complaints lodged across all four hostel blocks.
     *
     * @return List of all Complaint records.
     */
    @Override
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    /**
     * Retrieves all complaints filed by a specific student.
     *
     * @param userId The unique user ID of the student.
     * @return List of complaints submitted by the student.
     */
    @Override
    public List<Complaint> getComplaintsByUserId(Long userId) {
        return complaintRepository.findByUserId(userId);
    }

    /**
     * Saves a new student complaint into the database.
     * Automatically defaults status to 'PENDING', stamps current date, and
     * auto-resolves room number from the user's allocated room if left blank.
     *
     * @param complaint The incoming complaint entity.
     * @return Persisted Complaint entity.
     */
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

    /**
     * Marks an open complaint as RESOLVED.
     * Triggers database trigger 'trg_AfterComplaintResolvedLog' to create a permanent
     * audit record in 'user_audit_log'.
     *
     * @param id Primary key ID of the complaint to mark as resolved.
     * @return The updated Complaint entity.
     */
    @Override
    public Complaint resolveComplaint(Long id) {
        Complaint complaint = complaintRepository.findById(id).orElse(null);
        if (complaint == null) {
            throw new BadRequestException("Complaint not found with id: " + id);
        }
        complaint.setStatus("RESOLVED");
        return complaintRepository.save(complaint);
    }

    /**
     * Dispatches an existing complaint ticket to a designated maintenance technician.
     * Transitions ticket state from 'PENDING' to 'IN_PROGRESS'.
     *
     * @param id Primary key ID of the complaint.
     * @param assignedTo Technician name or default maintenance specialist.
     * @param priority Ticket priority (e.g. HIGH, URGENT).
     * @param dueDate Target resolution completion date (defaults to +2 days).
     * @param adminNotes Administrative notes or instructions.
     * @return The updated Complaint entity.
     */
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

    /**
     * Sends an urgent reminder or escalates a delayed overdue maintenance ticket.
     * Increments the escalation count, elevates priority to 'URGENT', and marks status as 'OVERDUE'.
     *
     * @param id Primary key ID of the complaint.
     * @param escalationNote Escalation reason or supervisor comment.
     * @return The escalated Complaint entity.
     */
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

