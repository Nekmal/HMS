package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * JPA repository for staff attendance entities.
 */
@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {
    // Find attendance history for a specific staff member ordered by newest first
    List<StaffAttendance> findByStaffIdOrderByDateDesc(Long staffId);

    // Find all attendance records for a specific date
    List<StaffAttendance> findByDate(LocalDate date);

    // Find attendance entry for a staff member on a specific date
    Optional<StaffAttendance> findByStaffIdAndDate(Long staffId, LocalDate date);

    // Find attendance records matching a staff role (SECURITY, CLEANING, etc.)
    List<StaffAttendance> findByStaffRole(String role);
}
