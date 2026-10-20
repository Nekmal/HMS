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
 * Service implementation for staff duty attendance tracking and Sub Warden absence recording.
 */
@Service
@Transactional
public class StaffAttendanceServiceImpl implements StaffAttendanceService {

    private final StaffAttendanceRepository staffAttendanceRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");

    @Autowired
    public StaffAttendanceServiceImpl(StaffAttendanceRepository staffAttendanceRepository,
                                     UserRepository userRepository) {
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.userRepository = userRepository;
    }

    // Fetches all staff attendance records
    @Override
    public List<StaffAttendance> getAllAttendance() {
        return staffAttendanceRepository.findAll();
    }

    // Fetches attendance history for a staff member ordered by date descending
    @Override
    public List<StaffAttendance> getAttendanceByStaffId(Long staffId) {
        return staffAttendanceRepository.findByStaffIdOrderByDateDesc(staffId);
    }

    // Fetches attendance records filtered by staff role
    @Override
    public List<StaffAttendance> getAttendanceByRole(String role) {
        return staffAttendanceRepository.findByStaffRole(role);
    }

    // Marks duty check-in for staff today with timestamp
    @Override
    public StaffAttendance markStaffCheckIn(Long staffId, String remarks) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + staffId));

        LocalDate today = LocalDate.now();
        Optional<StaffAttendance> existing = staffAttendanceRepository.findByStaffIdAndDate(staffId, today);

        String currentTime = LocalTime.now().format(TIME_FORMATTER);

        if (existing.isPresent()) {
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

    // Marks duty check-out for staff today with timestamp
    @Override
    public StaffAttendance markStaffCheckOut(Long staffId) {
        LocalDate today = LocalDate.now();
        Optional<StaffAttendance> existing = staffAttendanceRepository.findByStaffIdAndDate(staffId, today);

        String currentTime = LocalTime.now().format(TIME_FORMATTER);

        if (existing.isPresent()) {
            StaffAttendance att = existing.get();
            att.setCheckOutTime(currentTime);
            return staffAttendanceRepository.save(att);
        } else {
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

    // Records administrative absence or leave entered by Sub Warden
    @Override
    public StaffAttendance markAdminAbsence(Long staffId, LocalDate date, String status, String remarks) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + staffId));

        Optional<StaffAttendance> existing = staffAttendanceRepository.findByStaffIdAndDate(staffId, date);

        String safeStatus = (status != null && !status.isEmpty()) ? status.toUpperCase() : "ABSENT";

        if (existing.isPresent()) {
            StaffAttendance att = existing.get();
            att.setStatus(safeStatus);
            att.setMarkedBy("ADMIN");
            att.setRemarks(remarks != null ? remarks : "Absence marked by Administrator");
            return staffAttendanceRepository.save(att);
        } else {
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

    // Computes attendance metrics: total entries, present days, absences, and approved leaves
    @Override
    public Map<String, Object> getStaffSummary(Long staffId) {
        List<StaffAttendance> list = staffAttendanceRepository.findByStaffIdOrderByDateDesc(staffId);
        int presentCount = 0;
        int absentCount = 0;
        int leaveCount = 0;

        for (StaffAttendance a : list) {
            if ("PRESENT".equalsIgnoreCase(a.getStatus())) {
                presentCount++;
            } else if ("ABSENT".equalsIgnoreCase(a.getStatus())) {
                absentCount++;
            } else if ("ON_LEAVE".equalsIgnoreCase(a.getStatus())) {
                leaveCount++;
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("totalRecords", list.size());
        map.put("presentCount", presentCount);
        map.put("absentCount", absentCount);
        map.put("leaveCount", leaveCount);
        return map;
    }
}
