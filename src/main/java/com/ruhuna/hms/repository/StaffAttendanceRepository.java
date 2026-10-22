package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * Staff Duty Shift Attendance Data Access Repository
 * ============================================================================
 * Interfaces with MySQL 'staff_attendance' table using Spring Data JPA.
 * 
 * Supports daily check-in/out tracking, shift summaries, and administrative
 * absence monitoring across Security, Cleaning, and Maintenance staff.
 * 
 * Performance Index Optimization:
 * - Queries benefit from index 'idx_staff_att_user_date' on (user_id, date, status).
 * ============================================================================
 */
@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {

    /**
     * Retrieves the complete attendance history for a specific staff member ordered newest first.
     *
     * @param staffId The employee user ID.
     * @return List of StaffAttendance records ordered by date DESC.
     */
    List<StaffAttendance> findByStaffIdOrderByDateDesc(Long staffId);

    /**
     * Retrieves all attendance records logged on a specific calendar date.
     *
     * @param date The calendar date to query.
     * @return List of staff attendance records for that day.
     */
    List<StaffAttendance> findByDate(LocalDate date);

    /**
     * Locates a staff member's attendance record for a specific calendar date (prevents duplicate daily check-ins).
     *
     * @param staffId The employee user ID.
     * @param date The specific calendar date.
     * @return Optional containing the attendance record if found.
     */
    Optional<StaffAttendance> findByStaffIdAndDate(Long staffId, LocalDate date);

    /**
     * Retrieves all attendance records matching a specific employee job role (e.g. 'SECURITY', 'CLEANING').
     *
     * @param role The staff role string.
     * @return List of matching StaffAttendance records.
     */
    List<StaffAttendance> findByStaffRole(String role);
}

