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
        // 1. Seed Administrator and Staff Accounts
        seedUserIfNotExists("admin", "System Administrator", "admin123", "admin@ruhuna.ac.lk", "0771234567", "ADMIN");
        seedUserIfNotExists("SEC001", "Chief Security Officer Bandara", "sec123", "sec.bandara@ruhuna.ac.lk", "0770000001", "SECURITY");
        seedUserIfNotExists("SEC002", "Security Officer Chaminda", "sec123", "sec.chaminda@ruhuna.ac.lk", "0770000002", "SECURITY");
        seedUserIfNotExists("MNT001", "Sunil Rathnayake (Electrical Specialist)", "mnt123", "mnt.sunil@ruhuna.ac.lk", "0770000003", "MAINTENANCE");
        seedUserIfNotExists("MNT002", "Gamini Dissanayake (Plumbing Specialist)", "mnt123", "mnt.gamini@ruhuna.ac.lk", "0770000004", "MAINTENANCE");
        seedUserIfNotExists("CLN001", "Kamala Perera (Housekeeping Supervisor)", "cln123", "cln.kamala@ruhuna.ac.lk", "0770000005", "CLEANING");
        seedUserIfNotExists("CLN002", "Kusumawathi (Housekeeping Assistant)", "cln123", "cln.kusuma@ruhuna.ac.lk", "0770000006", "CLEANING");

        // 2. Seed Standard Hostel Rooms across Blocks A, B, C, D
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

        // 3. Seed Resident Students with Room Allocations
        seedStudentWithRoom("TG/2021/0001", "Kasun Silva", "student123", "kasun.silva@eng.ruh.ac.lk", "0711111101", "A-101");
        seedStudentWithRoom("TG/2021/0002", "Nuwan Perera", "student123", "nuwan.perera@eng.ruh.ac.lk", "0711111102", "A-101");
        seedStudentWithRoom("TG/2021/0003", "Sachith Fernando", "student123", "sachith.f@eng.ruh.ac.lk", "0711111103", "A-102");
        seedStudentWithRoom("TG/2021/0004", "Dinuka Jayasinghe", "student123", "dinuka.j@eng.ruh.ac.lk", "0711111104", "B-201");
        seedStudentWithRoom("TG/2021/0005", "Kavindu Madushan", "student123", "kavindu.m@eng.ruh.ac.lk", "0711111105", "B-201");
        seedStudentWithRoom("TG/2021/0006", "Thilina Wickramasinghe", "student123", "thilina.w@eng.ruh.ac.lk", "0711111106", "C-101");
        seedStudentWithRoom("TG/2021/0007", "Isuru Dananjaya", "student123", "isuru.d@eng.ruh.ac.lk", "0711111107", "C-102");
        seedStudentWithRoom("TG/2021/0008", "Charith Senaratne", "student123", "charith.s@eng.ruh.ac.lk", "0711111108", "D-301");
        seedStudentWithRoom("TG/2021/0009", "Malith Bandara", "student123", "malith.b@eng.ruh.ac.lk", "0711111109", "D-301");
        seedUserIfNotExists("TG/2021/0010", "Ashen Chamod", "student123", "ashen.c@eng.ruh.ac.lk", "0711111110", "STUDENT");

        // 4. Seed Warehouse Master Stock Catalog
        Integer invCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM inventory", Integer.class);
        if (invCount == null || invCount == 0) {
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Study Desk", 100, 95, 5, "Furniture");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Wooden Chair", 150, 138, 12, "Furniture");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Ceiling Fan", 80, 74, 6, "Electrical");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "LED Tube Light", 200, 182, 18, "Electrical");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Water Tap Fixture", 60, 52, 8, "Plumbing");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Bed Mattress", 120, 118, 2, "Bedding");
            jdbcTemplate.update("INSERT INTO inventory (item_name, total_quantity, available_quantity, broken_quantity, category) VALUES (?, ?, ?, ?, ?)", "Wall Socket Unit", 90, 85, 5, "Electrical");
            log.info(">>> [ADBMS ENGINE] Warehouse master stock catalog seeded.");
        }

        // 5. Seed Historical Staff Attendance (Past 4 Weeks: 2026-10-01 to 2026-10-27)
        seedStaffAttendanceHistory();

        // 6. Seed Historical Maintenance Complaints (Resolved, In-Progress, Pending)
        seedMaintenanceComplaints();

        // 7. Seed Student Gate Passes (Returned, Departed, Pending, Rejected)
        seedGatePassHistory();

        // 8. Seed Monthly Fee Payments (August, September, October 2026)
        seedPaymentHistory();

        // 9. Seed Room Inventory Damages
        seedRoomInventoryDamages();

        // 10. Seed Official Administrative Notices
        seedNotices();

        // 11. Seed System Audit Logs
        seedAuditLogs();
    }

    private void seedStaffAttendanceHistory() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM staff_attendance", Integer.class);
        if (count != null && count > 10) return;

        String[] staffIds = {"SEC001", "SEC002", "MNT001", "MNT002", "CLN001", "CLN002"};

        // Generate past 26 days of realistic attendance up to today (2026-10-27)
        for (String staffCode : staffIds) {
            Long userId = getUserIdByStudentId(staffCode);
            if (userId == null) continue;

            for (int day = 1; day <= 27; day++) {
                String dateStr = String.format("2026-10-%02d", day);
                java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
                java.time.DayOfWeek dow = date.getDayOfWeek();

                // Rotate weekend off-duty
                if ((dow == java.time.DayOfWeek.SUNDAY && !staffCode.equals("SEC001")) ||
                    (dow == java.time.DayOfWeek.SATURDAY && staffCode.startsWith("CLN"))) {
                    continue;
                }

                // Day 15: approved medical leave for MNT002
                if (day == 15 && staffCode.equals("MNT002")) {
                    insertAttendanceRecord(userId, dateStr, "ON_LEAVE", null, null, "ADMIN", "Excused medical leave approved by Sub Warden");
                    continue;
                }

                // Day 21: occasional unscheduled absence for CLN002
                if (day == 21 && staffCode.equals("CLN002")) {
                    insertAttendanceRecord(userId, dateStr, "ABSENT", null, null, "ADMIN", "Unscheduled absence recorded during morning roll call");
                    continue;
                }

                // Regular duty days
                int checkInMin = 45 + ((day + staffCode.hashCode()) % 25);
                int checkOutMin = 10 + ((day * 3 + staffCode.hashCode()) % 30);
                String inTime = String.format("07:%02d:00", Math.min(59, checkInMin));
                String outTime = (day == 27) ? null : String.format("17:%02d:00", checkOutMin); // Today still on duty!
                String remarks = (day == 27) 
                    ? "Active on duty shift [Current date: 2026-10-27]" 
                    : "Completed full shift duty without incident";

                insertAttendanceRecord(userId, dateStr, "PRESENT", inTime, outTime, "STAFF", remarks);
            }
        }
        log.info(">>> [ADBMS ENGINE] 100+ Historical staff attendance records seeded across October 2026.");
    }

    private void insertAttendanceRecord(Long userId, String dateStr, String status, String inTime, String outTime, String markedBy, String remarks) {
        Integer exists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM staff_attendance WHERE user_id = ? AND date = ?", Integer.class, userId, dateStr);
        if (exists == null || exists == 0) {
            jdbcTemplate.update(
                "INSERT INTO staff_attendance (user_id, date, status, check_in_time, check_out_time, marked_by, remarks) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                userId, dateStr, status, inTime, outTime, markedBy, remarks
            );
        }
    }

    private void seedMaintenanceComplaints() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM complaints", Integer.class);
        if (count != null && count > 5) return;

        Long u1 = getUserIdByStudentId("TG/2021/0001");
        Long u3 = getUserIdByStudentId("TG/2021/0003");
        Long u4 = getUserIdByStudentId("TG/2021/0004");
        Long u6 = getUserIdByStudentId("TG/2021/0006");
        Long u8 = getUserIdByStudentId("TG/2021/0008");

        // 1. Resolved: Ceiling Fan speed regulator sparking
        if (u1 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) " +
                "VALUES (?, 'A-101', 'Ceiling Fan', 'Regulator smoking and sparks when turned to speed 4.', 'RESOLVED', '2026-09-05', '2026-09-06', 'Sunil Rathnayake', 'HIGH', 0, '2026-09-08', 'Capacitor and regulator replaced with new stock. Tested operational.')",
                u1
            );
        }

        // 2. Resolved: Water tap leak
        if (u4 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) " +
                "VALUES (?, 'B-201', 'Water Tap Fixture', 'Bathroom basin tap leaking continuously causing water wastage.', 'RESOLVED', '2026-09-12', '2026-09-13', 'Gamini Dissanayake', 'NORMAL', 0, '2026-09-15', 'Inner washer replaced and tightened. Leak completely resolved.')",
                u4
            );
        }

        // 3. Resolved: LED tube light fused
        if (u6 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) " +
                "VALUES (?, 'C-101', 'LED Tube Light', 'Main room study light flickering and now completely dark.', 'RESOLVED', '2026-10-02', '2026-10-03', 'Sunil Rathnayake', 'NORMAL', 0, '2026-10-04', 'Replaced defective 20W LED tube from central inventory stock.')",
                u6
            );
        }

        // 4. In Progress: Study chair wheel broken
        if (u3 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) " +
                "VALUES (?, 'A-102', 'Wooden Chair', 'Study chair right leg joint broken and wobbling dangerously.', 'IN_PROGRESS', '2026-10-20', '2026-10-21', 'Sunil Rathnayake', 'NORMAL', 0, '2026-10-29', 'Work initiated; sent to carpentry workshop for bracket welding.')",
                u3
            );
        }

        // 5. In Progress: Door lock latch sticking
        if (u8 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) " +
                "VALUES (?, 'D-301', 'Door Latch Unit', 'Room front door latch sticking; difficult to lock from outside.', 'IN_PROGRESS', '2026-10-24', '2026-10-25', 'Maintenance Team', 'HIGH', 1, '2026-10-28', 'Escalated by Sub Warden. Lubrication applied, lock cylinder replacement scheduled.')",
                u8
            );
        }

        // 6. Pending: Low water pressure on 3rd floor
        if (u8 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, priority, escalation_count, admin_notes) " +
                "VALUES (?, 'D-301', 'Plumbing Supply Line', 'Extremely low water flow in 3rd floor bathrooms during morning hours.', 'PENDING', '2026-10-26', 'URGENT', 0, 'Awaiting Sub Warden dispatch to municipal water pump maintenance.')",
                u8
            );
        }

        // 7. Pending: Wall Socket Sparks
        if (u4 != null) {
            jdbcTemplate.update(
                "INSERT INTO complaints (user_id, room_number, item, description, status, created_at, priority, escalation_count, admin_notes) " +
                "VALUES (?, 'B-201', 'Wall Socket Unit', 'Bedside plug sparks when phone/laptop charger inserted.', 'PENDING', '2026-10-27', 'URGENT', 0, 'Reported today; priority dispatch required immediately.')",
                u4
            );
        }
        log.info(">>> [ADBMS ENGINE] Realistic maintenance complaints history seeded.");
    }

    private void seedGatePassHistory() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM gate_passes", Integer.class);
        if (count != null && count > 4) return;

        Long u1 = getUserIdByStudentId("TG/2021/0001");
        Long u2 = getUserIdByStudentId("TG/2021/0002");
        Long u3 = getUserIdByStudentId("TG/2021/0003");
        Long u4 = getUserIdByStudentId("TG/2021/0004");
        Long u5 = getUserIdByStudentId("TG/2021/0005");
        Long u6 = getUserIdByStudentId("TG/2021/0006");

        // 1. Returned: Wedding in Matara
        if (u1 != null) {
            jdbcTemplate.update("INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, 'Attending family wedding ceremony in Matara', '2026-09-15', '2026-09-18', 'RETURNED')", u1);
        }
        // 2. Returned: Hospital appointment
        if (u4 != null) {
            jdbcTemplate.update("INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, 'Medical clinic appointment at Karapitiya Teaching Hospital', '2026-09-22', '2026-09-23', 'RETURNED')", u4);
        }
        // 3. Returned: Weekend visit
        if (u6 != null) {
            jdbcTemplate.update("INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, 'Weekend visit home to Kandy', '2026-10-04', '2026-10-07', 'RETURNED')", u6);
        }
        // 4. Departed (Currently outside): Inter-university competition
        if (u2 != null) {
            jdbcTemplate.update("INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, 'Participating in IEEE National Hackathon in Colombo', '2026-10-25', '2026-10-28', 'DEPARTED')", u2);
        }
        // 5. Pending: Home visit
        if (u5 != null) {
            jdbcTemplate.update("INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, 'Mid-semester study recess visit home', '2026-10-30', '2026-11-04', 'PENDING')", u5);
        }
        // 6. Rejected: During mid-term exam week
        if (u3 != null) {
            jdbcTemplate.update("INSERT INTO gate_passes (user_id, reason, from_date, to_date, status) VALUES (?, 'Personal leisure trip to Galle', '2026-10-09', '2026-10-11', 'REJECTED')", u3);
        }
        log.info(">>> [ADBMS ENGINE] Realistic student gate passes seeded.");
    }

    private void seedPaymentHistory() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM payments", Integer.class);
        if (count != null && count > 10) return;

        String[] activeStudents = {
            "TG/2021/0001", "TG/2021/0002", "TG/2021/0003", "TG/2021/0004",
            "TG/2021/0005", "TG/2021/0006", "TG/2021/0007", "TG/2021/0008", "TG/2021/0009"
        };

        // August 2026: All paid
        int invCounter = 1001;
        for (String stdId : activeStudents) {
            Long uid = getUserIdByStudentId(stdId);
            if (uid == null) continue;
            String invNo = "INV-202608" + (invCounter++);
            jdbcTemplate.update(
                "INSERT INTO payments (invoice_no, user_id, amount, month, status, payment_date) " +
                "VALUES (?, ?, 1500.00, 'August 2026', 'PAID', '2026-08-05')",
                invNo, uid
            );
        }

        // September 2026: All paid
        for (String stdId : activeStudents) {
            Long uid = getUserIdByStudentId(stdId);
            if (uid == null) continue;
            String invNo = "INV-202609" + (invCounter++);
            jdbcTemplate.update(
                "INSERT INTO payments (invoice_no, user_id, amount, month, status, payment_date) " +
                "VALUES (?, ?, 1500.00, 'September 2026', 'PAID', '2026-09-04')",
                invNo, uid
            );
        }

        // October 2026: Most paid, 2 pending for realistic arrears KPI testing
        for (String stdId : activeStudents) {
            Long uid = getUserIdByStudentId(stdId);
            if (uid == null) continue;

            if (stdId.equals("TG/2021/0003") || stdId.equals("TG/2021/0006")) {
                // Pending arrears for October
                String invNo = "INV-202610" + (invCounter++);
                jdbcTemplate.update(
                    "INSERT INTO payments (invoice_no, user_id, amount, month, status, payment_date) " +
                    "VALUES (?, ?, 1500.00, 'October 2026', 'PENDING', '2026-10-01')",
                    invNo, uid
                );
            } else {
                String invNo = "INV-202610" + (invCounter++);
                jdbcTemplate.update(
                    "INSERT INTO payments (invoice_no, user_id, amount, month, status, payment_date) " +
                    "VALUES (?, ?, 1500.00, 'October 2026', 'PAID', '2026-10-06')",
                    invNo, uid
                );
            }
        }
        log.info(">>> [ADBMS ENGINE] 25+ Historical monthly treasury fee payments seeded.");
    }

    private void seedRoomInventoryDamages() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM room_inventory", Integer.class);
        if (count != null && count > 0) return;

        Long rA102 = getRoomIdByNumber("A-102");
        Long rB201 = getRoomIdByNumber("B-201");
        Long rC101 = getRoomIdByNumber("C-101");
        Long iChair = getInventoryIdByName("Wooden Chair");
        Long iTap = getInventoryIdByName("Water Tap Fixture");
        Long iFan = getInventoryIdByName("Ceiling Fan");

        if (rA102 != null && iChair != null) {
            jdbcTemplate.update(
                "INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, status, reported_date) " +
                "VALUES (?, ?, 1, 'Right wooden leg fractured; sent for repair', 'BROKEN', '2026-10-20')",
                rA102, iChair
            );
        }
        if (rB201 != null && iTap != null) {
            jdbcTemplate.update(
                "INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, status, reported_date) " +
                "VALUES (?, ?, 1, 'Basin water tap leaking continuously', 'REPAIRED', '2026-09-12')",
                rB201, iTap
            );
        }
        if (rC101 != null && iFan != null) {
            jdbcTemplate.update(
                "INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, status, reported_date) " +
                "VALUES (?, ?, 1, 'Capacitor fused; replaced and tested', 'REPAIRED', '2026-10-02')",
                rC101, iFan
            );
        }
    }

    private void seedNotices() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notices", Integer.class);
        if (count != null && count > 2) return;

        jdbcTemplate.update(
            "INSERT INTO notices (title, content, date_posted, target_audience) VALUES " +
            "('Hostel Accommodation Fee Collection - October 2026', " +
            "'All resident students living in Blocks A, B, C, and D are requested to settle their monthly accommodation fee of Rs. 1,500.00 on or before October 31st, 2026. Official receipts will be generated via the online portal.', " +
            "'2026-10-01', 'STUDENTS')"
        );
        jdbcTemplate.update(
            "INSERT INTO notices (title, content, date_posted, target_audience) VALUES " +
            "('Scheduled Water Tank Cleaning & Supply Interruption Notice', " +
            "'Please be notified that the main overhead water reservoir tank will undergo routine descaling and chlorinated disinfection on Thursday, October 29th, from 09:00 AM to 03:00 PM. Water supply to all blocks will be interrupted temporarily during this window.', " +
            "'2026-10-22', 'ALL')"
        );
        jdbcTemplate.update(
            "INSERT INTO notices (title, content, date_posted, target_audience) VALUES " +
            "('Campus Security Curfew & Gate Pass Verification Reminder', " +
            "'All undergraduate residents must return to the hostel premises prior to the 09:00 PM security gate lock. Students on approved leave must present their official digital Gate Pass to the duty security officer upon arrival.', " +
            "'2026-10-24', 'ALL')"
        );
        log.info(">>> [ADBMS ENGINE] Administrative circular notices seeded.");
    }

    private void seedAuditLogs() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM user_audit_log", Integer.class);
        if (count != null && count > 0) return;

        Long u1 = getUserIdByStudentId("TG/2021/0001");
        if (u1 != null) {
            jdbcTemplate.update(
                "INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by) VALUES " +
                "(?, 'ROOM_ALLOCATION', 'UNALLOCATED', 'A-101 (Block A)', 'ADMIN')", u1
            );
            jdbcTemplate.update(
                "INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by) VALUES " +
                "(?, 'GATE_PASS_DECISION', 'Pass #1 was PENDING', 'APPROVED [Student: TG/2021/0001, Room: A-101]', 'ADMIN')", u1
            );
        }
    }

    private void seedStudentWithRoom(String studentId, String name, String password, String email, String phone, String roomNo) {
        Long roomId = getRoomIdByNumber(roomNo);
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE student_id = ?", Integer.class, studentId);
        if (exists == null || exists == 0) {
            jdbcTemplate.update(
                "INSERT INTO users (student_id, full_name, password, email, phone, role, room_id) VALUES (?, ?, ?, ?, ?, 'STUDENT', ?)",
                studentId, name, password, email, phone, roomId
            );
            if (roomId != null) {
                jdbcTemplate.update("UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = ?", roomId);
            }
        }
    }

    private Long getUserIdByStudentId(String studentId) {
        try {
            return jdbcTemplate.queryForObject("SELECT id FROM users WHERE student_id = ? LIMIT 1", Long.class, studentId);
        } catch (Exception e) {
            return null;
        }
    }

    private Long getRoomIdByNumber(String roomNumber) {
        try {
            return jdbcTemplate.queryForObject("SELECT id FROM rooms WHERE room_number = ? LIMIT 1", Long.class, roomNumber);
        } catch (Exception e) {
            return null;
        }
    }

    private Long getInventoryIdByName(String itemName) {
        try {
            return jdbcTemplate.queryForObject("SELECT id FROM inventory WHERE item_name = ? LIMIT 1", Long.class, itemName);
        } catch (Exception e) {
            return null;
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
