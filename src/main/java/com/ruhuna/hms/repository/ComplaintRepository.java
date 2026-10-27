package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Complaint;
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
 * Complaint & Facility Maintenance Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries and invokes Stored Procedures:
 * - 'sp_FileStudentComplaint' (Atomic ticket creation and audit logging)
 * - 'vw_PendingComplaintsDashboard' (Multi-table analytical reporting view)
 * - 'fn_GetStudentTotalComplaints' (UDF for student issue tracking)
 * Index utilized:
 * - 'idx_complaints_status_room' on (status, room_number)
 * ============================================================================
 */
@Repository
public class ComplaintRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public ComplaintRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Complaint> complaintRowMapper = (rs, rowNum) -> {
        Complaint complaint = new Complaint();
        complaint.setId(rs.getLong("id"));
        complaint.setDescription(rs.getString("description"));
        complaint.setStatus(rs.getString("status"));

        Date crDate = rs.getDate("created_at");
        if (crDate != null) {
            complaint.setCreatedAt(crDate.toLocalDate());
        }

        complaint.setRoomNumber(rs.getString("room_number"));
        complaint.setItem(rs.getString("item"));

        Date notDate = rs.getDate("notified_at");
        if (notDate != null) {
            complaint.setNotifiedAt(notDate.toLocalDate());
        }

        complaint.setAssignedTo(rs.getString("assigned_to"));
        complaint.setPriority(rs.getString("priority"));
        complaint.setEscalationCount(rs.getInt("escalation_count"));

        Date dDate = rs.getDate("due_date");
        if (dDate != null) {
            complaint.setDueDate(dDate.toLocalDate());
        }

        complaint.setAdminNotes(rs.getString("admin_notes"));

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
            room.setRoomNumber(rs.getString("room_number_ref"));
            user.setRoom(room);
        }

        complaint.setUser(user);
        return complaint;
    };

    private static final String BASE_SELECT =
            "SELECT c.id, c.user_id, c.description, c.status, c.created_at, c.room_number, c.item, " +
            "       c.notified_at, c.assigned_to, c.priority, c.escalation_count, c.due_date, c.admin_notes, " +
            "       u.student_id, u.full_name, u.email, u.phone, u.role, u.room_id, " +
            "       r.room_number AS room_number_ref " +
            "FROM complaints c " +
            "JOIN users u ON c.user_id = u.id " +
            "LEFT JOIN rooms r ON u.room_id = r.id ";

    public List<Complaint> findAll() {
        String sql = BASE_SELECT + "ORDER BY c.created_at DESC, c.id DESC";
        return jdbcTemplate.query(sql, complaintRowMapper);
    }

    public Optional<Complaint> findById(Long id) {
        String sql = BASE_SELECT + "WHERE c.id = ?";
        try {
            Complaint complaint = jdbcTemplate.queryForObject(sql, complaintRowMapper, id);
            return Optional.ofNullable(complaint);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Complaint> findByUserId(Long userId) {
        String sql = BASE_SELECT + "WHERE c.user_id = ? ORDER BY c.created_at DESC, c.id DESC";
        return jdbcTemplate.query(sql, complaintRowMapper, userId);
    }

    public Complaint save(Complaint complaint) {
        Long userId = (complaint.getUser() != null) ? complaint.getUser().getId() : null;
        Date cDate = (complaint.getCreatedAt() != null) ? Date.valueOf(complaint.getCreatedAt()) : Date.valueOf(java.time.LocalDate.now());
        Date notDate = (complaint.getNotifiedAt() != null) ? Date.valueOf(complaint.getNotifiedAt()) : null;
        Date dDate = (complaint.getDueDate() != null) ? Date.valueOf(complaint.getDueDate()) : null;

        if (complaint.getId() == null) {
            String sql = "INSERT INTO complaints (user_id, description, status, created_at, room_number, item, " +
                         "                       notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                if (userId != null) {
                    ps.setLong(1, userId);
                } else {
                    ps.setNull(1, Types.BIGINT);
                }
                ps.setString(2, complaint.getDescription());
                ps.setString(3, complaint.getStatus());
                ps.setDate(4, cDate);
                ps.setString(5, complaint.getRoomNumber());
                ps.setString(6, complaint.getItem());
                ps.setDate(7, notDate);
                ps.setString(8, complaint.getAssignedTo());
                ps.setString(9, complaint.getPriority() != null ? complaint.getPriority() : "NORMAL");
                ps.setInt(10, complaint.getEscalationCount() != null ? complaint.getEscalationCount() : 0);
                ps.setDate(11, dDate);
                ps.setString(12, complaint.getAdminNotes());
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                complaint.setId(keyHolder.getKey().longValue());
            }
            return complaint;
        } else {
            String sql = "UPDATE complaints SET description = ?, status = ?, created_at = ?, room_number = ?, item = ?, " +
                         "                      notified_at = ?, assigned_to = ?, priority = ?, escalation_count = ?, " +
                         "                      due_date = ?, admin_notes = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    complaint.getDescription(),
                    complaint.getStatus(),
                    cDate,
                    complaint.getRoomNumber(),
                    complaint.getItem(),
                    notDate,
                    complaint.getAssignedTo(),
                    complaint.getPriority(),
                    complaint.getEscalationCount(),
                    dDate,
                    complaint.getAdminNotes(),
                    complaint.getId()
            );
            return complaint;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM complaints WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_FileStudentComplaint' with ACID transaction and audit log.
     *
     * @param studentId Registration index of the student.
     * @param roomNumber Student room identifier.
     * @param item Defective equipment item.
     * @param description Issue description.
     * @return Generated primary key complaint ID.
     */
    public Long callFileStudentComplaintProcedure(String studentId, String roomNumber, String item, String description) {
        return jdbcTemplate.execute("{CALL sp_FileStudentComplaint(?, ?, ?, ?, ?)}", (CallableStatementCallback<Long>) cs -> {
            cs.setString(1, studentId);
            cs.setString(2, roomNumber);
            cs.setString(3, item);
            cs.setString(4, description);
            cs.registerOutParameter(5, Types.BIGINT);
            cs.execute();
            return cs.getLong(5);
        });
    }
}
