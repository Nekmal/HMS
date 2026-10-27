package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.GatePass;
import com.ruhuna.hms.entity.Room;
import com.ruhuna.hms.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * GatePass & Campus Security Leave Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries and invokes Stored Procedures:
 * - 'sp_ProcessGatePassApproval' (Atomic approval/rejection and audit logging)
 * - 'vw_ActiveGatePasses' (Real-time departure clearance analytical view)
 * Enforces trigger 'trg_BeforeGatePassInsert' ensuring return date >= departure date.
 * Index utilized:
 * - 'idx_gate_passes_user_status' on (user_id, status)
 * ============================================================================
 */
@Repository
public class GatePassRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public GatePassRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<GatePass> gatePassRowMapper = (rs, rowNum) -> {
        GatePass gatePass = new GatePass();
        gatePass.setId(rs.getLong("id"));
        gatePass.setReason(rs.getString("reason"));
        gatePass.setStatus(rs.getString("status"));

        Date fDate = rs.getDate("from_date");
        if (fDate != null) {
            gatePass.setFromDate(fDate.toLocalDate());
        }

        Date tDate = rs.getDate("to_date");
        if (tDate != null) {
            gatePass.setToDate(tDate.toLocalDate());
        }

        User user = new User();
        user.setId(rs.getLong("user_id"));
        user.setStudentId(rs.getString("student_id"));
        user.setFullName(rs.getString("full_name"));
        user.setEmail(rs.getString("email"));
        user.setPhone(rs.getString("phone"));
        user.setRole(rs.getString("role"));

        long roomId = rs.getLong("room_id");
        if (!rs.wasNull()) {
            Room room = new Room();
            room.setId(roomId);
            room.setRoomNumber(rs.getString("room_number"));
            user.setRoom(room);
        }

        gatePass.setUser(user);
        return gatePass;
    };

    private static final String BASE_SELECT =
            "SELECT gp.id, gp.user_id, gp.reason, gp.from_date, gp.to_date, gp.status, " +
            "       u.student_id, u.full_name, u.email, u.phone, u.role, u.room_id, " +
            "       r.room_number " +
            "FROM gate_passes gp " +
            "JOIN users u ON gp.user_id = u.id " +
            "LEFT JOIN rooms r ON u.room_id = r.id ";

    public List<GatePass> findAll() {
        String sql = BASE_SELECT + "ORDER BY gp.id DESC";
        return jdbcTemplate.query(sql, gatePassRowMapper);
    }

    public Optional<GatePass> findById(Long id) {
        String sql = BASE_SELECT + "WHERE gp.id = ?";
        try {
            GatePass gatePass = jdbcTemplate.queryForObject(sql, gatePassRowMapper, id);
            return Optional.ofNullable(gatePass);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<GatePass> findByUserId(Long userId) {
        String sql = BASE_SELECT + "WHERE gp.user_id = ? ORDER BY gp.id DESC";
        return jdbcTemplate.query(sql, gatePassRowMapper, userId);
    }

    public GatePass save(GatePass gatePass) {
        Long userId = (gatePass.getUser() != null) ? gatePass.getUser().getId() : null;
        Date fDate = (gatePass.getFromDate() != null) ? Date.valueOf(gatePass.getFromDate()) : Date.valueOf(java.time.LocalDate.now());
        Date tDate = (gatePass.getToDate() != null) ? Date.valueOf(gatePass.getToDate()) : fDate;

        if (gatePass.getId() == null) {
            String sql = "INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                if (userId != null) {
                    ps.setLong(1, userId);
                } else {
                    ps.setNull(1, Types.BIGINT);
                }
                ps.setString(2, gatePass.getReason());
                ps.setDate(3, fDate);
                ps.setDate(4, tDate);
                ps.setString(5, gatePass.getStatus() != null ? gatePass.getStatus() : "PENDING");
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                gatePass.setId(keyHolder.getKey().longValue());
            }
            return gatePass;
        } else {
            String sql = "UPDATE gate_passes SET reason = ?, from_date = ?, to_date = ?, status = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    gatePass.getReason(),
                    fDate,
                    tDate,
                    gatePass.getStatus(),
                    gatePass.getId()
            );
            return gatePass;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM gate_passes WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_ProcessGatePassApproval' with ACID transactions.
     *
     * @param passId Primary key ID of the gate pass.
     * @param decision APPROVED or REJECTED.
     * @param reviewer Username or role of the reviewing administrator.
     * @return Status message string.
     */
    public String callProcessGatePassApprovalProcedure(Long passId, String decision, String reviewer) {
        return jdbcTemplate.execute("{CALL sp_ProcessGatePassApproval(?, ?, ?, ?)}", (CallableStatementCallback<String>) cs -> {
            cs.setLong(1, passId);
            cs.setString(2, decision);
            cs.setString(3, reviewer);
            cs.registerOutParameter(4, Types.VARCHAR);
            cs.execute();
            return cs.getString(4);
        });
    }
}
