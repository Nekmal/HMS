package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.StaffAttendance;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Service Interface defining the contract for staff duty attendance tracking and labor metrics.
 * <p>
 * Supports university facility personnel (Security Guards, Janitorial and Cleaning Crews, Maintenance Staff).
 * Coordinates self-service check-in/out timestamps, administrative absence marking, role filtering,
 * and aggregated monthly attendance compliance reports.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface StaffAttendanceService {

    /**
     * Retrieves all recorded staff duty attendance entries across all shifts and departments.
     *
     * @return List of all {@link StaffAttendance} records.
     */
    List<StaffAttendance> getAllAttendance();

    /**
     * Retrieves chronological attendance history for an individual staff employee.
     *
     * @param staffId The primary key ID of the staff member.
     * @return List of matching {@link StaffAttendance} logs ordered descending by date.
     */
    List<StaffAttendance> getAttendanceByStaffId(Long staffId);

    /**
     * Retrieves attendance entries filtered by designated staff job role (e.g. "SECURITY", "CLEANING").
     *
     * @param role The job role identifier string.
     * @return List of matching {@link StaffAttendance} records.
     */
    List<StaffAttendance> getAttendanceByRole(String role);

    /**
     * Records or updates on-duty check-in for a staff member for the current day.
     *
     * @param staffId The employee's primary key ID.
     * @param remarks Optional notes or shift details provided during check-in.
     * @return The saved {@link StaffAttendance} entity.
     */
    StaffAttendance markStaffCheckIn(Long staffId, String remarks);

    /**
     * Records duty departure/check-out time for a staff member for today's shift.
     *
     * @param staffId The employee's primary key ID.
     * @return The updated {@link StaffAttendance} record.
     */
    StaffAttendance markStaffCheckOut(Long staffId);

    /**
     * Manually overrides or logs staff absence / leave by an administrator (Sub Warden).
     *
     * @param staffId The target staff member's ID.
     * @param date The calendar date of the absence.
     * @param status Status identifier (e.g. "ABSENT", "ON_LEAVE").
     * @param remarks Justification notes or leave certificate references.
     * @return The persisted {@link StaffAttendance} record.
     */
    StaffAttendance markAdminAbsence(Long staffId, LocalDate date, String status, String remarks);

    /**
     * Calculates aggregated attendance statistics (present count, absences, leaves) for an employee.
     *
     * @param staffId The employee's primary key ID.
     * @return Map containing aggregated metric counts (`totalRecords`, `presentCount`, `absentCount`, `leaveCount`).
     */
    Map<String, Object> getStaffSummary(Long staffId);
}
