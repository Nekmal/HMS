-- ============================================================================
-- University of Ruhuna - Faculty of Technology
-- Department of Information and Communication Technology
-- Course: Advanced Database Management Systems (ADBMS) - Mini Project
-- Project: Hostel Management System (HMS)
-- Database Name: hms_db
-- Architecture: 100% Pure SQL & Spring JDBC (Zero ORM / No Hibernate)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hms_db;

-- ----------------------------------------------------------------------------
-- Table 1: rooms (Hostel Physical Residential Units)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) NOT NULL UNIQUE,
    block_name VARCHAR(50),
    capacity INT NOT NULL DEFAULT 4,
    current_occupancy INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 2: users (System Resident & Staff Directory)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    password VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    room_id BIGINT,
    CONSTRAINT fk_users_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 3: payments (Hostel Treasury & Fee Settlements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    month VARCHAR(50),
    status VARCHAR(50),
    payment_date DATE,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 4: complaints (Student Maintenance & Issue Tickets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    description TEXT,
    status VARCHAR(50),
    created_at DATE,
    room_number VARCHAR(50),
    item VARCHAR(100),
    notified_at DATE,
    assigned_to VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'NORMAL',
    escalation_count INT DEFAULT 0,
    due_date DATE,
    admin_notes TEXT,
    CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 5: gate_passes (Student Campus Leave & Security Pass)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gate_passes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reason TEXT,
    from_date DATE,
    to_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING',
    CONSTRAINT fk_gatepasses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 6: inventory (Centralized Warehouse Asset Logistics)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0,
    available_quantity INT NOT NULL DEFAULT 0,
    broken_quantity INT NOT NULL DEFAULT 0,
    category VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 7: room_inventory (Room Equipment Damage Junction)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    inventory_id BIGINT NOT NULL,
    broken_quantity INT NOT NULL DEFAULT 0,
    damage_description VARCHAR(500),
    status VARCHAR(50),
    reported_date DATE,
    CONSTRAINT fk_ri_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_inv FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 8: notices (Administrative Circulars Bulletin Board)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    date_posted DATE,
    target_audience VARCHAR(50) DEFAULT 'ALL'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 9: staff_attendance (Duty Shift & Absence Records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_attendance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    check_in_time VARCHAR(50),
    check_out_time VARCHAR(50),
    marked_by VARCHAR(50),
    remarks VARCHAR(500),
    CONSTRAINT fk_sa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 10: user_audit_log (User Allocation & Profile Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action_type VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100) DEFAULT 'SYSTEM'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 11: payment_audit_log (Treasury & Fee Settlement Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT,
    invoice_no VARCHAR(50),
    student_id VARCHAR(50),
    amount DECIMAL(10,2),
    action_type VARCHAR(50),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 12: hostel_daily_stats (Daily Bed Occupancy Snapshots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostel_daily_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE,
    block_name VARCHAR(50),
    occupied_beds INT,
    total_capacity INT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 13: inventory_alert_log (Warehouse Stock Threshold Alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_alert_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT,
    item_name VARCHAR(100),
    available_qty INT,
    alert_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 8 COMPOSITE B-TREE PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_room_role ON users(room_id, role);
CREATE INDEX IF NOT EXISTS idx_gate_passes_user_status ON gate_passes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_status_room ON complaints(status, room_number);
CREATE INDEX IF NOT EXISTS idx_payments_month_status ON payments(month, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_inventory_category_avail ON inventory(category, available_quantity);
CREATE INDEX IF NOT EXISTS idx_staff_att_user_date ON staff_attendance(user_id, date, status);

-- ============================================================================
-- 8 ANALYTICAL & REPORTING VIEWS
-- ============================================================================
CREATE OR REPLACE VIEW vw_StudentRoomDetails AS 
SELECT 
    u.id AS user_id, 
    u.student_id, 
    u.full_name AS student_name, 
    u.email, 
    u.phone, 
    IFNULL(r.room_number, 'UNALLOCATED') AS room_number, 
    IFNULL(r.block_name, 'No Block') AS block_name, 
    IFNULL(r.capacity, 0) AS room_capacity, 
    IFNULL(r.current_occupancy, 0) AS room_occupancy, 
    IFNULL(p_agg.total_paid_lkr, 0.0) AS total_fee_paid_lkr, 
    IFNULL(p_agg.payment_records_count, 0) AS total_payments_made, 
    IFNULL(c_agg.total_complaints, 0) AS total_complaints_filed, 
    IFNULL(c_agg.pending_complaints, 0) AS unresolved_complaints 
FROM users u 
LEFT JOIN rooms r ON u.room_id = r.id 
LEFT JOIN (SELECT user_id, SUM(amount) AS total_paid_lkr, COUNT(id) AS payment_records_count FROM payments WHERE status = 'PAID' GROUP BY user_id) p_agg ON u.id = p_agg.user_id 
LEFT JOIN (SELECT user_id, COUNT(id) AS total_complaints, SUM(CASE WHEN status <> 'RESOLVED' THEN 1 ELSE 0 END) AS pending_complaints FROM complaints GROUP BY user_id) c_agg ON u.id = c_agg.user_id 
WHERE u.role = 'STUDENT';

CREATE OR REPLACE VIEW vw_ActiveGatePasses AS 
SELECT 
    gp.id AS pass_id, 
    u.student_id, 
    u.full_name AS student_name, 
    u.phone AS contact_number, 
    IFNULL(r.room_number, '-') AS room_number, 
    IFNULL(r.block_name, '-') AS block_name, 
    gp.reason, 
    gp.from_date AS departure_date, 
    gp.to_date AS expected_return_date, 
    DATEDIFF(gp.to_date, gp.from_date) AS leave_duration_days, 
    gp.status AS pass_status 
FROM gate_passes gp 
JOIN users u ON gp.user_id = u.id 
LEFT JOIN rooms r ON u.room_id = r.id;

CREATE OR REPLACE VIEW vw_MonthlyRevenueSummary AS 
SELECT 
    p.month AS billing_month, 
    IFNULL(r.block_name, 'General Student Body') AS hostel_block, 
    COUNT(p.id) AS total_invoices_issued, 
    SUM(CASE WHEN p.status = 'PAID' THEN 1 ELSE 0 END) AS paid_invoices_count, 
    SUM(CASE WHEN p.status <> 'PAID' THEN 1 ELSE 0 END) AS pending_invoices_count, 
    IFNULL(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0.0) AS total_revenue_collected_lkr 
FROM payments p 
JOIN users u ON p.user_id = u.id 
LEFT JOIN rooms r ON u.room_id = r.id 
GROUP BY p.month, r.block_name;

CREATE OR REPLACE VIEW vw_InventoryHealthStatus AS 
SELECT 
    inv.id AS item_id, 
    inv.item_name, 
    inv.category, 
    inv.total_quantity, 
    inv.available_quantity, 
    inv.broken_quantity AS warehouse_broken_qty, 
    IFNULL(ri_agg.room_damages_count, 0) AS total_room_incidents, 
    IFNULL(ri_agg.total_broken_in_rooms, 0) AS total_broken_in_rooms 
FROM inventory inv 
LEFT JOIN (SELECT inventory_id, COUNT(id) AS room_damages_count, SUM(broken_quantity) AS total_broken_in_rooms FROM room_inventory WHERE status = 'BROKEN' GROUP BY inventory_id) ri_agg ON inv.id = ri_agg.inventory_id;

CREATE OR REPLACE VIEW vw_RoomDamagesTracker AS 
SELECT 
    ri.id AS damage_id, 
    r.room_number, 
    r.block_name, 
    inv.item_name AS equipment_name, 
    inv.category AS equipment_category, 
    ri.broken_quantity, 
    inv.available_quantity AS warehouse_spare_stock, 
    ri.damage_description, 
    ri.reported_date, 
    ri.status AS repair_status 
FROM room_inventory ri 
JOIN rooms r ON ri.room_id = r.id 
JOIN inventory inv ON ri.inventory_id = inv.id;

CREATE OR REPLACE VIEW vw_StaffDutyAttendanceSummary AS 
SELECT 
    u.id AS staff_user_id, 
    u.student_id AS staff_emp_id, 
    u.full_name AS staff_name, 
    u.role AS staff_department, 
    COUNT(DISTINCT sa.id) AS total_shifts_logged, 
    SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_shifts, 
    SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_shifts 
FROM users u 
LEFT JOIN staff_attendance sa ON u.id = sa.user_id 
WHERE u.role IN ('SECURITY', 'MAINTENANCE', 'CLEANING') 
GROUP BY u.id, u.student_id, u.full_name, u.role;
