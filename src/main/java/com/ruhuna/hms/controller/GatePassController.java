package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.service.GatePassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ============================================================================
 * Student Gate Pass & Campus Departure Security REST Controller
 * ============================================================================
 * Base Endpoint: /api/gatepasses
 * 
 * Responsibilities:
 * 1. Resident Students: Apply for early home departure / leave pass specifying
 *    departure date, expected return date, and personal reason.
 * 2. Sub Warden (Administration): Review pending gate passes and grant approval (APPROVE)
 *    or rejection (REJECT).
 * 3. Security Command (Main Gate): Verify approved student departures, mark students
 *    as 'DEPARTED' when exiting campus, and mark as 'RETURNED' upon reentry.
 * 
 * Database Trigger Integration:
 * - Enforced by 'trg_BeforeGatePassInsert' ensuring return date >= departure date.
 * ============================================================================
 */
@RestController
@RequestMapping("/api/gatepasses")
public class GatePassController {

    private final GatePassService gatePassService;

    /**
     * Dependency injection of GatePassService through constructor.
     *
     * @param gatePassService Business service handling pass validation, state transitions, and audit records.
     */
    @Autowired
    public GatePassController(GatePassService gatePassService) {
        this.gatePassService = gatePassService;
    }

    /**
     * GET /api/gatepasses
     * Retrieves all gate pass applications across the university hostel.
     * Used by Sub Warden and Security command portals.
     *
     * @return List of all GatePass records.
     */
    @GetMapping
    public List<GatePass> getAllGatePasses() {
        return gatePassService.getAllGatePasses();
    }

    /**
     * GET /api/gatepasses/user/{userId}
     * Retrieves all gate passes belonging to a specific student user.
     * Used by the Student Portal to display leave application history and approval status.
     *
     * @param userId Primary key ID of the student user.
     * @return List of gate passes submitted by the specified student.
     */
    @GetMapping("/user/{userId}")
    public List<GatePass> getUserGatePasses(@PathVariable Long userId) {
        return gatePassService.getGatePassesByUserId(userId);
    }

    /**
     * POST /api/gatepasses
     * Submits a new gate pass request for Sub Warden authorization.
     * Default initial status is 'PENDING'.
     *
     * @param gatePass JSON payload containing fromDate, toDate, reason, and user association.
     * @return Newly created GatePass entity.
     */
    @PostMapping
    public GatePass createGatePass(@RequestBody GatePass gatePass) {
        return gatePassService.createGatePass(gatePass);
    }

    /**
     * PUT /api/gatepasses/{id}/approve
     * Sub Warden administrative action to authorize a student's departure request.
     * Transitions status from 'PENDING' to 'APPROVED'.
     *
     * @param id Primary key ID of the gate pass.
     * @return ResponseEntity with the approved GatePass.
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveGatePass(@PathVariable Long id) {
        GatePass approved = gatePassService.approveGatePass(id);
        return ResponseEntity.ok(approved);
    }

    /**
     * PUT /api/gatepasses/{id}/reject
     * Sub Warden administrative action to reject a student's departure request.
     * Transitions status to 'REJECTED'.
     *
     * @param id Primary key ID of the gate pass.
     * @return ResponseEntity with the rejected GatePass.
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectGatePass(@PathVariable Long id) {
        GatePass rejected = gatePassService.rejectGatePass(id);
        return ResponseEntity.ok(rejected);
    }

    /**
     * PUT /api/gatepasses/{id}/depart
     * Security Officer action at the hostel main gate when the student physically exits campus.
     * Transitions pass status from 'APPROVED' to 'DEPARTED'.
     *
     * @param id Primary key ID of the authorized gate pass.
     * @return ResponseEntity with the departed GatePass.
     */
    @PutMapping("/{id}/depart")
    public ResponseEntity<?> markDeparted(@PathVariable Long id) {
        GatePass departed = gatePassService.markDeparted(id);
        return ResponseEntity.ok(departed);
    }
}

