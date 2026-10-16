-- ============================================================================
-- ADVANCE DATABASE MANAGEMENT SYSTEMS (ADBMS) - MINI PROJECT
-- UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM (HMS)
-- ============================================================================
-- MEMBER 2 CONTRIBUTION SCRIPT
-- DOMAIN: HOSTEL TREASURY, LOGISTICS, ASSETS & REPAIRS, STAFF OPERATIONS
-- ============================================================================
-- COMPONENTS IMPLEMENTED (4 of each):
-- 1. Stored Procedures (4) - Multi-table operations across 3 to 4 tables
-- 2. Database Triggers (4)
-- 3. Stored Functions / UDFs (4) - Multi-table queries
-- 4. Analytical Views (4) - Complex joins across 3 to 4 tables
-- 5. Performance Indexes (4)
-- 6. Scheduled Events (4)
-- ============================================================================

USE hms_db;

-- ----------------------------------------------------------------------------
-- PREREQUISITE AUDIT & ALERT TABLES FOR MEMBER 2
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT,
    invoice_no VARCHAR(50),
    student_id VARCHAR(50),
    amount DOUBLE,
    action_type VARCHAR(50),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_alert_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT,
    item_name VARCHAR(100),
    current_available INT,
    alert_message VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 1: STORED PROCEDURES (MEMBER 2 - 4 PROCEDURES)
-- ============================================================================

DELIMITER //

-- Procedure 1.1: Multi-table payment processing
-- Tables involved: users, rooms, payments, payment_audit_log (4 tables)
DROP PROCEDURE IF EXISTS sp_RecordStudentPayment //
CREATE PROCEDURE sp_RecordStudentPayment(
    IN p_student_id VARCHAR(50),
    IN p_month VARCHAR(50),
    IN p_amount DOUBLE,
    OUT p_invoice_no VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_room_no VARCHAR(50);
    DECLARE v_block VARCHAR(50);
    DECLARE v_already_paid INT DEFAULT 0;
    DECLARE v_new_invoice VARCHAR(50);

    -- Multi-table query: Join users and rooms
    SELECT u.id, u.full_name, IFNULL(r.room_number, 'UNASSIGNED'), IFNULL(r.block_name, 'GENERAL')
    INTO v_user_id, v_student_name, v_room_no, v_block
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE u.student_id = p_student_id 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_invoice_no = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    IF p_amount <= 0 THEN
        SET p_invoice_no = 'ERROR: Payment amount must be greater than zero.';
        LEAVE proc_label;
    END IF;

    -- Multi-table check: Check payments table if already settled for this month
    SELECT COUNT(*) INTO v_already_paid
    FROM payments
    WHERE user_id = v_user_id AND month = p_month AND status = 'PAID';

    IF v_already_paid > 0 THEN
        SET p_invoice_no = CONCAT('INFO: Fees for ', p_month, ' already paid by ', v_student_name, '.');
        LEAVE proc_label;
    END IF;

    -- Generate invoice number
    SET v_new_invoice = CONCAT('INV-', FLOOR(100000 + (RAND() * 900000)));

    START TRANSACTION;
        INSERT INTO payments (amount, invoice_no, month, payment_date, status, user_id)
        VALUES (p_amount, v_new_invoice, p_month, CURRENT_DATE, 'PAID', v_user_id);

        INSERT INTO payment_audit_log (payment_id, invoice_no, student_id, amount, action_type)
        VALUES (
            LAST_INSERT_ID(), 
            v_new_invoice, 
            CONCAT(p_student_id, ' [Room: ', v_room_no, ']'), 
            p_amount, 
            CONCAT('PAID_SETTLED (Month: ', p_month, ')')
        );
    COMMIT;

    SET p_invoice_no = v_new_invoice;
END //

-- Procedure 1.2: Multi-table room damage reporting
-- Tables involved: rooms, inventory, room_inventory, complaints (4 tables)
DROP PROCEDURE IF EXISTS sp_ReportRoomDamage //
CREATE PROCEDURE sp_ReportRoomDamage(
    IN p_room_number VARCHAR(50),
    IN p_item_name VARCHAR(255),
    IN p_broken_qty INT,
    IN p_description VARCHAR(500),
    OUT p_damage_id BIGINT
)
proc_label: BEGIN
    DECLARE v_room_id BIGINT;
    DECLARE v_inv_id BIGINT;
    DECLARE v_avail INT;

    -- Query rooms
    SELECT id INTO v_room_id FROM rooms WHERE room_number = p_room_number LIMIT 1;
    IF v_room_id IS NULL THEN
        SET p_damage_id = -1;
        LEAVE proc_label;
    END IF;

    -- Query inventory
    SELECT id, available_quantity INTO v_inv_id, v_avail 
    FROM inventory 
    WHERE LOWER(item_name) LIKE LOWER(CONCAT('%', p_item_name, '%')) 
    LIMIT 1;

    IF v_inv_id IS NULL THEN
        SET p_damage_id = -2;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        -- Insert into room_inventory
        INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, reported_date, status)
        VALUES (v_room_id, v_inv_id, p_broken_qty, p_description, CURRENT_DATE, 'BROKEN');

        SET p_damage_id = LAST_INSERT_ID();

        -- Update inventory warehouse stock
        UPDATE inventory 
        SET broken_quantity = broken_quantity + p_broken_qty,
            available_quantity = GREATEST(0, available_quantity - p_broken_qty)
        WHERE id = v_inv_id;

        -- Cross-table update on complaints: If a matching student complaint exists, link status to IN_PROGRESS
        UPDATE complaints
        SET status = 'IN_PROGRESS'
        WHERE room_number = p_room_number 
          AND LOWER(item) LIKE LOWER(CONCAT('%', p_item_name, '%')) 
          AND status = 'PENDING';
    COMMIT;
END //

-- Procedure 1.3: Multi-table room repair completion & complaint resolution
-- Tables involved: room_inventory, inventory, rooms, complaints (4 tables)
DROP PROCEDURE IF EXISTS sp_CompleteRoomRepair //
CREATE PROCEDURE sp_CompleteRoomRepair(
    IN p_damage_id BIGINT,
    OUT p_status VARCHAR(200)
)
proc_label: BEGIN
    DECLARE v_inv_id BIGINT;
    DECLARE v_room_id BIGINT;
    DECLARE v_room_no VARCHAR(50);
    DECLARE v_item_name VARCHAR(100);
    DECLARE v_qty INT;
    DECLARE v_curr_status VARCHAR(50);

    -- Multi-table query: Join room_inventory, rooms, and inventory
    SELECT ri.inventory_id, ri.room_id, r.room_number, inv.item_name, ri.broken_quantity, ri.status 
    INTO v_inv_id, v_room_id, v_room_no, v_item_name, v_qty, v_curr_status
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    JOIN inventory inv ON ri.inventory_id = inv.id
    WHERE ri.id = p_damage_id 
    LIMIT 1;

    IF v_inv_id IS NULL THEN
        SET p_status = 'ERROR: Damage record not found.';
        LEAVE proc_label;
    END IF;

    IF v_curr_status = 'REPAIRED' THEN
        SET p_status = 'INFO: Asset has already been repaired.';
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        -- 1. Update room_inventory status
        UPDATE room_inventory 
        SET status = 'REPAIRED' 
        WHERE id = p_damage_id;

        -- 2. Restore warehouse inventory stock
        UPDATE inventory 
        SET broken_quantity = GREATEST(0, broken_quantity - v_qty),
            available_quantity = LEAST(total_quantity, available_quantity + v_qty)
        WHERE id = v_inv_id;

        -- 3. Cross-table resolution: Auto-resolve matching student complaints for this room and item
        UPDATE complaints 
        SET status = 'RESOLVED' 
        WHERE room_number = v_room_no 
          AND LOWER(item) LIKE LOWER(CONCAT('%', v_item_name, '%')) 
          AND status <> 'RESOLVED';
    COMMIT;

    SET p_status = CONCAT('SUCCESS: Asset #', p_damage_id, ' (', v_item_name, ' in Room ', v_room_no, ') marked as REPAIRED. Stock restored & complaints resolved.');
END //

-- Procedure 1.4: Multi-table staff shift registration
-- Tables involved: users, staff_attendance, user_audit_log (3 tables)
DROP PROCEDURE IF EXISTS sp_RecordStaffCheckIn //
CREATE PROCEDURE sp_RecordStaffCheckIn(
    IN p_staff_id VARCHAR(50),
    IN p_marked_by VARCHAR(50),
    OUT p_status VARCHAR(200)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_staff_name VARCHAR(100);
    DECLARE v_department VARCHAR(50);
    DECLARE v_existing_att BIGINT;

    -- Query users table for staff profile
    SELECT id, full_name, role 
    INTO v_user_id, v_staff_name, v_department
    FROM users 
    WHERE student_id = p_staff_id AND role IN ('SECURITY', 'MAINTENANCE', 'CLEANING') 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Staff ID not found or unauthorized role.';
        LEAVE proc_label;
    END IF;

    -- Check staff_attendance table
    SELECT id INTO v_existing_att 
    FROM staff_attendance 
    WHERE user_id = v_user_id AND date = CURRENT_DATE 
    LIMIT 1;

    IF v_existing_att IS NOT NULL THEN
        SET p_status = CONCAT('INFO: Staff member ', v_staff_name, ' is already checked in for today.');
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        -- Insert attendance
        INSERT INTO staff_attendance (user_id, date, status, check_in_time, marked_by, remarks)
        VALUES (v_user_id, CURRENT_DATE, 'PRESENT', DATE_FORMAT(NOW(), '%H:%i:%s'), p_marked_by, CONCAT('Duty started [', v_department, ']'));

        -- Insert audit log
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'STAFF_CHECK_IN', 
            'OFF_DUTY', 
            CONCAT('PRESENT [Shift: Morning, Dept: ', v_department, ']'), 
            p_marked_by
        );
    COMMIT;

    SET p_status = CONCAT('SUCCESS: Staff ', v_staff_name, ' (', p_staff_id, ' - ', v_department, ') checked in successfully.');
END //

DELIMITER ;

-- ============================================================================
-- SECTION 2: DATABASE TRIGGERS (MEMBER 2 - 4 TRIGGERS)
-- ============================================================================

DELIMITER //

-- Trigger 2.1: Log audit entry on every new payment settlement
DROP TRIGGER IF EXISTS trg_AfterPaymentInsertAudit //
CREATE TRIGGER trg_AfterPaymentInsertAudit
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE v_student_id VARCHAR(50);
    SELECT student_id INTO v_student_id FROM users WHERE id = NEW.user_id LIMIT 1;

    INSERT INTO payment_audit_log (payment_id, invoice_no, student_id, amount, action_type)
    VALUES (NEW.id, NEW.invoice_no, IFNULL(v_student_id, 'UNKNOWN'), NEW.amount, 'NEW_INVOICE_PAID');
END //

-- Trigger 2.2: Ensure payment amount is positive before saving
DROP TRIGGER IF EXISTS trg_BeforePaymentValidateAmount //
CREATE TRIGGER trg_BeforePaymentValidateAmount
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Payment financial integrity violation: Amount must be greater than zero.';
    END IF;
    IF NEW.payment_date IS NULL THEN
        SET NEW.payment_date = CURRENT_DATE;
    END IF;
END //

-- Trigger 2.3: Keep warehouse available quantity consistent with broken quantity
DROP TRIGGER IF EXISTS trg_BeforeInventoryStockUpdate //
CREATE TRIGGER trg_BeforeInventoryStockUpdate
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
    IF NEW.available_quantity + NEW.broken_quantity > NEW.total_quantity THEN
        SET NEW.available_quantity = GREATEST(0, NEW.total_quantity - NEW.broken_quantity);
    END IF;
END //

-- Trigger 2.4: Validate staff checkout time is recorded properly
DROP TRIGGER IF EXISTS trg_BeforeStaffCheckOutUpdate //
CREATE TRIGGER trg_BeforeStaffCheckOutUpdate
BEFORE UPDATE ON staff_attendance
FOR EACH ROW
BEGIN
    IF NEW.check_out_time IS NOT NULL AND (OLD.check_out_time IS NULL OR OLD.check_out_time = '') THEN
        IF NEW.remarks IS NULL OR NEW.remarks = '' THEN
            SET NEW.remarks = 'Shift completed & signed out.';
        END IF;
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- SECTION 3: STORED FUNCTIONS / UDFs (MEMBER 2 - 4 FUNCTIONS)
-- ============================================================================

DELIMITER //

-- Function 3.1: Calculate total verified fee revenue for month (joins payments and users)
DROP FUNCTION IF EXISTS fn_CalculateMonthlyTotalRevenue //
CREATE FUNCTION fn_CalculateMonthlyTotalRevenue(p_month VARCHAR(50))
RETURNS DOUBLE
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DOUBLE DEFAULT 0.0;

    SELECT IFNULL(SUM(p.amount), 0.0) INTO v_total
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.month = p_month AND p.status = 'PAID' AND u.role = 'STUDENT';

    RETURN v_total;
END //

-- Function 3.2: Return current available stock subtracting room damages (joins inventory and room_inventory)
DROP FUNCTION IF EXISTS fn_GetItemAvailableStock //
CREATE FUNCTION fn_GetItemAvailableStock(p_item_id BIGINT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_avail INT DEFAULT 0;

    SELECT (inv.total_quantity - (inv.broken_quantity + IFNULL(SUM(ri.broken_quantity), 0))) INTO v_avail
    FROM inventory inv
    LEFT JOIN room_inventory ri ON inv.id = ri.inventory_id AND ri.status = 'BROKEN'
    WHERE inv.id = p_item_id
    GROUP BY inv.id, inv.total_quantity, inv.broken_quantity;

    RETURN IFNULL(v_avail, 0);
END //

-- Function 3.3: Calculate staff monthly present days (joins users and staff_attendance)
DROP FUNCTION IF EXISTS fn_GetStaffMonthlyPresentDays //
CREATE FUNCTION fn_GetStaffMonthlyPresentDays(
    p_user_id BIGINT,
    p_year INT,
    p_month INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_present_days INT DEFAULT 0;

    SELECT COUNT(sa.id) INTO v_present_days
    FROM staff_attendance sa
    JOIN users u ON sa.user_id = u.id
    WHERE u.id = p_user_id 
      AND YEAR(sa.date) = p_year 
      AND MONTH(sa.date) = p_month 
      AND sa.status = 'PRESENT';

    RETURN v_present_days;
END //

-- Function 3.4: Calculate student fee arrears (joins users, rooms, and payments)
DROP FUNCTION IF EXISTS fn_CalculateStudentFeeArrears //
CREATE FUNCTION fn_CalculateStudentFeeArrears(p_user_id BIGINT)
RETURNS DOUBLE
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_paid DOUBLE DEFAULT 0.0;
    DECLARE v_expected_total DOUBLE DEFAULT 6000.00;
    DECLARE v_arrears DOUBLE DEFAULT 0.0;

    SELECT IFNULL(SUM(p.amount), 0.0)
    INTO v_total_paid
    FROM users u
    LEFT JOIN payments p ON u.id = p.user_id AND p.status = 'PAID'
    WHERE u.id = p_user_id
    GROUP BY u.id;

    SET v_arrears = GREATEST(0.0, v_expected_total - v_total_paid);
    RETURN v_arrears;
END //

DELIMITER ;

-- ============================================================================
-- SECTION 4: ANALYTICAL & REPORTING VIEWS (MEMBER 2 - 4 VIEWS)
-- ============================================================================

-- View 4.1: Monthly Treasury Invoicing & Revenue Collection Summary
-- Joins 3 tables: payments, users, rooms
CREATE OR REPLACE VIEW vw_MonthlyRevenueSummary AS
SELECT 
    p.month AS billing_month,
    IFNULL(r.block_name, 'General Student Body') AS hostel_block,
    COUNT(p.id) AS total_invoices_issued,
    SUM(CASE WHEN p.status = 'PAID' THEN 1 ELSE 0 END) AS paid_invoices_count,
    SUM(CASE WHEN p.status <> 'PAID' THEN 1 ELSE 0 END) AS pending_invoices_count,
    COUNT(DISTINCT u.id) AS student_payers_count,
    IFNULL(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0.0) AS total_revenue_collected_lkr,
    ROUND(AVG(CASE WHEN p.status = 'PAID' THEN p.amount ELSE NULL END), 2) AS avg_fee_amount_lkr
FROM payments p
JOIN users u ON p.user_id = u.id
LEFT JOIN rooms r ON u.room_id = r.id
GROUP BY p.month, r.block_name
ORDER BY p.month DESC, hostel_block ASC;

-- View 4.2: Warehouse Inventory Health & Active Damage Monitor
-- Joins 3 tables: inventory, room_inventory, complaints
CREATE OR REPLACE VIEW vw_InventoryHealthStatus AS
SELECT 
    inv.id AS item_id,
    inv.item_name,
    inv.category,
    inv.total_quantity,
    inv.available_quantity,
    inv.broken_quantity AS warehouse_broken_qty,
    IFNULL(ri_agg.room_damages_count, 0) AS total_room_incidents,
    IFNULL(ri_agg.total_broken_in_rooms, 0) AS total_broken_in_rooms,
    IFNULL(c_agg.student_complaints_count, 0) AS related_student_complaints,
    ROUND(((inv.broken_quantity + IFNULL(ri_agg.total_broken_in_rooms, 0)) / GREATEST(1, inv.total_quantity)) * 100.0, 1) AS overall_damage_rate_pct,
    CASE 
        WHEN inv.available_quantity = 0 THEN 'CRITICAL_STOCKOUT'
        WHEN inv.available_quantity < 5 THEN 'LOW_STOCK_REORDER'
        ELSE 'ADEQUATE_STOCK'
    END AS stock_condition,
    CASE 
        WHEN IFNULL(c_agg.student_complaints_count, 0) > 0 THEN 'ATTENTION_REQUIRED'
        ELSE 'STABLE'
    END AS student_impact_level
FROM inventory inv
LEFT JOIN (
    SELECT inventory_id, COUNT(id) AS room_damages_count, SUM(broken_quantity) AS total_broken_in_rooms
    FROM room_inventory
    WHERE status = 'BROKEN'
    GROUP BY inventory_id
) ri_agg ON inv.id = ri_agg.inventory_id
LEFT JOIN (
    SELECT item, COUNT(id) AS student_complaints_count
    FROM complaints
    WHERE status <> 'RESOLVED'
    GROUP BY item
) c_agg ON LOWER(TRIM(inv.item_name)) = LOWER(TRIM(c_agg.item));

-- View 4.3: Real-time Room Damages, Spare Parts & Occupant Tracker
-- Joins 4 tables: room_inventory, rooms, inventory, users
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
    ri.status AS repair_status,
    IFNULL(GROUP_CONCAT(DISTINCT u.student_id ORDER BY u.student_id SEPARATOR ', '), 'NO_RESIDENTS') AS room_resident_students
FROM room_inventory ri
JOIN rooms r ON ri.room_id = r.id
JOIN inventory inv ON ri.inventory_id = inv.id
LEFT JOIN users u ON r.id = u.room_id AND u.role = 'STUDENT'
GROUP BY ri.id, r.room_number, r.block_name, inv.item_name, inv.category, ri.broken_quantity, inv.available_quantity, ri.damage_description, ri.reported_date, ri.status;

-- View 4.4: Staff Duty Attendance & Operations Log Summary
-- Joins 3 tables: users, staff_attendance, user_audit_log
CREATE OR REPLACE VIEW vw_StaffDutyAttendanceSummary AS
SELECT 
    u.id AS staff_user_id,
    u.student_id AS staff_emp_id,
    u.full_name AS staff_name,
    u.role AS staff_department,
    COUNT(DISTINCT sa.id) AS total_shifts_logged,
    SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_shifts,
    SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_shifts,
    ROUND((SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) / GREATEST(1, COUNT(DISTINCT sa.id))) * 100.0, 1) AS attendance_rate_pct,
    COUNT(DISTINCT ual.id) AS operational_actions_logged,
    MAX(sa.date) AS last_duty_date
FROM users u
LEFT JOIN staff_attendance sa ON u.id = sa.user_id
LEFT JOIN user_audit_log ual ON u.student_id = ual.performed_by OR u.full_name = ual.performed_by
WHERE u.role IN ('SECURITY', 'MAINTENANCE', 'CLEANING')
GROUP BY u.id, u.student_id, u.full_name, u.role;

-- ============================================================================
-- SECTION 5: PERFORMANCE INDEXES (MEMBER 2 - 4 INDEXES)
-- ============================================================================

-- Index 5.1: Composite index on payments(month, status) for monthly revenue queries
CREATE INDEX IF NOT EXISTS idx_payments_month_status ON payments(month, status);

-- Index 5.2: Composite index on payments(user_id, payment_date) for student fee statements
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date);

-- Index 5.3: Composite index on inventory(category, available_quantity) for logistics stock filters
CREATE INDEX IF NOT EXISTS idx_inventory_category_avail ON inventory(category, available_quantity);

-- Index 5.4: Composite index on staff_attendance(user_id, date, status) for attendance audits
CREATE INDEX IF NOT EXISTS idx_staff_att_user_date ON staff_attendance(user_id, date, status);

-- ============================================================================
-- SECTION 6: SCHEDULED EVENTS (MEMBER 2 - 4 EVENTS)
-- ============================================================================

DELIMITER //

-- Event 6.1: Monthly fee billing reminder announcement on the 1st of every month
DROP EVENT IF EXISTS evt_MonthlyFeeBillingReminder //
CREATE EVENT evt_MonthlyFeeBillingReminder
ON SCHEDULE EVERY 1 MONTH
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 6 HOUR)
DO
BEGIN
    INSERT INTO notices (title, content, date_posted, target_audience)
    VALUES (
        CONCAT('Hostel Fee Due Date - ', DATE_FORMAT(CURRENT_DATE, '%M %Y')),
        'All resident students are kindly reminded to pay the monthly hostel boarding fees before the 15th of this month through the Student Treasury Portal.',
        CURRENT_DATE,
        'STUDENTS'
    );
END //

-- Event 6.2: Auto-mark absent for staff who have not checked in by 18:30 daily
DROP EVENT IF EXISTS evt_DailyStaffAbsenceMarker //
CREATE EVENT evt_DailyStaffAbsenceMarker
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 18 HOUR + INTERVAL 30 MINUTE)
DO
BEGIN
    INSERT INTO staff_attendance (user_id, date, status, check_in_time, check_out_time, marked_by, remarks)
    SELECT u.id, CURRENT_DATE, 'ABSENT', '-', '-', 'AUTO_SCHEDULER', 'Did not clock in for duty today'
    FROM users u
    WHERE u.role IN ('SECURITY', 'MAINTENANCE', 'CLEANING')
      AND u.id NOT IN (
          SELECT user_id 
          FROM staff_attendance 
          WHERE date = CURRENT_DATE
      );
END //

-- Event 6.3: Weekly check for warehouse inventory low stock alerts (< 5 units)
DROP EVENT IF EXISTS evt_WeeklyInventoryRestockAlert //
CREATE EVENT evt_WeeklyInventoryRestockAlert
ON SCHEDULE EVERY 1 WEEK
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 7 HOUR)
DO
BEGIN
    INSERT INTO inventory_alert_log (item_id, item_name, current_available, alert_message)
    SELECT id, item_name, available_quantity, CONCAT('Low stock warning: only ', available_quantity, ' units available in warehouse!')
    FROM inventory
    WHERE available_quantity < 5;
END //

-- Event 6.4: Monthly housekeeping purge of old audit logs (> 180 days)
DROP EVENT IF EXISTS evt_PurgeOldAuditLogs //
CREATE EVENT evt_PurgeOldAuditLogs
ON SCHEDULE EVERY 1 MONTH
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 2 HOUR)
DO
BEGIN
    DELETE FROM payment_audit_log WHERE logged_at < NOW() - INTERVAL 180 DAY;
    DELETE FROM user_audit_log WHERE performed_at < NOW() - INTERVAL 180 DAY;
END //

DELIMITER ;
