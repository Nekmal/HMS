package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Complaint;
import java.util.List;

/**
 * Service interface for handling hostel resident complaints.
 */
public interface ComplaintService {
    // Retrieve all logged complaints
    List<Complaint> getAllComplaints();

    // Retrieve complaints submitted by a particular user
    List<Complaint> getComplaintsByUserId(Long userId);

    // Save a new student complaint
    Complaint createComplaint(Complaint complaint);

    // Mark a complaint as resolved
    Complaint resolveComplaint(Long id);

    // Notify/dispatch complaint to maintenance personnel
    Complaint notifyMaintenance(Long id, String assignedTo, String priority, java.time.LocalDate dueDate, String adminNotes);

    // Send urgent reminder / escalate delayed overdue complaint
    Complaint escalateComplaint(Long id, String escalationNote);
}
