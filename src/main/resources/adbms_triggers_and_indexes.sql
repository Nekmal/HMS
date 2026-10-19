-- ============================================================================
-- ADVANCE DATABASE MANAGEMENT SYSTEMS (ADBMS) - MINI PROJECT
-- UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM (HMS)
-- ============================================================================
-- DEDICATED SCRIPT: TRIGGERS AND PERFORMANCE INDEXES
-- REQUIREMENT: 4 TRIGGERS AND 4 INDEXES PER MEMBER (TOTAL: 8 TRIGGERS, 8 INDEXES)
-- ============================================================================
-- MEMBER 1 DOMAIN: STUDENT WELFARE, ROOM ALLOCATION, GATE PASSES, COMPLAINTS
-- MEMBER 2 DOMAIN: TREASURY, INVENTORY, DAMAGE ASSESSMENT, STAFF ATTENDANCE
-- ============================================================================

USE hms_db;

-- ----------------------------------------------------------------------------
-- PREREQUISITE TABLES FOR AUDIT TRAILS & DATA INTEGRITY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action_type VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100) DEFAULT 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS payment_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT,
    invoice_no VARCHAR(50),
    student_id VARCHAR(50),
    amount DECIMAL(10,2),
    action_type VARCHAR(50),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PART 1: MEMBER 1 - 4 DATABASE TRIGGERS
-- ============================================================================
DELIMITER //

-- Trigger 1.1: Auto-synchronize room occupancy counters when user room changes
DROP TRIGGER IF EXISTS trg_AfterUserRoomChange //
CREATE TRIGGER trg_AfterUserRoomChange
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF (OLD.room_id IS NULL AND NEW.room_id IS NOT NULL) THEN
        UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;
    ELSEIF (OLD.room_id IS NOT NULL AND NEW.room_id IS NULL) THEN
        UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE id = OLD.room_id;
    ELSEIF (OLD.room_id IS NOT NULL AND NEW.room_id IS NOT NULL AND OLD.room_id <> NEW.room_id) THEN
        UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE id = OLD.room_id;
        UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;
    END IF;
END //

-- Trigger 1.2: Validate gate pass dates before insertion (Departure cannot be after return)
DROP TRIGGER IF EXISTS trg_BeforeGatePassInsert //
CREATE TRIGGER trg_BeforeGatePassInsert
BEFORE INSERT ON gate_passes
FOR EACH ROW
BEGIN
    IF NEW.to_date < NEW.from_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gate pass validation failed: Expected return date cannot be earlier than departure date.';
    END IF;
    IF NEW.status IS NULL OR TRIM(NEW.status) = '' THEN
        SET NEW.status = 'PENDING';
    END IF;
END //

-- Trigger 1.3: Prevent room occupancy from ever exceeding room capacity
DROP TRIGGER IF EXISTS trg_PreventExceedRoomCapacity //
CREATE TRIGGER trg_PreventExceedRoomCapacity
BEFORE UPDATE ON rooms
FOR EACH ROW
BEGIN
    IF NEW.current_occupancy > NEW.capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Room capacity constraint violation: Current occupancy cannot exceed configured capacity.';
    END IF;
END //

-- Trigger 1.4: Log audit entry when complaint status transitions to RESOLVED
DROP TRIGGER IF EXISTS trg_AfterComplaintResolvedLog //
CREATE TRIGGER trg_AfterComplaintResolvedLog
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF OLD.status <> 'RESOLVED' AND NEW.status = 'RESOLVED' THEN
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (NEW.user_id, 'COMPLAINT_RESOLVED', CONCAT('Complaint #', NEW.id, ' was ', OLD.status), 'RESOLVED', 'MAINTENANCE_STAFF');
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- PART 2: MEMBER 1 - 4 PERFORMANCE INDEXES
-- ============================================================================

-- Index 1.1: Index on users(student_id) for rapid student credential & TG registration lookup
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- Index 1.2: Composite index on users(room_id, role) for roommate queries and room rosters
CREATE INDEX IF NOT EXISTS idx_users_room_role ON users(room_id, role);

-- Index 1.3: Composite index on gate_passes(user_id, status) for student pass lookups
CREATE INDEX IF NOT EXISTS idx_gate_passes_user_status ON gate_passes(user_id, status);

-- Index 1.4: Composite index on complaints(status, room_number) for maintenance ticket filtering
CREATE INDEX IF NOT EXISTS idx_complaints_status_room ON complaints(status, room_number);


-- ============================================================================
-- PART 3: MEMBER 2 - 4 DATABASE TRIGGERS
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

-- Trigger 2.2: Ensure payment amount is positive before saving (financial integrity)
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
-- PART 4: MEMBER 2 - 4 PERFORMANCE INDEXES
-- ============================================================================

-- Index 2.1: Composite index on payments(month, status) for monthly revenue queries
CREATE INDEX IF NOT EXISTS idx_payments_month_status ON payments(month, status);

-- Index 2.2: Composite index on payments(user_id, payment_date) for student fee statements
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date);

-- Index 2.3: Composite index on inventory(category, available_quantity) for logistics stock filters
CREATE INDEX IF NOT EXISTS idx_inventory_category_avail ON inventory(category, available_quantity);

-- Index 2.4: Composite index on staff_attendance(user_id, date, status) for attendance audits
CREATE INDEX IF NOT EXISTS idx_staff_att_user_date ON staff_attendance(user_id, date, status);


-- ============================================================================
-- PART 5: INSTANT VERIFICATION QUERIES (RUN TO VERIFY ALL 8 TRIGGERS & 8 INDEXES)
-- ============================================================================

-- 1. SHOW ALL 8 TRIGGERS:
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION AS 'EVENT',
    EVENT_OBJECT_TABLE AS 'TABLE_NAME',
    ACTION_TIMING AS 'TIMING',
    CASE 
        WHEN TRIGGER_NAME IN ('trg_AfterUserRoomChange', 'trg_BeforeGatePassInsert', 'trg_PreventExceedRoomCapacity', 'trg_AfterComplaintResolvedLog') THEN 'Member 1 (Welfare)'
        ELSE 'Member 2 (Treasury/Logistics)'
    END AS 'CONTRIBUTION'
FROM information_schema.TRIGGERS 
WHERE TRIGGER_SCHEMA = 'hms_db'
ORDER BY CONTRIBUTION, TRIGGER_NAME;

-- 2. SHOW ALL 8 PERFORMANCE INDEXES:
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS 'COLUMNS',
    CASE 
        WHEN INDEX_NAME IN ('idx_users_student_id', 'idx_users_room_role', 'idx_gate_passes_user_status', 'idx_complaints_status_room') THEN 'Member 1 (Welfare)'
        WHEN INDEX_NAME IN ('idx_payments_month_status', 'idx_payments_user_date', 'idx_inventory_category_avail', 'idx_staff_att_user_date') THEN 'Member 2 (Treasury/Logistics)'
        ELSE 'Default / System'
    END AS 'CONTRIBUTION'
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'hms_db' 
  AND INDEX_NAME LIKE 'idx_%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY CONTRIBUTION, TABLE_NAME;
