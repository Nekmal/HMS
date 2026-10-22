package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.Complaint;
import java.time.LocalDate;
import java.util.List;

/**
 * Service Interface defining the contract for resident complaint and maintenance operations.
 * <p>
 * Manages the full lifecycle of student and staff grievance reports regarding room amenities,
 * electrical faults, plumbing, sanitation, and hostel security. Supports complaint registration,
 * maintenance department dispatching, resolution workflows, and urgency escalations.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface ComplaintService {

    /**
     * Retrieves all complaints registered across all hostel blocks and student rooms.
     *
     * @return List of all {@link Complaint} records sorted by log history.
     */
    List<Complaint> getAllComplaints();

    /**
     * Retrieves all complaints submitted by a specific student or resident user.
     *
     * @param userId The unique primary key ID of the student/user.
     * @return List of matching {@link Complaint} records.
     */
    List<Complaint> getComplaintsByUserId(Long userId);

    /**
     * Registers and persists a new complaint lodged by a resident.
     *
     * @param complaint The {@link Complaint} object containing category, room, and issue description.
     * @return The persisted {@link Complaint} entity with its generated ticket ID.
     */
    Complaint createComplaint(Complaint complaint);

    /**
     * Marks an open or in-progress complaint ticket as RESOLVED.
     *
     * @param id The primary key ID of the complaint ticket.
     * @return The updated {@link Complaint} record.
     */
    Complaint resolveComplaint(Long id);

    /**
     * Assigns and dispatches an open complaint to a specialized maintenance team or technician.
     *
     * @param id The primary key ID of the complaint.
     * @param assignedTo Designated maintenance contractor or staff member (e.g. "Main Electrician").
     * @param priority Urgency level ("LOW", "MEDIUM", "HIGH", "EMERGENCY").
     * @param dueDate Target completion deadline.
     * @param adminNotes Operational instructions or diagnostic guidance from the Sub Warden.
     * @return The updated {@link Complaint} entity in 'IN_PROGRESS' status.
     */
    Complaint notifyMaintenance(Long id, String assignedTo, String priority, LocalDate dueDate, String adminNotes);

    /**
     * Escalates an unresolved, overdue, or severe complaint for urgent administrative intervention.
     *
     * @param id The primary key ID of the complaint.
     * @param escalationNote Escalation justification or urgency reason.
     * @return The updated {@link Complaint} entity flagged with 'ESCALATED' status.
     */
    Complaint escalateComplaint(Long id, String escalationNote);
}
