package com.ruhuna.hms.service;

import com.ruhuna.hms.entity.GatePass;
import java.util.List;

/**
 * Service Interface defining the contract for managing student early departure gate passes.
 * <p>
 * Controls student ingress and egress policies during semester terms. Coordinates multi-role
 * permissions spanning student submission, Sub Warden electronic approvals or rejections,
 * and Main Gate security checkpoint departure timestamps.
 * </p>
 *
 * @author HMS Development Team
 * @version 1.0
 */
public interface GatePassService {

    /**
     * Retrieves all gate pass applications across all university hostels.
     *
     * @return List of all {@link GatePass} entities.
     */
    List<GatePass> getAllGatePasses();

    /**
     * Retrieves all gate passes filed by a specific student.
     *
     * @param userId The unique primary key ID of the student.
     * @return List of matching {@link GatePass} records.
     */
    List<GatePass> getGatePassesByUserId(Long userId);

    /**
     * Submits and registers a new early leave or weekend gate pass request.
     *
     * @param gatePass The {@link GatePass} entity containing travel reason, departure date, and expected return.
     * @return The persisted {@link GatePass} record in 'PENDING' status.
     */
    GatePass createGatePass(GatePass gatePass);

    /**
     * Grants administrative approval for a student gate pass.
     *
     * @param id The primary key ID of the gate pass application.
     * @return The updated {@link GatePass} record marked as 'APPROVED'.
     */
    GatePass approveGatePass(Long id);

    /**
     * Formally rejects a student gate pass request.
     *
     * @param id The primary key ID of the gate pass application.
     * @return The updated {@link GatePass} record marked as 'REJECTED'.
     */
    GatePass rejectGatePass(Long id);

    /**
     * Verifies approved pass and stamps actual gate departure timestamp at the security checkpoint.
     *
     * @param id The primary key ID of the gate pass.
     * @return The updated {@link GatePass} record marked as 'DEPARTED'.
     */
    GatePass markDeparted(Long id);
}
