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
 * ============================================================================
 * Multi-Department Staff Shift Attendance & Duty Roster REST Controller
 * ============================================================================
 * Base Endpoint: /api/staff-attendance
 * 
 * Responsibilities:
 * 1. Manages daily shift logs for all hostel support personnel:
 *    - Security Officers (Gate monitoring, campus patrol)
 *    - Maintenance Technicians (Electrical, civil, plumbing)
 *    - Housekeeping / Cleaning Staff (Sanitation, room hygiene)
 * 2. Self Check-in / Check-out: Staff record their on-duty start times and completion times.
 * 3. Enforces trigger 'trg_BeforeStaffCheckOutUpdate' to auto-populate default completion remarks.
 * 4. Sub Warden Admin Marking: Enables wardens to log excused leaves, medical absences, and unannounced absences.
 * 5. Monthly Metrics: Computes monthly duty attendance rates via function 'fn_GetStaffMonthlyPresentDays'.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/staff-attendance")
public class StaffAttendanceController {

    private final StaffAttendanceService staffAttendanceService;

    /**
     * Dependency injection of StaffAttendanceService.
     *
     * @param staffAttendanceService Business service managing roster logs, shift calculations, and summaries.
     */
    @Autowired
    public StaffAttendanceController(StaffAttendanceService staffAttendanceService) {
        this.staffAttendanceService = staffAttendanceService;
    }

    /**
     * GET /api/staff-attendance
     * Retrieves all recorded staff attendance logs across all departments and roles.
     * Used by Sub Warden staff management and duty audit portals.
     *
     * @return List of all StaffAttendance entities.
     */
    @GetMapping
    public List<StaffAttendance> getAllAttendance() {
        return staffAttendanceService.getAllAttendance();
    }

    /**
     * GET /api/staff-attendance/staff/{staffId}
     * Retrieves duty attendance logs for a specific employee identified by staffId.
     * Used by Security, Maintenance, and Cleaning staff dashboards under "My Attendance".
     *
     * @param staffId Primary key ID of the staff user.
     * @return List of attendance logs for the employee.
     */
    @GetMapping("/staff/{staffId}")
    public List<StaffAttendance> getAttendanceByStaffId(@PathVariable Long staffId) {
        return staffAttendanceService.getAttendanceByStaffId(staffId);
    }

    /**
     * GET /api/staff-attendance/staff/{staffId}/summary
     * Computes monthly attendance statistics (present days, absences, total shifts) for a staff member.
     *
     * @param staffId Primary key ID of the employee.
     * @return Map containing aggregated KPI metrics.
     */
    @GetMapping("/staff/{staffId}/summary")
    public ResponseEntity<Map<String, Object>> getStaffSummary(@PathVariable Long staffId) {
        return ResponseEntity.ok(staffAttendanceService.getStaffSummary(staffId));
    }

    /**
     * POST /api/staff-attendance/checkin/{staffId}
     * Records an employee shift check-in timestamp for the current date.
     * Marks duty status as 'PRESENT'.
     *
     * @param staffId Primary key ID of the employee clocking in.
     * @param body Optional JSON map containing custom shift 'remarks'.
     * @return Persisted StaffAttendance record.
     */
    @PostMapping("/checkin/{staffId}")
    public ResponseEntity<StaffAttendance> checkIn(@PathVariable Long staffId, @RequestBody(required = false) Map<String, String> body) {
        String remarks = (body != null && body.containsKey("remarks")) ? body.get("remarks") : "On duty";
        StaffAttendance att = staffAttendanceService.markStaffCheckIn(staffId, remarks);
        return ResponseEntity.ok(att);
    }

    /**
     * POST /api/staff-attendance/checkout/{staffId}
     * Records employee shift completion (clock-out timestamp) for the active duty shift.
     *
     * @param staffId Primary key ID of the employee clocking out.
     * @return Updated StaffAttendance record.
     */
    @PostMapping("/checkout/{staffId}")
    public ResponseEntity<StaffAttendance> checkOut(@PathVariable Long staffId) {
        StaffAttendance att = staffAttendanceService.markStaffCheckOut(staffId);
        return ResponseEntity.ok(att);
    }

    /**
     * POST /api/staff-attendance/admin-mark
     * Allows Sub Warden administration to manually log staff absence, medical leave, or scheduled off-duty.
     *
     * @param payload Map containing:
     *                - 'staffId': Employee ID
     *                - 'date': Absence date
     *                - 'status': e.g. "ABSENT", "LEAVE", "SICK"
     *                - 'remarks': Justification note
     * @return Persisted StaffAttendance record.
     */
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

