-- Advance Database Management Systems (ADBMS) - Mini Project
-- University of Ruhuna - Hostel Management System (HMS)
-- Database Name: hms_db
-- Requirement: 4 Triggers and 4 Performance Indexes per member (Total 8 Triggers and 8 Indexes)
-- Member 1 Scope: Student Welfare, Room Allocations, Gate Passes, and Complaints
-- Member 2 Scope: Treasury, Monthly Payments, Inventory Logistics, and Staff Attendance

USE hms_db;

-- Prerequisite table 1: Audit log for user profile changes, room changes, and resolved complaints
CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action_type VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100) DEFAULT 'SYSTEM'
);

-- Prerequisite table 2: Audit log for financial payments and invoice settlements
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT,
    invoice_no VARCHAR(50),
    student_id VARCHAR(50),
    amount DECIMAL(10,2),
    action_type VARCHAR(50),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- SECTION 1: MEMBER 1 - 4 DATABASE TRIGGERS
DELIMITER //

-- Member 1 - Trigger 1: Auto-synchronize room occupancy counter
-- Target Table: users
-- Trigger Timing: AFTER UPDATE
-- Description: When a student's assigned room changes, this trigger automatically increments
-- the current occupancy of the new room and decrements the occupancy of the old room.
DROP TRIGGER IF EXISTS trg_AfterUserRoomChange //
CREATE TRIGGER trg_AfterUserRoomChange
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    -- Case 1: Student is newly allocated to a room (previously had no room)
    IF (OLD.room_id IS NULL AND NEW.room_id IS NOT NULL) THEN
        UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;

    -- Case 2: Student is deallocated or removed from a room
    ELSEIF (OLD.room_id IS NOT NULL AND NEW.room_id IS NULL) THEN
        UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE id = OLD.room_id;

    -- Case 3: Student is moved from one room to a different room
    ELSEIF (OLD.room_id IS NOT NULL AND NEW.room_id IS NOT NULL AND OLD.room_id <> NEW.room_id) THEN
        -- Reduce count in the old room
        UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE id = OLD.room_id;
        -- Increase count in the new room
        UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;
    END IF;
END //

-- Member 1 - Trigger 2: Date validation and status auto-fill for gate passes
-- Target Table: gate_passes
-- Trigger Timing: BEFORE INSERT
-- Description: Ensures the student's return date is not set earlier than the departure date.
-- If the dates are invalid, it aborts the insert with custom error code SQLSTATE 45000.
-- Also auto-assigns status to 'PENDING' if left blank.
DROP TRIGGER IF EXISTS trg_BeforeGatePassInsert //
CREATE TRIGGER trg_BeforeGatePassInsert
BEFORE INSERT ON gate_passes
FOR EACH ROW
BEGIN
    -- Check if return date is before departure date
    IF NEW.to_date < NEW.from_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gate pass validation failed: Expected return date cannot be earlier than departure date.';
    END IF;

    -- Automatically set default status as PENDING if not provided
    IF NEW.status IS NULL OR TRIM(NEW.status) = '' THEN
        SET NEW.status = 'PENDING';
    END IF;
END //

-- Member 1 - Trigger 3: Prevent room occupancy from exceeding configured capacity
-- Target Table: rooms
-- Trigger Timing: BEFORE UPDATE
-- Description: Database integrity guard that prevents room occupancy from ever exceeding
-- the maximum allowed bed capacity for that room.
DROP TRIGGER IF EXISTS trg_PreventExceedRoomCapacity //
CREATE TRIGGER trg_PreventExceedRoomCapacity
BEFORE UPDATE ON rooms
FOR EACH ROW
BEGIN
    -- Reject update if current occupancy is higher than capacity
    IF NEW.current_occupancy > NEW.capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Room capacity constraint violation: Current occupancy cannot exceed configured capacity.';
    END IF;
END //

-- Member 1 - Trigger 4: Automatic audit logging when a student complaint is resolved
-- Target Table: complaints
-- Trigger Timing: AFTER UPDATE
-- Description: Detects when a complaint status changes from non-resolved to RESOLVED,
-- and automatically creates a permanent audit trail record in user_audit_log table.
DROP TRIGGER IF EXISTS trg_AfterComplaintResolvedLog //
CREATE TRIGGER trg_AfterComplaintResolvedLog
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    -- Check if status transitioned to RESOLVED
    IF OLD.status <> 'RESOLVED' AND NEW.status = 'RESOLVED' THEN
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            NEW.user_id, 
            'COMPLAINT_RESOLVED', 
            CONCAT('Complaint #', NEW.id, ' was ', OLD.status), 
            'RESOLVED', 
            'MAINTENANCE_STAFF'
        );
    END IF;
END //

DELIMITER ;


-- SECTION 2: MEMBER 1 - 4 PERFORMANCE INDEXES

-- Member 1 - Index 1: Index on users(student_id)
-- Table: users
-- Indexed Columns: student_id
-- Purpose: Speeds up student logins, search by TG registration number (e.g. TG/2021/0001),
-- and fast profile lookup across the system without full table scans.
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- Member 1 - Index 2: Composite index on users(room_id, role)
-- Table: users
-- Indexed Columns: room_id, role
-- Purpose: Speeds up queries that find all students assigned to a specific room,
-- finding roommates, and filtering student occupants per room.
CREATE INDEX IF NOT EXISTS idx_users_room_role ON users(room_id, role);

-- Member 1 - Index 3: Composite index on gate_passes(user_id, status)
-- Table: gate_passes
-- Indexed Columns: user_id, status
-- Purpose: Accelerates student dashboard queries to retrieve all pending, approved,
-- or active gate passes for a particular logged-in student.
CREATE INDEX IF NOT EXISTS idx_gate_passes_user_status ON gate_passes(user_id, status);

-- Member 1 - Index 4: Composite index on complaints(status, room_number)
-- Table: complaints
-- Indexed Columns: status, room_number
-- Purpose: Accelerates filtering open and pending maintenance tickets by room number
-- for warden, sub-warden, and maintenance staff dashboards.
CREATE INDEX IF NOT EXISTS idx_complaints_status_room ON complaints(status, room_number);


-- SECTION 3: MEMBER 2 - 4 DATABASE TRIGGERS
DELIMITER //

-- Member 2 - Trigger 1: Financial audit trail on payment creation
-- Target Table: payments
-- Trigger Timing: AFTER INSERT
-- Description: When a student fee or invoice is paid, this trigger automatically reads the student_id
-- from the users table and inserts a payment receipt record into payment_audit_log.
DROP TRIGGER IF EXISTS trg_AfterPaymentInsertAudit //
CREATE TRIGGER trg_AfterPaymentInsertAudit
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE v_student_id VARCHAR(50);
    
    -- Lookup student_id for the given user_id
    SELECT student_id INTO v_student_id FROM users WHERE id = NEW.user_id LIMIT 1;

    -- Insert permanent audit entry
    INSERT INTO payment_audit_log (payment_id, invoice_no, student_id, amount, action_type)
    VALUES (NEW.id, NEW.invoice_no, IFNULL(v_student_id, 'UNKNOWN'), NEW.amount, 'NEW_INVOICE_PAID');
END //

-- Member 2 - Trigger 2: Financial amount validation for payments
-- Target Table: payments
-- Trigger Timing: BEFORE INSERT
-- Description: Ensures that payment amount is strictly positive (> 0.00). Rejects negative or zero
-- payments with SQLSTATE 45000. Also sets payment_date to today if not provided.
DROP TRIGGER IF EXISTS trg_BeforePaymentValidateAmount //
CREATE TRIGGER trg_BeforePaymentValidateAmount
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    -- Enforce positive amount
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Payment financial integrity violation: Amount must be greater than zero.';
    END IF;

    -- Set default payment date to current date if missing
    IF NEW.payment_date IS NULL THEN
        SET NEW.payment_date = CURRENT_DATE;
    END IF;
END //

-- Member 2 - Trigger 3: Inventory warehouse stock consistency
-- Target Table: inventory
-- Trigger Timing: BEFORE UPDATE
-- Description: Maintains mathematical consistency between total items, available items, and broken items.
-- Prevents available quantity from exceeding (total - broken) quantity.
DROP TRIGGER IF EXISTS trg_BeforeInventoryStockUpdate //
CREATE TRIGGER trg_BeforeInventoryStockUpdate
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
    -- If available + broken exceeds total stock, correct available quantity
    IF NEW.available_quantity + NEW.broken_quantity > NEW.total_quantity THEN
        SET NEW.available_quantity = GREATEST(0, NEW.total_quantity - NEW.broken_quantity);
    END IF;
END //

-- Member 2 - Trigger 4: Staff attendance checkout auto-remarks
-- Target Table: staff_attendance
-- Trigger Timing: BEFORE UPDATE
-- Description: When cleaning or maintenance staff record their checkout time, this trigger
-- automatically populates a default remark if none was provided by the user.
DROP TRIGGER IF EXISTS trg_BeforeStaffCheckOutUpdate //
CREATE TRIGGER trg_BeforeStaffCheckOutUpdate
BEFORE UPDATE ON staff_attendance
FOR EACH ROW
BEGIN
    -- If checking out and no checkout time existed previously
    IF NEW.check_out_time IS NOT NULL AND (OLD.check_out_time IS NULL OR OLD.check_out_time = '') THEN
        -- If remarks field is blank, provide standard completion message
        IF NEW.remarks IS NULL OR NEW.remarks = '' THEN
            SET NEW.remarks = 'Shift completed & signed out.';
        END IF;
    END IF;
END //

DELIMITER ;


-- SECTION 4: MEMBER 2 - 4 PERFORMANCE INDEXES

-- Member 2 - Index 1: Composite index on payments(month, status)
-- Table: payments
-- Indexed Columns: month, status
-- Purpose: Speeds up monthly revenue calculations, monthly fee collection reports,
-- and filtering paid vs unpaid monthly invoices.
CREATE INDEX IF NOT EXISTS idx_payments_month_status ON payments(month, status);

-- Member 2 - Index 2: Composite index on payments(user_id, payment_date)
-- Table: payments
-- Indexed Columns: user_id, payment_date
-- Purpose: Speeds up individual student fee history lookups and statement generation,
-- ordered by payment date for receipts.
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date);

-- Member 2 - Index 3: Composite index on inventory(category, available_quantity)
-- Table: inventory
-- Indexed Columns: category, available_quantity
-- Purpose: Speeds up logistics warehouse queries, low stock alerts, and category-wise
-- stock balance queries.
CREATE INDEX IF NOT EXISTS idx_inventory_category_avail ON inventory(category, available_quantity);

-- Member 2 - Index 4: Composite index on staff_attendance(user_id, date, status)
-- Table: staff_attendance
-- Indexed Columns: user_id, date, status
-- Purpose: Speeds up staff duty roster lookups, monthly staff attendance summaries,
-- and daily check-in verification for cleaning/maintenance staff.
CREATE INDEX IF NOT EXISTS idx_staff_att_user_date ON staff_attendance(user_id, date, status);


-- SECTION 5: VERIFICATION QUERIES (RUN IN PHPMYADMIN SQL TAB TO VIEW ALL)

-- Query 1: Display all 8 Triggers grouped by contributing member
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

-- Query 2: Display all 8 Performance Indexes grouped by contributing member
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
