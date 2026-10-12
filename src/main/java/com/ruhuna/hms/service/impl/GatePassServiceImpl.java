package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.repository.GatePassRepository;
import com.ruhuna.hms.service.GatePassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GatePassServiceImpl implements GatePassService {

    private final GatePassRepository gatePassRepository;

    @Autowired
    public GatePassServiceImpl(GatePassRepository gatePassRepository) {
        this.gatePassRepository = gatePassRepository;
    }

    @Override
    public List<GatePass> getAllGatePasses() {
        return gatePassRepository.findAll();
    }

    @Override
    public List<GatePass> getGatePassesByUserId(Long userId) {
        return gatePassRepository.findByUserId(userId);
    }

    @Override
    public GatePass createGatePass(GatePass gatePass) {
        if (gatePass.getStatus() == null || gatePass.getStatus().isEmpty()) {
            gatePass.setStatus("PENDING");
        }
        return gatePassRepository.save(gatePass);
    }

    @Override
    public GatePass approveGatePass(Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            throw new BadRequestException("Gate pass not found");
        }
        gatePass.setStatus("APPROVED");
        return gatePassRepository.save(gatePass);
    }
}
