package com.ruhuna.hms.repository;

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

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * User Accounts & Resident Directory Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries and invokes Stored Procedures:
 * - 'sp_AllocateStudentRoom' (ACID room allocation with audit logging)
 * - 'sp_DeallocateStudentRoom' (ACID room clearance with audit logging)
 * Optimized via composite performance indexes:
 * - 'idx_users_student_id' on (student_id)
 * - 'idx_users_room_role' on (room_id, role)
 * ============================================================================
 */
@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<User> userRowMapper = (rs, rowNum) -> {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setStudentId(rs.getString("student_id"));
        user.setFullName(rs.getString("full_name"));
        user.setPassword(rs.getString("password"));
        user.setEmail(rs.getString("email"));
        user.setPhone(rs.getString("phone"));
        user.setRole(rs.getString("role"));

        long roomId = rs.getLong("room_id");
        if (!rs.wasNull()) {
            Room room = new Room();
            room.setId(roomId);
            room.setRoomNumber(rs.getString("room_number"));
            room.setBlockName(rs.getString("block_name"));
            room.setCapacity(rs.getInt("capacity"));
            room.setCurrentOccupancy(rs.getInt("current_occupancy"));
            user.setRoom(room);
        }
        return user;
    };

    private static final String BASE_SELECT =
            "SELECT u.id, u.student_id, u.full_name, u.password, u.email, u.phone, u.role, u.room_id, " +
            "       r.room_number, r.block_name, r.capacity, r.current_occupancy " +
            "FROM users u " +
            "LEFT JOIN rooms r ON u.room_id = r.id ";

    public List<User> findAll() {
        String sql = BASE_SELECT + "ORDER BY u.id ASC";
        return jdbcTemplate.query(sql, userRowMapper);
    }

    public Optional<User> findById(Long id) {
        String sql = BASE_SELECT + "WHERE u.id = ?";
        try {
            User user = jdbcTemplate.queryForObject(sql, userRowMapper, id);
            return Optional.ofNullable(user);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public User findByStudentId(String studentId) {
        String sql = BASE_SELECT + "WHERE u.student_id = ?";
        try {
            return jdbcTemplate.queryForObject(sql, userRowMapper, studentId);
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    public List<User> findByRole(String role) {
        String sql = BASE_SELECT + "WHERE u.role = ? ORDER BY u.full_name ASC";
        return jdbcTemplate.query(sql, userRowMapper, role);
    }

    public User save(User user) {
        Long roomId = (user.getRoom() != null) ? user.getRoom().getId() : null;

        if (user.getId() == null) {
            String sql = "INSERT INTO users (student_id, full_name, password, email, phone, role, room_id) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, user.getStudentId());
                ps.setString(2, user.getFullName());
                ps.setString(3, user.getPassword());
                ps.setString(4, user.getEmail());
                ps.setString(5, user.getPhone());
                ps.setString(6, user.getRole());
                if (roomId != null) {
                    ps.setLong(7, roomId);
                } else {
                    ps.setNull(7, Types.BIGINT);
                }
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                user.setId(keyHolder.getKey().longValue());
            }
            return user;
        } else {
            String sql = "UPDATE users SET student_id = ?, full_name = ?, password = ?, email = ?, phone = ?, role = ?, room_id = ? " +
                         "WHERE id = ?";
            jdbcTemplate.update(sql,
                    user.getStudentId(),
                    user.getFullName(),
                    user.getPassword(),
                    user.getEmail(),
                    user.getPhone(),
                    user.getRole(),
                    roomId,
                    user.getId()
            );
            return user;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM users WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_AllocateStudentRoom' with ACID transaction boundary.
     *
     * @param studentId Registration index of the student.
     * @param roomNumber Target room identifier (e.g. "A-101").
     * @return Output status string returned by procedure.
     */
    public String callAllocateStudentRoomProcedure(String studentId, String roomNumber) {
        return jdbcTemplate.execute("{CALL sp_AllocateStudentRoom(?, ?, ?)}", (CallableStatementCallback<String>) cs -> {
            cs.setString(1, studentId);
            cs.setString(2, roomNumber);
            cs.registerOutParameter(3, Types.VARCHAR);
            cs.execute();
            return cs.getString(3);
        });
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_DeallocateStudentRoom' with ACID transaction boundary.
     *
     * @param studentId Registration index of the student.
     * @return Output status string returned by procedure.
     */
    public String callDeallocateStudentRoomProcedure(String studentId) {
        return jdbcTemplate.execute("{CALL sp_DeallocateStudentRoom(?, ?)}", (CallableStatementCallback<String>) cs -> {
            cs.setString(1, studentId);
            cs.registerOutParameter(2, Types.VARCHAR);
            cs.execute();
            return cs.getString(2);
        });
    }
}
