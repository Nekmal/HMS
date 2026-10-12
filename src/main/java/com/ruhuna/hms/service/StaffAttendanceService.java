package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.StaffAttendance;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Service interface for staff attendance management (Security and Cleaning staff).
 */
public interface StaffAttendanceService {
    // Retrieve all recorded staff attendance logs
    List<StaffAttendance> getAllAttendance();

    // Retrieve attendance history for an individual staff member
    List<StaffAttendance> getAttendanceByStaffId(Long staffId);

    // Retrieve attendance records filtered by role (e.g. SECURITY, CLEANING)
    List<StaffAttendance> getAttendanceByRole(String role);

    // Record duty check-in time for staff
    StaffAttendance markStaffCheckIn(Long staffId, String remarks);

    // Record duty check-out time for staff
    StaffAttendance markStaffCheckOut(Long staffId);

    // Record administrative absence or leave entry marked by Sub Warden
    StaffAttendance markAdminAbsence(Long staffId, LocalDate date, String status, String remarks);

    // Calculate aggregated attendance statistics (present days, absences) for a staff member
    Map<String, Object> getStaffSummary(Long staffId);
}
