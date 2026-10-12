package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.GatePass;
import java.util.List;

/**
 * Service interface for managing student early departure gate passes.
 */
public interface GatePassService {
    // Retrieve all gate passes across students
    List<GatePass> getAllGatePasses();

    // Retrieve gate passes requested by a specific student
    List<GatePass> getGatePassesByUserId(Long userId);

    // Create a new gate pass request
    GatePass createGatePass(GatePass gatePass);

    // Approve student gate pass (Sub Warden)
    GatePass approveGatePass(Long id);

    // Reject student gate pass (Sub Warden)
    GatePass rejectGatePass(Long id);

    // Record student gate departure (Security)
    GatePass markDeparted(Long id);
}
