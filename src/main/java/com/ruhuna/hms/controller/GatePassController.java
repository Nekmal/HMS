package com.ruhuna.hms.controller;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.repository.GatePassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gatepasses")
public class GatePassController {

    @Autowired
    private GatePassRepository gatePassRepository;

    @GetMapping
    public List<GatePass> getAllGatePasses() {
        return gatePassRepository.findAll();
    }

    @GetMapping("/user/{userId}")
    public List<GatePass> getUserGatePasses(@PathVariable Long userId) {
        return gatePassRepository.findByUserId(userId);
    }

    @PostMapping
    public GatePass createGatePass(@RequestBody GatePass gatePass) {
        gatePass.setStatus("PENDING");
        return gatePassRepository.save(gatePass);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveGatePass(@PathVariable Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            return ResponseEntity.badRequest().body("Gate pass not found");
        }
        gatePass.setStatus("APPROVED");
        gatePassRepository.save(gatePass);
        return ResponseEntity.ok(gatePass);
    }
}
