package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.service.GatePassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gatepasses")
public class GatePassController {

    private final GatePassService gatePassService;

    @Autowired
    public GatePassController(GatePassService gatePassService) {
        this.gatePassService = gatePassService;
    }

    @GetMapping
    public List<GatePass> getAllGatePasses() {
        return gatePassService.getAllGatePasses();
    }

    @GetMapping("/user/{userId}")
    public List<GatePass> getUserGatePasses(@PathVariable Long userId) {
        return gatePassService.getGatePassesByUserId(userId);
    }

    @PostMapping
    public GatePass createGatePass(@RequestBody GatePass gatePass) {
        return gatePassService.createGatePass(gatePass);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveGatePass(@PathVariable Long id) {
        GatePass approved = gatePassService.approveGatePass(id);
        return ResponseEntity.ok(approved);
    }
}
