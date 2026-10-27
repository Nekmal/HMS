package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.StaffAttendance;
import com.ruhuna.hms.entity.User;
import com.ruhuna.hms.exception.ResourceNotFoundException;
import com.ruhuna.hms.repository.StaffAttendanceRepository;
import com.ruhuna.hms.repository.UserRepository;
import com.ruhuna.hms.service.StaffAttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * ============================================================================
 * Staff Duty Shift Attendance & Absence Tracking Service Implementation
 * ============================================================================
 * Coordinates daily shift check-ins, check-outs, administrative absence recording,
 * and monthly attendance metric aggregations for non-academic hostel personnel:
 * - Security Command (Head of Security, Gate officers, Night patrol).
 * - Maintenance Team (Electricians, Plumbers, Carpenters).
 * - Cleaning & Housekeeping Assistants (Block sanitation staff).
 * 
 * Auto-Remark Enforcement:
 * - Handled by database trigger 'trg_BeforeStaffCheckOutUpdate' auto-populating
 *   completion remarks when checkout timestamp is recorded.
 * ============================================================================
 */
@Service
@Transactional
public class StaffAttendanceServiceImpl implements StaffAttendanceService {

    private final StaffAttendanceRepository staffAttendanceRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");

    /**
     * Dependency injection of repositories.
     *
     * @param staffAttendanceRepository Pure SQL repository for staff attendance.
     * @param userRepository Pure SQL repository for user lookup.
     */
    @Autowired
    public StaffAttendanceServiceImpl(StaffAttendanceRepository staffAttendanceRepository,
                                     UserRepository userRepository) {
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves all staff duty attendance logs across all departments.
     *
     * @return List of all StaffAttendance entities.
     */
    @Override
    public List<StaffAttendance> getAllAttendance() {
        return staffAttendanceRepository.findAll();
    }

    /**
     * Retrieves attendance history for a specific staff member ordered newest first.
     *
     * @param staffId The employee primary key ID.
     * @return List of matching StaffAttendance records.
     */
    @Override
    public List<StaffAttendance> getAttendanceByStaffId(Long staffId) {
        return staffAttendanceRepository.findByStaffIdOrderByDateDesc(staffId);
    }

    /**
     * Retrieves attendance records filtered by staff role (e.g. 'SECURITY', 'CLEANING').
     *
     * @param role The staff role string.
     * @return List of matching StaffAttendance records.
     */
    @Override
    public List<StaffAttendance> getAttendanceByRole(String role) {
        return staffAttendanceRepository.findByStaffRole(role);
    }


    /**
     * Records or updates on-duty check-in for a staff member for the current date.
     * <p>
     * Logic overview:
     * 1. Validates that the specified staff user exists in the database.
     * 2. Checks if an attendance entry for today already exists:
     *    - If present, sets the check-in time (if not previously stamped) and updates status to 'PRESENT'.
     *    - If absent, creates a brand new attendance entity with status 'PRESENT', markedBy 'STAFF',
     *      and captures the current wall-clock time in "HH:mm:ss" format.
     * </p>
     *
     * @param staffId The employee's primary key ID.
     * @param remarks Optional comments or shift details provided during check-in.
     * @return The saved or updated {@link StaffAttendance} record.
     * @throws ResourceNotFoundException if no user exists with the given ID.
     */
    @Override
    public StaffAttendance markStaffCheckIn(Long staffId, String remarks) {
        // Step 1: Verify staff user existence
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + staffId));

        LocalDate today = LocalDate.now();
        // Step 2: Check if an entry for today is already created (e.g. pre-scheduled duty or prior check-in)
        Optional<StaffAttendance> existing = staffAttendanceRepository.findByStaffIdAndDate(staffId, today);

        String currentTime = LocalTime.now().format(TIME_FORMATTER);

        if (existing.isPresent()) {
            // Update existing log with check-in time and status
            StaffAttendance att = existing.get();
            if (att.getCheckInTime() == null || att.getCheckInTime().isEmpty()) {
                att.setCheckInTime(currentTime);
            }
            att.setStatus("PRESENT");
            if (remarks != null && !remarks.isEmpty()) {
                att.setRemarks(remarks);
            }
            return staffAttendanceRepository.save(att);
        } else {
            // Instantiate and persist new attendance record for the day
            StaffAttendance newAtt = new StaffAttendance(
                    staff,
                    today,
                    "PRESENT",
                    currentTime,
                    null,
                    "STAFF",
                    remarks != null && !remarks.isEmpty() ? remarks : "Self Check-in on duty"
            );
            return staffAttendanceRepository.save(newAtt);
        }
    }

    /**
     * Records duty check-out for a staff member for the current date.
     * <p>
     * Captures the departure timestamp and persists it to the daily record. If no check-in
     * was performed earlier in the day, a new record is initialized with only checkout time.
     * </p>
     *
     * @param staffId The employee's primary key ID.
     * @return The updated {@link StaffAttendance} entity with departure time recorded.
     * @throws ResourceNotFoundException if the staff user does not exist.
     */
    @Override
    public StaffAttendance markStaffCheckOut(Long staffId) {
        LocalDate today = LocalDate.now();
        // Lookup daily log for this staff member
        Optional<StaffAttendance> existing = staffAttendanceRepository.findByStaffIdAndDate(staffId, today);

        String currentTime = LocalTime.now().format(TIME_FORMATTER);

        if (existing.isPresent()) {
            // Append check-out timestamp to existing day's attendance
            StaffAttendance att = existing.get();
            att.setCheckOutTime(currentTime);
            return staffAttendanceRepository.save(att);
        } else {
            // Graceful handling: If check-in wasn't logged, create an entry with checkout timestamp
            User staff = userRepository.findById(staffId)
                    .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + staffId));
            StaffAttendance newAtt = new StaffAttendance(
                    staff,
                    today,
                    "PRESENT",
                    null,
                    currentTime,
                    "STAFF",
                    "Self Check-out"
            );
            return staffAttendanceRepository.save(newAtt);
        }
    }

    /**
     * Manually overrides or logs staff absence / leave by an administrator (Sub Warden).
     * <p>
     * Allows hostel management to record approved leaves, unnotified absences, or official
     * duties for any historical or scheduled date.
     * </p>
     *
     * @param staffId The target staff member's ID.
     * @param date The calendar date of the absence.
     * @param status Status identifier (e.g. "ABSENT", "ON_LEAVE"). Defaults to "ABSENT" if empty.
     * @param remarks Justification notes, leave certificate references, or admin remarks.
     * @return The persisted {@link StaffAttendance} record.
     */
    @Override
    public StaffAttendance markAdminAbsence(Long staffId, LocalDate date, String status, String remarks) {
        // Validate user existence
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + staffId));

        Optional<StaffAttendance> existing = staffAttendanceRepository.findByStaffIdAndDate(staffId, date);

        // Standardize status to uppercase
        String safeStatus = (status != null && !status.isEmpty()) ? status.toUpperCase() : "ABSENT";

        if (existing.isPresent()) {
            // Override existing record (e.g., converting tentative status to official leave)
            StaffAttendance att = existing.get();
            att.setStatus(safeStatus);
            att.setMarkedBy("ADMIN");
            att.setRemarks(remarks != null ? remarks : "Absence marked by Administrator");
            return staffAttendanceRepository.save(att);
        } else {
            // Insert new absence record with placeholder time markers
            StaffAttendance newAtt = new StaffAttendance(
                    staff,
                    date,
                    safeStatus,
                    "-",
                    "-",
                    "ADMIN",
                    remarks != null ? remarks : "Absence marked by Administrator"
            );
            return staffAttendanceRepository.save(newAtt);
        }
    }

    /**
     * Computes cumulative attendance KPI statistics for a given staff member.
     * <p>
     * Aggregates total duty days, present counts, absences, and leaves to provide
     * payroll and compliance metrics for administrative oversight.
     * </p>
     *
     * @param staffId The employee's primary key ID.
     * @return A map containing aggregated metrics:
     *         <ul>
     *           <li>{@code totalRecords}: Total duty dates logged</li>
     *           <li>{@code presentCount}: Number of days with 'PRESENT' status</li>
     *           <li>{@code absentCount}: Number of unexcused absences</li>
     *           <li>{@code leaveCount}: Number of approved leave dates</li>
     *         </ul>
     */
    @Override
    public Map<String, Object> getStaffSummary(Long staffId) {
        // Fetch all historical logs for this staff member
        List<StaffAttendance> list = staffAttendanceRepository.findByStaffIdOrderByDateDesc(staffId);
        int presentCount = 0;
        int absentCount = 0;
        int leaveCount = 0;

        // Tally records based on attendance status category
        for (StaffAttendance a : list) {
            if ("PRESENT".equalsIgnoreCase(a.getStatus())) {
                presentCount++;
            } else if ("ABSENT".equalsIgnoreCase(a.getStatus())) {
                absentCount++;
            } else if ("ON_LEAVE".equalsIgnoreCase(a.getStatus())) {
                leaveCount++;
            }
        }

        // Package results into map for API serialization
        Map<String, Object> map = new HashMap<>();
        map.put("totalRecords", list.size());
        map.put("presentCount", presentCount);
        map.put("absentCount", absentCount);
        map.put("leaveCount", leaveCount);
        return map;
    }
}
