package com.ruhuna.hms.service.impl;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.exception.BadRequestException;
import com.ruhuna.hms.repository.GatePassRepository;
import com.ruhuna.hms.service.GatePassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ============================================================================
 * Gate Pass & Campus Security Leave Service Implementation
 * ============================================================================
 * Coordinates the full approval and departure lifecycle of resident students:
 * 1. Request submission with default 'PENDING' state.
 * 2. Administrative authorization ('APPROVED' / 'REJECTED') by the Sub Warden.
 * 3. Physical campus gate checkout ('DEPARTED') by Security gate personnel.
 * 
 * Integrity Enforcement:
 * - Validated by database trigger 'trg_BeforeGatePassInsert' ensuring valid departure windows.
 * ============================================================================
 */
@Service
@Transactional
public class GatePassServiceImpl implements GatePassService {

    private final GatePassRepository gatePassRepository;

    /**
     * Dependency injection of GatePassRepository.
     *
     * @param gatePassRepository Pure SQL repository for gate pass records.
     */
    @Autowired
    public GatePassServiceImpl(GatePassRepository gatePassRepository) {
        this.gatePassRepository = gatePassRepository;
    }

    /**
     * Retrieves all student gate pass applications submitted across the hostel.
     *
     * @return List of all GatePass entities.
     */
    @Override
    public List<GatePass> getAllGatePasses() {
        return gatePassRepository.findAll();
    }

    /**
     * Retrieves all gate passes filed by a specific resident student.
     *
     * @param userId Primary key ID of the student user.
     * @return List of matching GatePass records.
     */
    @Override
    public List<GatePass> getGatePassesByUserId(Long userId) {
        return gatePassRepository.findByUserId(userId);
    }

    /**
     * Submits a new student campus departure request.
     * Initializes state to 'PENDING'.
     *
     * @param gatePass The incoming gate pass entity.
     * @return Persisted GatePass entity.
     */
    @Override
    public GatePass createGatePass(GatePass gatePass) {
        if (gatePass.getStatus() == null || gatePass.getStatus().isEmpty()) {
            gatePass.setStatus("PENDING");
        }
        return gatePassRepository.save(gatePass);
    }

    /**
     * Sub Warden administrative approval: transitions status from 'PENDING' to 'APPROVED'.
     *
     * @param id Primary key ID of the gate pass.
     * @return Updated GatePass entity.
     */
    @Override
    public GatePass approveGatePass(Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            throw new BadRequestException("Gate pass not found");
        }
        gatePass.setStatus("APPROVED");
        return gatePassRepository.save(gatePass);
    }

    /**
     * Sub Warden administrative rejection: transitions status to 'REJECTED'.
     *
     * @param id Primary key ID of the gate pass.
     * @return Updated GatePass entity.
     */
    @Override
    public GatePass rejectGatePass(Long id) {
        GatePass gatePass = gatePassRepository.findById(id).orElse(null);
        if (gatePass == null) {
            throw new BadRequestException("Gate pass not found");
        }
        gatePass.setStatus("REJECTED");
        return gatePassRepository.save(gatePass);
    }

    /**
     * Security gate clearance: marks student as 'DEPARTED' when physically exiting campus.
     *
     * @param id Primary key ID of the gate pass.
     * @return Updated GatePass entity.
     */
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

