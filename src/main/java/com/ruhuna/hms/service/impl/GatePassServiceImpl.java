package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.repository.GatePassRepository;
import com.ruhuna.hms.service.GatePassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Implementation of GatePassService managing gate pass business logic and status transitions.
 */
@Service
public class GatePassServiceImpl implements GatePassService {

    private final GatePassRepository gatePassRepository;

    @Autowired
    public GatePassServiceImpl(GatePassRepository gatePassRepository) {
        this.gatePassRepository = gatePassRepository;
    }

    // Fetches all student gate pass requests
    @Override
    public List<GatePass> getAllGatePasses() {
        return gatePassRepository.findAll();
    }

    // Fetches gate pass history for a particular student
    @Override
    public List<GatePass> getGatePassesByUserId(Long userId) {
        return gatePassRepository.findByUserId(userId);
    }

    // Saves a new gate pass request with default PENDING status
    @Override
    public GatePass createGatePass(GatePass gatePass) {
        if (gatePass.getStatus() == null || gatePass.getStatus().isEmpty()) {
            gatePass.setStatus("PENDING");
        }
        return gatePassRepository.save(gatePass);
    }

    // Transitions gate pass status to APPROVED by Sub Warden
    @Override
    public GatePass approveGatePass(Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            throw new BadRequestException("Gate pass not found");
        }
        gatePass.setStatus("APPROVED");
        return gatePassRepository.save(gatePass);
    }

    // Transitions gate pass status to REJECTED by Sub Warden
    @Override
    public GatePass rejectGatePass(Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            throw new BadRequestException("Gate pass not found");
        }
        gatePass.setStatus("REJECTED");
        return gatePassRepository.save(gatePass);
    }

    // Transitions gate pass status to DEPARTED when cleared by Security officer
    @Override
    public GatePass markDeparted(Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            throw new BadRequestException("Gate pass not found");
        }
        gatePass.setStatus("DEPARTED");
        return gatePassRepository.save(gatePass);
    }
}
