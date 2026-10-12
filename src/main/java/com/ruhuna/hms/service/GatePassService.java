package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.GatePass;
import java.util.List;

public interface GatePassService {
    List<GatePass> getAllGatePasses();
    List<GatePass> getGatePassesByUserId(Long userId);
    GatePass createGatePass(GatePass gatePass);
    GatePass approveGatePass(Long id);
}
