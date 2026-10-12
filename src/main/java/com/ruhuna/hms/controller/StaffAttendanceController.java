package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.StaffAttendance;
import com.ruhuna.hms.service.StaffAttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * REST controller for staff attendance tracking.
 * Manages daily check-in/check-out for Security and Cleaning staff, attendance summaries,
 * and Sub Warden recorded absences.
 */
@RestController
@RequestMapping("/api/staff-attendance")
public class StaffAttendanceController {

    private final StaffAttendanceService staffAttendanceService;

    @Autowired
    public StaffAttendanceController(StaffAttendanceService staffAttendanceService) {
        this.staffAttendanceService = staffAttendanceService;
    }

    // Retrieve all staff attendance logs across departments
    @GetMapping
    public List<StaffAttendance> getAllAttendance() {
        return staffAttendanceService.getAllAttendance();
    }

    // Retrieve attendance history for a specific staff member
    @GetMapping("/staff/{staffId}")
    public List<StaffAttendance> getAttendanceByStaffId(@PathVariable Long staffId) {
        return staffAttendanceService.getAttendanceByStaffId(staffId);
    }

    // Retrieve attendance summary (days worked, absences, late counts) for a staff member
    @GetMapping("/staff/{staffId}/summary")
    public ResponseEntity<Map<String, Object>> getStaffSummary(@PathVariable Long staffId) {
        return ResponseEntity.ok(staffAttendanceService.getStaffSummary(staffId));
    }

    // Record staff duty check-in timestamp
    @PostMapping("/checkin/{staffId}")
    public ResponseEntity<StaffAttendance> checkIn(@PathVariable Long staffId, @RequestBody(required = false) Map<String, String> body) {
        String remarks = (body != null && body.containsKey("remarks")) ? body.get("remarks") : "On duty";
        StaffAttendance att = staffAttendanceService.markStaffCheckIn(staffId, remarks);
        return ResponseEntity.ok(att);
    }

    // Record staff duty check-out timestamp
    @PostMapping("/checkout/{staffId}")
    public ResponseEntity<StaffAttendance> checkOut(@PathVariable Long staffId) {
        StaffAttendance att = staffAttendanceService.markStaffCheckOut(staffId);
        return ResponseEntity.ok(att);
    }

    // Record administrative absence or leave marked by Sub Warden
    @PostMapping("/admin-mark")
    public ResponseEntity<StaffAttendance> adminMarkAbsence(@RequestBody Map<String, Object> payload) {
        Long staffId = Long.valueOf(payload.get("staffId").toString());
        String dateStr = payload.containsKey("date") ? payload.get("date").toString() : LocalDate.now().toString();
        LocalDate date = LocalDate.parse(dateStr);
        String status = payload.containsKey("status") ? payload.get("status").toString() : "ABSENT";
        String remarks = payload.containsKey("remarks") ? payload.get("remarks").toString() : "Admin marked absence";

        StaffAttendance att = staffAttendanceService.markAdminAbsence(staffId, date, status, remarks);
        return ResponseEntity.ok(att);
    }
}
