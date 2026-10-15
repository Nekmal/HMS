-- ============================================================================
-- ADVANCE DATABASE MANAGEMENT SYSTEMS (ADBMS) - MINI PROJECT
-- UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM (HMS)
-- ============================================================================
-- MEMBER 2 CONTRIBUTION SCRIPT
-- DOMAIN: HOSTEL TREASURY, LOGISTICS, ASSETS & REPAIRS, STAFF OPERATIONS
-- ============================================================================
-- COMPONENTS IMPLEMENTED (4 of each):
-- 1. Stored Procedures (4)
-- 2. Database Triggers (4)
-- 3. Stored Functions / UDFs (4)
-- 4. Analytical Views (4)
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

-- Procedure 1.1: Record student hostel fee payment with audit logging
DROP PROCEDURE IF EXISTS sp_RecordStudentPayment //
CREATE PROCEDURE sp_RecordStudentPayment(
    IN p_student_id VARCHAR(50),
    IN p_month VARCHAR(50),
    IN p_amount DOUBLE,
    OUT p_invoice_no VARCHAR(50)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_new_invoice VARCHAR(50);

    -- Find student
    SELECT id INTO v_user_id 
    FROM users 
    WHERE student_id = p_student_id 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_invoice_no = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    IF p_amount <= 0 THEN
        SET p_invoice_no = 'ERROR: Payment amount must be greater than zero.';
        LEAVE proc_label;
    END IF;

    -- Generate random 6-digit invoice number
    SET v_new_invoice = CONCAT('INV-', FLOOR(100000 + (RAND() * 900000)));

    START TRANSACTION;
        INSERT INTO payments (amount, invoice_no, month, payment_date, status, user_id)
        VALUES (p_amount, v_new_invoice, p_month, CURRENT_DATE, 'PAID', v_user_id);

        INSERT INTO payment_audit_log (payment_id, invoice_no, student_id, amount, action_type)
        VALUES (LAST_INSERT_ID(), v_new_invoice, p_student_id, p_amount, 'SETTLEMENT_RECORDED');
    COMMIT;

    SET p_invoice_no = v_new_invoice;
END //

-- Procedure 1.2: Report broken equipment in a student room and sync warehouse inventory
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

    SELECT id INTO v_room_id FROM rooms WHERE room_number = p_room_number LIMIT 1;
    IF v_room_id IS NULL THEN
        SET p_damage_id = -1;
        LEAVE proc_label;
    END IF;

    SELECT id, available_quantity INTO v_inv_id, v_avail 
    FROM inventory 
    WHERE item_name LIKE CONCAT('%', p_item_name, '%') 
    LIMIT 1;

    IF v_inv_id IS NULL THEN
        SET p_damage_id = -2;
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, reported_date, status)
        VALUES (v_room_id, v_inv_id, p_broken_qty, p_description, CURRENT_DATE, 'BROKEN');

        SET p_damage_id = LAST_INSERT_ID();

        UPDATE inventory 
        SET broken_quantity = broken_quantity + p_broken_qty,
            available_quantity = GREATEST(0, available_quantity - p_broken_qty)
        WHERE id = v_inv_id;
    COMMIT;
END //

-- Procedure 1.3: Complete repair of damaged room asset and restore warehouse stock
DROP PROCEDURE IF EXISTS sp_CompleteRoomRepair //
CREATE PROCEDURE sp_CompleteRoomRepair(
    IN p_damage_id BIGINT,
    OUT p_status VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_inv_id BIGINT;
    DECLARE v_qty INT;
    DECLARE v_curr_status VARCHAR(50);

    SELECT inventory_id, broken_quantity, status 
    INTO v_inv_id, v_qty, v_curr_status
    FROM room_inventory 
    WHERE id = p_damage_id 
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
        UPDATE room_inventory 
        SET status = 'REPAIRED' 
        WHERE id = p_damage_id;

        UPDATE inventory 
        SET broken_quantity = GREATEST(0, broken_quantity - v_qty),
            available_quantity = LEAST(total_quantity, available_quantity + v_qty)
        WHERE id = v_inv_id;
    COMMIT;

    SET p_status = CONCAT('SUCCESS: Asset #', p_damage_id, ' marked as REPAIRED. Stock restored.');
END //

-- Procedure 1.4: Record staff daily shift check-in
DROP PROCEDURE IF EXISTS sp_RecordStaffCheckIn //
CREATE PROCEDURE sp_RecordStaffCheckIn(
    IN p_staff_id VARCHAR(50),
    IN p_marked_by VARCHAR(50),
    OUT p_status VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_existing_att BIGINT;

    SELECT id INTO v_user_id 
    FROM users 
    WHERE student_id = p_staff_id AND role IN ('SECURITY', 'MAINTENANCE', 'CLEANING') 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Staff ID not found or invalid role.';
        LEAVE proc_label;
    END IF;

    -- Check if already checked in today
    SELECT id INTO v_existing_att 
    FROM staff_attendance 
    WHERE user_id = v_user_id AND date = CURRENT_DATE 
    LIMIT 1;

    IF v_existing_att IS NOT NULL THEN
        SET p_status = 'INFO: Staff member is already checked in for today.';
        LEAVE proc_label;
    END IF;

    INSERT INTO staff_attendance (user_id, date, status, check_in_time, marked_by, remarks)
    VALUES (v_user_id, CURRENT_DATE, 'PRESENT', DATE_FORMAT(NOW(), '%H:%i:%s'), p_marked_by, 'Shift check-in recorded');

    SET p_status = CONCAT('SUCCESS: Staff ', p_staff_id, ' checked in successfully.');
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

-- Function 3.1: Calculate total verified fee revenue for a given month
DROP FUNCTION IF EXISTS fn_CalculateMonthlyTotalRevenue //
CREATE FUNCTION fn_CalculateMonthlyTotalRevenue(p_month VARCHAR(50))
RETURNS DOUBLE
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DOUBLE DEFAULT 0.0;

    SELECT IFNULL(SUM(amount), 0.0) INTO v_total
    FROM payments
    WHERE month = p_month AND status = 'PAID';

    RETURN v_total;
END //

-- Function 3.2: Return current healthy available stock in warehouse
DROP FUNCTION IF EXISTS fn_GetItemAvailableStock //
CREATE FUNCTION fn_GetItemAvailableStock(p_item_id BIGINT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_avail INT DEFAULT 0;

    SELECT available_quantity INTO v_avail
    FROM inventory
    WHERE id = p_item_id
    LIMIT 1;

    RETURN v_avail;
END //

-- Function 3.3: Calculate number of days a staff member was present in a month
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

    SELECT COUNT(*) INTO v_present_days
    FROM staff_attendance
    WHERE user_id = p_user_id 
      AND YEAR(date) = p_year 
      AND MONTH(date) = p_month 
      AND status = 'PRESENT';

    RETURN v_present_days;
END //

-- Function 3.4: Estimate student fee arrears (assuming standard fee of Rs. 2000/month)
DROP FUNCTION IF EXISTS fn_CalculateStudentFeeArrears //
CREATE FUNCTION fn_CalculateStudentFeeArrears(p_user_id BIGINT)
RETURNS DOUBLE
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_paid DOUBLE DEFAULT 0.0;
    DECLARE v_expected_total DOUBLE DEFAULT 6000.00; -- 3 semester months standard (Jan, Feb, Mar)
    DECLARE v_arrears DOUBLE DEFAULT 0.0;

    SELECT IFNULL(SUM(amount), 0.0) INTO v_total_paid
    FROM payments
    WHERE user_id = p_user_id AND status = 'PAID';

    SET v_arrears = GREATEST(0.0, v_expected_total - v_total_paid);
    RETURN v_arrears;
END //

DELIMITER ;

-- ============================================================================
-- SECTION 4: ANALYTICAL & REPORTING VIEWS (MEMBER 2 - 4 VIEWS)
-- ============================================================================

-- View 4.1: Monthly Treasury Invoicing & Revenue Collection Summary
CREATE OR REPLACE VIEW vw_MonthlyRevenueSummary AS
SELECT 
    month AS billing_month,
    COUNT(id) AS total_invoices,
    SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid_invoices_count,
    SUM(CASE WHEN status <> 'PAID' THEN 1 ELSE 0 END) AS pending_invoices_count,
    IFNULL(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0.0) AS total_revenue_collected_lkr,
    ROUND(AVG(CASE WHEN status = 'PAID' THEN amount ELSE NULL END), 2) AS avg_fee_amount_lkr
FROM payments
GROUP BY month
ORDER BY billing_month DESC;

-- View 4.2: Warehouse Inventory Health & Asset Condition Monitor
CREATE OR REPLACE VIEW vw_InventoryHealthStatus AS
SELECT 
    id AS item_id,
    item_name,
    category,
    total_quantity,
    available_quantity,
    broken_quantity,
    ROUND((broken_quantity / total_quantity) * 100.0, 1) AS damage_rate_percentage,
    CASE 
        WHEN broken_quantity = 0 THEN 'OPTIMAL'
        WHEN (broken_quantity / total_quantity) <= 0.20 THEN 'GOOD'
        WHEN (broken_quantity / total_quantity) <= 0.50 THEN 'NEEDS_REPAIRS'
        ELSE 'CRITICAL_DEFICIT'
    END AS asset_health_status
FROM inventory;

-- View 4.3: Real-time Room Damages & Repair Work Orders Tracker
CREATE OR REPLACE VIEW vw_RoomDamagesTracker AS
SELECT 
    ri.id AS damage_id,
    r.room_number,
    r.block_name,
    inv.item_name AS equipment_name,
    inv.category AS equipment_category,
    ri.broken_quantity,
    ri.damage_description,
    ri.reported_date,
    ri.status AS repair_status
FROM room_inventory ri
JOIN rooms r ON ri.room_id = r.id
JOIN inventory inv ON ri.inventory_id = inv.id;

-- View 4.4: Staff Duty Attendance, Punctuality & Roster Overview
CREATE OR REPLACE VIEW vw_StaffDutyAttendanceSummary AS
SELECT 
    u.id AS staff_user_id,
    u.student_id AS staff_emp_id,
    u.full_name AS staff_name,
    u.role AS staff_department,
    COUNT(sa.id) AS total_shifts_logged,
    SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_shifts,
    SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_shifts,
    ROUND((SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) / GREATEST(1, COUNT(sa.id))) * 100.0, 1) AS attendance_rate_pct
FROM users u
LEFT JOIN staff_attendance sa ON u.id = sa.user_id
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
