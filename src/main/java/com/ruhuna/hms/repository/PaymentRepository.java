package com.ruhuna.hms.repository;

import com.ruhuna.hms.entity.Payment;
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
 * Payment & Treasury Data Access Repository (Pure SQL / JDBC DAO)
 * ============================================================================
 * Implements pure parameterized SQL queries and invokes Stored Procedures:
 * - 'sp_RecordStudentPayment' (Atomic payment insert + audit log)
 * - 'fn_CalculateMonthlyTotalRevenue' (Stored function for financial totals)
 * - 'vw_MonthlyRevenueSummary' (Analytical view for treasury reporting)
 * Indexes utilized:
 * - 'idx_payments_month_status' on (month, status)
 * - 'idx_payments_user_date' on (user_id, payment_date)
 * ============================================================================
 */
@Repository
public class PaymentRepository {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public PaymentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Payment> paymentRowMapper = (rs, rowNum) -> {
        Payment payment = new Payment();
        payment.setId(rs.getLong("id"));
        payment.setInvoiceNo(rs.getString("invoice_no"));
        payment.setAmount(rs.getDouble("amount"));
        payment.setMonth(rs.getString("month"));
        payment.setStatus(rs.getString("status"));

        Date pDate = rs.getDate("payment_date");
        if (pDate != null) {
            payment.setPaymentDate(pDate.toLocalDate());
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
            room.setBlockName(rs.getString("block_name"));
            user.setRoom(room);
        }

        payment.setUser(user);
        return payment;
    };

    private static final String BASE_SELECT =
            "SELECT p.id, p.invoice_no, p.amount, p.month, p.status, p.payment_date, p.user_id, " +
            "       u.student_id, u.full_name, u.email, u.phone, u.role, u.room_id, " +
            "       r.room_number, r.block_name " +
            "FROM payments p " +
            "JOIN users u ON p.user_id = u.id " +
            "LEFT JOIN rooms r ON u.room_id = r.id ";

    public List<Payment> findAll() {
        String sql = BASE_SELECT + "ORDER BY p.id DESC";
        return jdbcTemplate.query(sql, paymentRowMapper);
    }

    public Optional<Payment> findById(Long id) {
        String sql = BASE_SELECT + "WHERE p.id = ?";
        try {
            Payment payment = jdbcTemplate.queryForObject(sql, paymentRowMapper, id);
            return Optional.ofNullable(payment);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public List<Payment> findByUserId(Long userId) {
        String sql = BASE_SELECT + "WHERE p.user_id = ? ORDER BY p.payment_date DESC, p.id DESC";
        return jdbcTemplate.query(sql, paymentRowMapper, userId);
    }

    public Payment save(Payment payment) {
        Long userId = (payment.getUser() != null) ? payment.getUser().getId() : null;
        Date pDate = (payment.getPaymentDate() != null) ? Date.valueOf(payment.getPaymentDate()) : Date.valueOf(java.time.LocalDate.now());

        if (payment.getId() == null) {
            String sql = "INSERT INTO payments (invoice_no, user_id, amount, month, status, payment_date) " +
                         "VALUES (?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, payment.getInvoiceNo());
                if (userId != null) {
                    ps.setLong(2, userId);
                } else {
                    ps.setNull(2, Types.BIGINT);
                }
                ps.setDouble(3, payment.getAmount());
                ps.setString(4, payment.getMonth());
                ps.setString(5, payment.getStatus());
                ps.setDate(6, pDate);
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                payment.setId(keyHolder.getKey().longValue());
            }
            return payment;
        } else {
            String sql = "UPDATE payments SET invoice_no = ?, amount = ?, month = ?, status = ?, payment_date = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    payment.getInvoiceNo(),
                    payment.getAmount(),
                    payment.getMonth(),
                    payment.getStatus(),
                    pDate,
                    payment.getId()
            );
            return payment;
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM payments WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    /**
     * Executes ADBMS Stored Procedure 'sp_RecordStudentPayment' with ACID transactions.
     *
     * @param studentId Student registration number.
     * @param month Billing month.
     * @param amount Settled currency amount in LKR.
     * @return Generated invoice number or error message.
     */
    public String callRecordPaymentProcedure(String studentId, String month, double amount) {
        return jdbcTemplate.execute("{CALL sp_RecordStudentPayment(?, ?, ?, ?)}", (CallableStatementCallback<String>) cs -> {
            cs.setString(1, studentId);
            cs.setString(2, month);
            cs.setDouble(3, amount);
            cs.registerOutParameter(4, Types.VARCHAR);
            cs.execute();
            return cs.getString(4);
        });
    }

    /**
     * Calls ADBMS Stored Function 'fn_CalculateMonthlyTotalRevenue'.
     *
     * @param month Target billing month.
     * @return Total collected revenue in LKR.
     */
    public Double callCalculateMonthlyRevenueFunction(String month) {
        String sql = "SELECT fn_CalculateMonthlyTotalRevenue(?)";
        try {
            return jdbcTemplate.queryForObject(sql, Double.class, month);
        } catch (Exception e) {
            return 0.0;
        }
    }
}
