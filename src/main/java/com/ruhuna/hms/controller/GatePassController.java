package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.service.GatePassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing student gate passes and early departures.
 * Handles student requests, Sub Warden approvals, and Security gate clearances.
 */
@RestController
@RequestMapping("/api/gatepasses")
public class GatePassController {

    private final GatePassService gatePassService;

    @Autowired
    public GatePassController(GatePassService gatePassService) {
        this.gatePassService = gatePassService;
    }

    // Retrieve all gate passes for Sub Warden review and Security gate verification
    @GetMapping
    public List<GatePass> getAllGatePasses() {
        return gatePassService.getAllGatePasses();
    }

    // Retrieve all gate passes belonging to a specific student
    @GetMapping("/user/{userId}")
    public List<GatePass> getUserGatePasses(@PathVariable Long userId) {
        return gatePassService.getGatePassesByUserId(userId);
    }

    // Submit a new early home departure or gate pass request
    @PostMapping
    public GatePass createGatePass(@RequestBody GatePass gatePass) {
        return gatePassService.createGatePass(gatePass);
    }

    // Sub Warden approval for student departure
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveGatePass(@PathVariable Long id) {
        GatePass approved = gatePassService.approveGatePass(id);
        return ResponseEntity.ok(approved);
    }

    // Sub Warden rejection for student departure
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectGatePass(@PathVariable Long id) {
        GatePass rejected = gatePassService.rejectGatePass(id);
        return ResponseEntity.ok(rejected);
    }

    // Security officer clearance when student exits through the gate
    @PutMapping("/{id}/depart")
    public ResponseEntity<?> markDeparted(@PathVariable Long id) {
        GatePass departed = gatePassService.markDeparted(id);
        return ResponseEntity.ok(departed);
    }
}
