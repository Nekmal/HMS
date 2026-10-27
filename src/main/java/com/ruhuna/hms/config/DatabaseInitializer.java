package com.ruhuna.hms.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * ============================================================================
 * ADBMS Pure SQL Database Schema Initializer (Zero ORM Architecture)
 * ============================================================================
 * Automatically initializes database relational structures without Hibernate:
 * 1. Creates core relational tables with foreign keys and cascade rules.
 * 2. Creates ADBMS audit tables ('user_audit_log', 'payment_audit_log').
 * 3. Creates 8 B-Tree Performance Indexes for accelerated queries.
 * 4. Creates 8 Analytical Reporting Views (vw_StudentRoomDetails, etc.).
 * 5. Seeds prerequisite default admin accounts and initial hostel rooms.
 * ============================================================================
 */
@Component
public class DatabaseInitializer {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeDatabase() {
        log.info(">>> [ADBMS ENGINE] Initializing pure SQL database schema & objects (Zero ORM)...");

        try {
            createTables();
            createIndexes();
            createAnalyticalViews();
            seedDefaultData();
            log.info(">>> [ADBMS ENGINE] Database schema initialization completed successfully.");
        } catch (Exception e) {
            log.warn(">>> [ADBMS ENGINE] Schema initialization warning: {}", e.getMessage());
        }
    }

    private void createTables() {
        // 1. Rooms Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS rooms (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    room_number VARCHAR(50) NOT NULL UNIQUE," +
            "    block_name VARCHAR(50)," +
            "    capacity INT NOT NULL DEFAULT 4," +
            "    current_occupancy INT NOT NULL DEFAULT 0" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 2. Users Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS users (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    student_id VARCHAR(50) NOT NULL UNIQUE," +
            "    full_name VARCHAR(100)," +
            "    password VARCHAR(255)," +
            "    email VARCHAR(100)," +
            "    phone VARCHAR(20)," +
            "    role VARCHAR(50) NOT NULL," +
            "    room_id BIGINT," +
            "    CONSTRAINT fk_users_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 3. Payments Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS payments (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    invoice_no VARCHAR(50) NOT NULL UNIQUE," +
            "    user_id BIGINT NOT NULL," +
            "    amount DOUBLE NOT NULL," +
            "    month VARCHAR(50)," +
            "    status VARCHAR(50)," +
            "    payment_date DATE," +
            "    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 4. Complaints Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS complaints (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    user_id BIGINT NOT NULL," +
            "    description TEXT," +
            "    status VARCHAR(50)," +
            "    created_at DATE," +
            "    room_number VARCHAR(50)," +
            "    item VARCHAR(100)," +
            "    notified_at DATE," +
            "    assigned_to VARCHAR(100)," +
            "    priority VARCHAR(50) DEFAULT 'NORMAL'," +
            "    escalation_count INT DEFAULT 0," +
            "    due_date DATE," +
            "    admin_notes TEXT," +
            "    CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 5. Gate Passes Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS gate_passes (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    user_id BIGINT NOT NULL," +
            "    reason TEXT," +
            "    from_date DATE," +
            "    to_date DATE," +
            "    status VARCHAR(50) DEFAULT 'PENDING'," +
            "    CONSTRAINT fk_gatepasses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 6. Inventory Catalog Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS inventory (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    item_name VARCHAR(100) NOT NULL," +
            "    total_quantity INT NOT NULL DEFAULT 0," +
            "    available_quantity INT NOT NULL DEFAULT 0," +
            "    broken_quantity INT NOT NULL DEFAULT 0," +
            "    category VARCHAR(50)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 7. Room Inventory Damage Junction Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS room_inventory (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    room_id BIGINT NOT NULL," +
            "    inventory_id BIGINT NOT NULL," +
            "    broken_quantity INT NOT NULL DEFAULT 0," +
            "    damage_description VARCHAR(500)," +
            "    status VARCHAR(50)," +
            "    reported_date DATE," +
            "    CONSTRAINT fk_ri_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE," +
            "    CONSTRAINT fk_ri_inv FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 8. Notices Bulletin Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS notices (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    title VARCHAR(255) NOT NULL," +
            "    content TEXT," +
            "    date_posted DATE," +
            "    target_audience VARCHAR(50) DEFAULT 'ALL'" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 9. Staff Attendance Duty Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS staff_attendance (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    user_id BIGINT NOT NULL," +
            "    date DATE NOT NULL," +
            "    status VARCHAR(50) NOT NULL," +
            "    check_in_time VARCHAR(50)," +
            "    check_out_time VARCHAR(50)," +
            "    marked_by VARCHAR(50)," +
            "    remarks VARCHAR(500)," +
            "    CONSTRAINT fk_sa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 10. User Audit Log Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS user_audit_log (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    user_id BIGINT," +
            "    action_type VARCHAR(50)," +
            "    old_value TEXT," +
            "    new_value TEXT," +
            "    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
            "    performed_by VARCHAR(100) DEFAULT 'SYSTEM'" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 11. Payment Audit Log Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS payment_audit_log (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    payment_id BIGINT," +
            "    invoice_no VARCHAR(50)," +
            "    student_id VARCHAR(50)," +
            "    amount DECIMAL(10,2)," +
            "    action_type VARCHAR(50)," +
            "    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 12. Hostel Daily Stats Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS hostel_daily_stats (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    stat_date DATE," +
            "    block_name VARCHAR(50)," +
            "    occupied_beds INT," +
            "    total_capacity INT," +
            "    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        // 13. Inventory Alert Log Table
        jdbcTemplate.execute(
            "CREATE TABLE IF NOT EXISTS inventory_alert_log (" +
            "    id BIGINT AUTO_INCREMENT PRIMARY KEY," +
            "    item_id BIGINT," +
            "    item_name VARCHAR(100)," +
            "    available_qty INT," +
            "    alert_message TEXT," +
            "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    private void createIndexes() {
        safeExecute("CREATE INDEX idx_users_student_id ON users(student_id)");
        safeExecute("CREATE INDEX idx_users_room_role ON users(room_id, role)");
        safeExecute("CREATE INDEX idx_gate_passes_user_status ON gate_passes(user_id, status)");
        safeExecute("CREATE INDEX idx_complaints_status_room ON complaints(status, room_number)");
        safeExecute("CREATE INDEX idx_payments_month_status ON payments(month, status)");
        safeExecute("CREATE INDEX idx_payments_user_date ON payments(user_id, payment_date)");
        safeExecute("CREATE INDEX idx_inventory_category_avail ON inventory(category, available_quantity)");
        safeExecute("CREATE INDEX idx_staff_att_user_date ON staff_attendance(user_id, date, status)");
    }

    private void createAnalyticalViews() {
        // View 1: Student Room Details (joins users, rooms, payments, complaints)
        safeExecute(
            "CREATE OR REPLACE VIEW vw_StudentRoomDetails AS " +
            "SELECT u.id AS user_id, u.student_id, u.full_name AS student_name, u.email, u.phone, " +
            "       IFNULL(r.room_number, 'UNALLOCATED') AS room_number, " +
            "       IFNULL(r.block_name, 'No Block') AS block_name, " +
            "       IFNULL(r.capacity, 0) AS room_capacity, " +
            "       IFNULL(r.current_occupancy, 0) AS room_occupancy, " +
            "       IFNULL(p_agg.total_paid_lkr, 0.0) AS total_fee_paid_lkr, " +
            "       IFNULL(p_agg.payment_records_count, 0) AS total_payments_made, " +
            "       IFNULL(c_agg.total_complaints, 0) AS total_complaints_filed, " +
            "       IFNULL(c_agg.pending_complaints, 0) AS unresolved_complaints " +
            "FROM users u " +
            "LEFT JOIN rooms r ON u.room_id = r.id " +
            "LEFT JOIN (SELECT user_id, SUM(amount) AS total_paid_lkr, COUNT(id) AS payment_records_count FROM payments WHERE status = 'PAID' GROUP BY user_id) p_agg ON u.id = p_agg.user_id " +
            "LEFT JOIN (SELECT user_id, COUNT(id) AS total_complaints, SUM(CASE WHEN status <> 'RESOLVED' THEN 1 ELSE 0 END) AS pending_complaints FROM complaints GROUP BY user_id) c_agg ON u.id = c_agg.user_id " +
            "WHERE u.role = 'STUDENT'"
        );

        // View 2: Active Gate Passes (joins gate_passes, users, rooms)
        safeExecute(
            "CREATE OR REPLACE VIEW vw_ActiveGatePasses AS " +
            "SELECT gp.id AS pass_id, u.student_id, u.full_name AS student_name, u.phone AS contact_number, " +
            "       IFNULL(r.room_number, '-') AS room_number, IFNULL(r.block_name, '-') AS block_name, " +
            "       gp.reason, gp.from_date AS departure_date, gp.to_date AS expected_return_date, " +
            "       DATEDIFF(gp.to_date, gp.from_date) AS leave_duration_days, gp.status AS pass_status " +
            "FROM gate_passes gp " +
            "JOIN users u ON gp.user_id = u.id " +
            "LEFT JOIN rooms r ON u.room_id = r.id"
        );

        // View 3: Monthly Revenue Summary (joins payments, users, rooms)
        safeExecute(
            "CREATE OR REPLACE VIEW vw_MonthlyRevenueSummary AS " +
            "SELECT p.month AS billing_month, IFNULL(r.block_name, 'General Student Body') AS hostel_block, " +
            "       COUNT(p.id) AS total_invoices_issued, " +
            "       SUM(CASE WHEN p.status = 'PAID' THEN 1 ELSE 0 END) AS paid_invoices_count, " +
            "       SUM(CASE WHEN p.status <> 'PAID' THEN 1 ELSE 0 END) AS pending_invoices_count, " +
            "       IFNULL(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0.0) AS total_revenue_collected_lkr " +
            "FROM payments p " +
            "JOIN users u ON p.user_id = u.id " +
            "LEFT JOIN rooms r ON u.room_id = r.id " +
            "GROUP BY p.month, r.block_name"
        );

        // View 4: Inventory Health Status (joins inventory, room_inventory, complaints)
        safeExecute(
            "CREATE OR REPLACE VIEW vw_InventoryHealthStatus AS " +
            "SELECT inv.id AS item_id, inv.item_name, inv.category, inv.total_quantity, inv.available_quantity, " +
            "       inv.broken_quantity AS warehouse_broken_qty, " +
            "       IFNULL(ri_agg.room_damages_count, 0) AS total_room_incidents, " +
            "       IFNULL(ri_agg.total_broken_in_rooms, 0) AS total_broken_in_rooms " +
            "FROM inventory inv " +
            "LEFT JOIN (SELECT inventory_id, COUNT(id) AS room_damages_count, SUM(broken_quantity) AS total_broken_in_rooms FROM room_inventory WHERE status = 'BROKEN' GROUP BY inventory_id) ri_agg ON inv.id = ri_agg.inventory_id"
        );

        // View 5: Room Damages Tracker (joins room_inventory, rooms, inventory)
        safeExecute(
            "CREATE OR REPLACE VIEW vw_RoomDamagesTracker AS " +
            "SELECT ri.id AS damage_id, r.room_number, r.block_name, inv.item_name AS equipment_name, " +
            "       inv.category AS equipment_category, ri.broken_quantity, inv.available_quantity AS warehouse_spare_stock, " +
            "       ri.damage_description, ri.reported_date, ri.status AS repair_status " +
            "FROM room_inventory ri " +
            "JOIN rooms r ON ri.room_id = r.id " +
            "JOIN inventory inv ON ri.inventory_id = inv.id"
        );

        // View 6: Staff Duty Attendance Summary
        safeExecute(
            "CREATE OR REPLACE VIEW vw_StaffDutyAttendanceSummary AS " +
            "SELECT u.id AS staff_user_id, u.student_id AS staff_emp_id, u.full_name AS staff_name, u.role AS staff_department, " +
            "       COUNT(DISTINCT sa.id) AS total_shifts_logged, " +
            "       SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_shifts, " +
            "       SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_shifts " +
            "FROM users u " +
            "LEFT JOIN staff_attendance sa ON u.id = sa.user_id " +
            "WHERE u.role IN ('SECURITY', 'MAINTENANCE', 'CLEANING') " +
            "GROUP BY u.id, u.student_id, u.full_name, u.role"
        );
    }

    private void seedDefaultData() {
        // Seed default admin account if not present
        Integer adminCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE student_id = 'admin'", Integer.class);
        if (adminCount == null || adminCount == 0) {
            jdbcTemplate.update(
                "INSERT INTO users (student_id, full_name, password, email, phone, role) " +
                "VALUES ('admin', 'System Administrator', 'admin123', 'admin@ruhuna.ac.lk', '0771234567', 'ADMIN')"
            );
            log.info(">>> [ADBMS ENGINE] Default administrator seeded: admin / admin123");
        }

        // Seed default staff accounts if not present
        seedUserIfNotExists("SEC001", "Chief Security Officer", "sec123", "sec@ruhuna.ac.lk", "0770000001", "SECURITY");
        seedUserIfNotExists("MNT001", "Sunil Rathnayake (Maintenance)", "mnt123", "mnt@ruhuna.ac.lk", "0770000002", "MAINTENANCE");
        seedUserIfNotExists("CLN001", "Kamala Perera (Housekeeping)", "cln123", "cln@ruhuna.ac.lk", "0770000003", "CLEANING");

        // Seed default rooms across blocks if rooms table is empty
        Integer roomCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM rooms", Integer.class);
        if (roomCount == null || roomCount == 0) {
            String[] blocks = {"Block A", "Block B", "Block C", "Block D"};
            for (String block : blocks) {
                String prefix = block.substring(6, 7);
                for (int floor = 1; floor <= 3; floor++) {
                    for (int roomNum = 1; roomNum <= 4; roomNum++) {
                        String rNo = prefix + "-" + floor + "0" + roomNum;
                        jdbcTemplate.update("INSERT INTO rooms (room_number, block_name, capacity, current_occupancy) VALUES (?, ?, 4, 0)", rNo, block);
                    }
                }
            }
            log.info(">>> [ADBMS ENGINE] Standard hostel rooms seeded across Blocks A, B, C, D.");
        }

        // Seed master warehouse inventory catalog if empty
        Integer invCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM inventory", Integer.class);
        if (invCount == null || invCount == 0) {
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Study Desk", 100, 95, 5, "Furniture");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Wooden Chair", 150, 140, 10, "Furniture");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Ceiling Fan", 80, 75, 5, "Electrical");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "LED Tube Light", 200, 185, 15, "Electrical");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Water Tap Fixture", 60, 52, 8, "Plumbing");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Bed Mattress", 120, 118, 2, "Bedding");
            log.info(">>> [ADBMS ENGINE] Warehouse master stock catalog seeded.");
        }
    }

    private void seedUserIfNotExists(String studentId, String name, String password, String email, String phone, String role) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE student_id = ?", Integer.class, studentId);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                "INSERT INTO users (student_id, full_name, password, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)",
                studentId, name, password, email, phone, role
            );
        }
    }

    private void safeExecute(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            // Ignore if index or view already exists or minor syntax warning in dialect
            log.debug("Notice on executing SQL [{}]: {}", sql, e.getMessage());
        }
    }
}
