package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.StaffAttendance;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * Staff Duty Shift Attendance Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries and invokes Stored Procedures/UDFs:
 * - 'sp_RecordStaffCheckIn' (Atomic check-in and supervisor audit log)
 * - 'fn_GetStaffMonthlyPresentDays' (UDF for monthly duty statistics)
 * - 'vw_StaffDutyAttendanceSummary' (Analytical shift reporting view)
 * Enforces trigger 'trg_BeforeStaffCheckOutUpdate'.
 * Index utilized:
 * - 'idx_staff_att_user_date' on (user_id, date, status)
 * ============================================================================
 */
@Repository
public class StaffAttendanceRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public StaffAttendanceRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<StaffAttendance> attendanceRowMapper = (rs, rowNum) -> {
        StaffAttendance att = new StaffAttendance();
        att.setId(rs.getLong("id"));

        Date aDate = rs.getDate("date");
        if (aDate != null) {
            att.setDate(aDate.toLocalDate());
        }

        att.setStatus(rs.getString("status"));
        att.setCheckInTime(rs.getString("check_in_time"));
        att.setCheckOutTime(rs.getString("check_out_time"));
        att.setMarkedBy(rs.getString("marked_by"));
        att.setRemarks(rs.getString("remarks"));

        User staff = new User();
        staff.setId(rs.getLong("user_id"));
        staff.setStudentId(rs.getString("student_id"));
        staff.setFullName(rs.getString("full_name"));
        staff.setRole(rs.getString("role"));
        staff.setEmail(rs.getString("email"));
        staff.setPhone(rs.getString("phone"));
        att.setStaff(staff);

        return att;
    };

    private static final String BASE_SELECT =
            "SELECT sa.id, sa.user_id, sa.date, sa.status, sa.check_in_time, sa.check_out_time, sa.marked_by, sa.remarks, " +
            "       u.student_id, u.full_name, u.role, u.email, u.phone " +
            "FROM staff_attendance sa " +
            "JOIN users u ON sa.user_id = u.id ";

    public List<StaffAttendance> findAll() {
        String sql = BASE_SELECT + "ORDER BY sa.date DESC, sa.id DESC";
        return jdbcTemplate.query(sql, attendanceRowMapper);
    }

    public Optional<StaffAttendance> findById(Long id) {
        String sql = BASE_SELECT + "WHERE sa.id = ?";
        try {
            StaffAttendance att = jdbcTemplate.queryForObject(sql, attendanceRowMapper, id);
            return Optional.ofNullable(att);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<StaffAttendance> findByStaffIdOrderByDateDesc(Long staffId) {
        String sql = BASE_SELECT + "WHERE sa.user_id = ? ORDER BY sa.date DESC, sa.id DESC";
        return jdbcTemplate.query(sql, attendanceRowMapper, staffId);
    }

    public List<StaffAttendance> findByDate(LocalDate date) {
        String sql = BASE_SELECT + "WHERE sa.date = ? ORDER BY sa.id DESC";
        return jdbcTemplate.query(sql, attendanceRowMapper, Date.valueOf(date));
    }

    public Optional<StaffAttendance> findByStaffIdAndDate(Long staffId, LocalDate date) {
        String sql = BASE_SELECT + "WHERE sa.user_id = ? AND sa.date = ? LIMIT 1";
        try {
            StaffAttendance att = jdbcTemplate.queryForObject(sql, attendanceRowMapper, staffId, Date.valueOf(date));
            return Optional.ofNullable(att);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<StaffAttendance> findByStaffRole(String role) {
        String sql = BASE_SELECT + "WHERE u.role = ? ORDER BY sa.date DESC, sa.id DESC";
        return jdbcTemplate.query(sql, attendanceRowMapper, role);
    }

    public StaffAttendance save(StaffAttendance att) {
        Long userId = (att.getStaff() != null) ? att.getStaff().getId() : null;
        Date aDate = (att.getDate() != null) ? Date.valueOf(att.getDate()) : Date.valueOf(java.time.LocalDate.now());

        if (att.getId() == null) {
            String sql = "INSERT INTO staff_attendance (user_id, date, status, check_in_time, check_out_time, marked_by, remarks) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                if (userId != null) {
                    ps.setLong(1, userId);
                } else {
                    ps.setNull(1, Types.BIGINT);
                }
                ps.setDate(2, aDate);
                ps.setString(3, att.getStatus() != null ? att.getStatus() : "PRESENT");
                ps.setString(4, att.getCheckInTime());
                ps.setString(5, att.getCheckOutTime());
                ps.setString(6, att.getMarkedBy() != null ? att.getMarkedBy() : "STAFF");
                ps.setString(7, att.getRemarks());
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                att.setId(keyHolder.getKey().longValue());
            }
            return att;
        } else {
            String sql = "UPDATE staff_attendance SET date = ?, status = ?, check_in_time = ?, check_out_time = ?, " +
                         "                            marked_by = ?, remarks = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    aDate,
                    att.getStatus(),
                    att.getCheckInTime(),
                    att.getCheckOutTime(),
                    att.getMarkedBy(),
                    att.getRemarks(),
                    att.getId()
            );
            return att;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM staff_attendance WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_RecordStaffCheckIn' with ACID transaction and audit trail.
     *
     * @param staffId Staff registration/username string (e.g. "SEC001").
     * @param markedBy Staff self check-in or supervisor username.
     * @return Confirmation status string.
     */
    public String callRecordStaffCheckInProcedure(String staffId, String markedBy) {
        return jdbcTemplate.execute("{CALL sp_RecordStaffCheckIn(?, ?, ?)}", (CallableStatementCallback<String>) cs -> {
            cs.setString(1, staffId);
            cs.setString(2, markedBy);
            cs.registerOutParameter(3, Types.VARCHAR);
            cs.execute();
            return cs.getString(3);
        });
    }

    /**
     * Calls ADBMS Stored Function 'fn_GetStaffMonthlyPresentDays'.
     *
     * @param userId Primary key ID of the staff user.
     * @param monthYear Year-Month string (e.g. "2026-10").
     * @return Number of present duty days for the month.
     */
    public Integer callGetStaffMonthlyPresentDaysFunction(Long userId, String monthYear) {
        String sql = "SELECT fn_GetStaffMonthlyPresentDays(?, ?)";
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, userId, monthYear);
        } catch (Exception e) {
            return 0;
        }
    }
}
