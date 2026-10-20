-- ============================================================================
-- Advance Database Management Systems (ADBMS) - Mini Project
-- University of Ruhuna - Faculty of Technology
-- Hostel Management System (HMS)
-- Database Name: hms_db
-- 
-- TOPIC: DATABASE TRANSACTIONS & ACID PROPERTIES IN STORED PROCEDURES
-- ============================================================================
-- Features Implemented:
-- 1. Explicit Transaction Delimitation (START TRANSACTION ... COMMIT)
-- 2. Error Trapping with Exception Handlers (DECLARE EXIT HANDLER FOR SQLEXCEPTION)
-- 3. Automatic Failure Compensation (ROLLBACK on any SQL error)
-- 4. Multi-table Atomic Operations across 3 to 5 relational tables
-- ============================================================================

USE hms_db;

-- ----------------------------------------------------------------------------
-- Prerequisite Audit Log Tables
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

DELIMITER //

-- ============================================================================
-- SECTION 1: MEMBER 1 - STUDENT WELFARE & RESIDENCE TRANSACTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Transaction 1.1: Atomic Student Room Allocation
-- Tables Modified: users, rooms (source & target), user_audit_log
-- ACID Feature: Atomicity ensures neither room occupancy nor student room ID
-- can become mismatched if any step fails.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_AllocateStudentRoom //
CREATE PROCEDURE sp_AllocateStudentRoom(
    IN p_student_id VARCHAR(50),
    IN p_room_number VARCHAR(50),
    OUT p_status VARCHAR(200)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_current_room BIGINT;
    DECLARE v_current_room_no VARCHAR(50);
    DECLARE v_room_id BIGINT;
    DECLARE v_capacity INT;
    DECLARE v_occupancy INT;
    DECLARE v_block VARCHAR(50);
    DECLARE v_payments_count INT;
    DECLARE v_broken_items INT;

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status = 'ERROR: Database transaction failed during room allocation. Changes rolled back.';
    END;

    -- Multi-table query: Find student and join current room details
    SELECT u.id, u.full_name, u.room_id, r.room_number 
    INTO v_user_id, v_student_name, v_current_room, v_current_room_no
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE u.student_id = p_student_id AND u.role = 'STUDENT' 
    LIMIT 1;

    -- Verify that student exists in resident directory
    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Student ID not found in resident directory.';
        LEAVE proc_label;
    END IF;

    -- Multi-table check: Verify target room details and broken items in target room
    SELECT r.id, r.capacity, r.current_occupancy, r.block_name,
           IFNULL(SUM(ri.broken_quantity), 0)
    INTO v_room_id, v_capacity, v_occupancy, v_block, v_broken_items
    FROM rooms r
    LEFT JOIN room_inventory ri ON r.id = ri.room_id AND ri.status = 'BROKEN'
    WHERE r.room_number = p_room_number
    GROUP BY r.id, r.capacity, r.current_occupancy, r.block_name
    LIMIT 1;

    -- Verify that target room exists
    IF v_room_id IS NULL THEN
        SET p_status = CONCAT('ERROR: Target room ', p_room_number, ' does not exist.');
        LEAVE proc_label;
    END IF;

    -- Check if target room is already at full capacity
    IF v_occupancy >= v_capacity THEN
        SET p_status = CONCAT('ERROR: Room ', p_room_number, ' is full (Capacity: ', v_capacity, ').');
        LEAVE proc_label;
    END IF;

    -- Check if student is already assigned to this exact room
    IF v_current_room IS NOT NULL AND v_current_room = v_room_id THEN
        SET p_status = CONCAT('INFO: Student ', v_student_name, ' is already allocated to Room ', p_room_number, '.');
        LEAVE proc_label;
    END IF;

    -- Multi-table check: Check student payment count
    SELECT COUNT(*) INTO v_payments_count FROM payments WHERE user_id = v_user_id;

    -- ATOMIC TRANSACTION START
    START TRANSACTION;
        -- If student was in another room, decrement previous room occupancy
        IF v_current_room IS NOT NULL THEN
            UPDATE rooms 
            SET current_occupancy = GREATEST(0, current_occupancy - 1) 
            WHERE id = v_current_room;
        END IF;

        -- Update student record with new room_id
        UPDATE users 
        SET room_id = v_room_id 
        WHERE id = v_user_id;

        -- Increment target room occupancy
        UPDATE rooms 
        SET current_occupancy = LEAST(capacity, current_occupancy + 1) 
        WHERE id = v_room_id;

        -- Insert audit log entry with old and new room info
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'ROOM_ALLOCATION', 
            IFNULL(v_current_room_no, 'UNALLOCATED'), 
            CONCAT(p_room_number, ' (', v_block, ')'), 
            'ADMIN'
        );
    COMMIT;
    -- ATOMIC TRANSACTION COMMIT

    SET p_status = CONCAT('SUCCESS: Student ', v_student_name, ' (', p_student_id, ') allocated to Room ', p_room_number, ' [', v_block, '].');
END //


-- ----------------------------------------------------------------------------
-- Transaction 1.2: Atomic Student Room Deallocation
-- Tables Modified: rooms, users, user_audit_log
-- ACID Feature: Guaranteed rollback if deallocation audit trail fails.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeallocateStudentRoom //
CREATE PROCEDURE sp_DeallocateStudentRoom(
    IN p_student_id VARCHAR(50),
    OUT p_status VARCHAR(200)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_room_id BIGINT;
    DECLARE v_room_no VARCHAR(50);
    DECLARE v_pending_complaints INT DEFAULT 0;

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status = 'ERROR: Database transaction failed during room deallocation. Changes rolled back.';
    END;

    -- Multi-table query: Join users and rooms
    SELECT u.id, u.full_name, u.room_id, r.room_number
    INTO v_user_id, v_student_name, v_room_id, v_room_no
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE u.student_id = p_student_id AND u.role = 'STUDENT' 
    LIMIT 1;

    -- Check if student exists
    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    -- Check if student currently has an allocated room
    IF v_room_id IS NULL THEN
        SET p_status = CONCAT('INFO: Student ', v_student_name, ' has no active room allocation.');
        LEAVE proc_label;
    END IF;

    -- Multi-table check: Check complaints table for pending hostel issues
    SELECT COUNT(*) INTO v_pending_complaints 
    FROM complaints 
    WHERE user_id = v_user_id AND status <> 'RESOLVED';

    -- ATOMIC TRANSACTION START
    START TRANSACTION;
        -- Decrement room occupancy count
        UPDATE rooms 
        SET current_occupancy = GREATEST(0, current_occupancy - 1) 
        WHERE id = v_room_id;

        -- Clear user room assignment
        UPDATE users 
        SET room_id = NULL 
        WHERE id = v_user_id;

        -- Record deallocation in audit log
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'ROOM_DEALLOCATION', 
            v_room_no, 
            CONCAT('DEALLOCATED (Pending Complaints: ', v_pending_complaints, ')'), 
            'ADMIN'
        );
    COMMIT;
    -- ATOMIC TRANSACTION COMMIT

    SET p_status = CONCAT('SUCCESS: Student ', v_student_name, ' deallocated from Room ', v_room_no, '. Pending issues: ', v_pending_complaints, '.');
END //


-- ----------------------------------------------------------------------------
-- Transaction 1.3: Atomic Gate Pass Review & Approval
-- Tables Modified: gate_passes, user_audit_log
-- ACID Feature: Decision state and audit logging are committed together.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ProcessGatePassApproval //
CREATE PROCEDURE sp_ProcessGatePassApproval(
    IN p_pass_id BIGINT,
    IN p_decision VARCHAR(20),
    IN p_reviewer VARCHAR(100),
    OUT p_result VARCHAR(200)
)
proc_label: BEGIN
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_user_id BIGINT;
    DECLARE v_student_id VARCHAR(50);
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_room_number VARCHAR(50);

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Database transaction failed during gate pass review. Changes rolled back.';
    END;

    -- Multi-table query joining gate_passes, users, and rooms
    SELECT gp.status, gp.user_id, u.student_id, u.full_name, IFNULL(r.room_number, 'UNASSIGNED')
    INTO v_current_status, v_user_id, v_student_id, v_student_name, v_room_number
    FROM gate_passes gp
    JOIN users u ON gp.user_id = u.id
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE gp.id = p_pass_id 
    LIMIT 1;

    -- Verify that gate pass exists
    IF v_current_status IS NULL THEN
        SET p_result = 'ERROR: Gate pass ID not found.';
        LEAVE proc_label;
    END IF;

    -- Validate decision value
    IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
        SET p_result = 'ERROR: Decision must be APPROVED or REJECTED.';
        LEAVE proc_label;
    END IF;

    -- ATOMIC TRANSACTION START
    START TRANSACTION;
        -- Update gate pass decision
        UPDATE gate_passes 
        SET status = p_decision 
        WHERE id = p_pass_id;

        -- Multi-table audit logging
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'GATE_PASS_DECISION', 
            CONCAT('Pass #', p_pass_id, ' was ', v_current_status), 
            CONCAT(p_decision, ' [Student: ', v_student_id, ', Room: ', v_room_number, ']'), 
            p_reviewer
        );
    COMMIT;
    -- ATOMIC TRANSACTION COMMIT

    SET p_result = CONCAT('SUCCESS: Gate pass #', p_pass_id, ' for ', v_student_name, ' (Room ', v_room_number, ') marked as ', p_decision, '.');
END //


-- ----------------------------------------------------------------------------
-- Transaction 1.4: Atomic Student Complaint Filing
-- Tables Modified: complaints, user_audit_log
-- ACID Feature: Inserts complaint record and creates immediate audit tracking.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_FileStudentComplaint //
CREATE PROCEDURE sp_FileStudentComplaint(
    IN p_student_id VARCHAR(50),
    IN p_room_number VARCHAR(50),
    IN p_item VARCHAR(100),
    IN p_description TEXT,
    OUT p_complaint_id BIGINT
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_allocated_room VARCHAR(50);
    DECLARE v_inv_avail INT DEFAULT 0;

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_complaint_id = -999;
    END;

    -- Multi-table query: Join users and rooms
    SELECT u.id, u.full_name, r.room_number 
    INTO v_user_id, v_student_name, v_allocated_room 
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id 
    WHERE u.student_id = p_student_id 
    LIMIT 1;

    -- Verify student exists
    IF v_user_id IS NULL THEN
        SET p_complaint_id = -1;
        LEAVE proc_label;
    END IF;

    -- Default to student's allocated room if none given
    IF p_room_number IS NULL OR TRIM(p_room_number) = '' THEN
        SET p_room_number = IFNULL(v_allocated_room, 'UNSPECIFIED');
    END IF;

    -- Multi-table check: Cross-reference inventory warehouse table
    SELECT IFNULL(available_quantity, 0) INTO v_inv_avail
    FROM inventory 
    WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(p_item))
    LIMIT 1;

    -- ATOMIC TRANSACTION START
    START TRANSACTION;
        INSERT INTO complaints (user_id, room_number, item, description, status, created_at)
        VALUES (v_user_id, p_room_number, p_item, p_description, 'PENDING', CURRENT_DATE);

        SET p_complaint_id = LAST_INSERT_ID();

        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'COMPLAINT_FILED', 
            'NEW', 
            CONCAT('Complaint #', p_complaint_id, ' [Item: ', p_item, ', Room: ', p_room_number, ', Stock: ', v_inv_avail, ']'), 
            p_student_id
        );
    COMMIT;
    -- ATOMIC TRANSACTION COMMIT
END //


-- ============================================================================
-- SECTION 2: MEMBER 2 - TREASURY & LOGISTICS TRANSACTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Transaction 2.1: Atomic Student Payment & Financial Audit Recording
-- Tables Modified: payments, payment_audit_log
-- ACID Feature: Prevents "phantom payments" where payment row exists but
-- financial audit ledger is missing or vice-versa.
-- ----------------------------------------------------------------------------
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

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_invoice_no = 'ERROR: Database transaction failed during payment recording. Changes rolled back.';
    END;

    -- Multi-table query: Join users and rooms to retrieve student details
    SELECT u.id, u.full_name, IFNULL(r.room_number, 'UNASSIGNED'), IFNULL(r.block_name, 'GENERAL')
    INTO v_user_id, v_student_name, v_room_no, v_block
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE u.student_id = p_student_id 
    LIMIT 1;

    -- Verify student exists
    IF v_user_id IS NULL THEN
        SET p_invoice_no = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    -- Enforce positive amount
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

    -- Generate unique invoice number
    SET v_new_invoice = CONCAT('INV-', FLOOR(100000 + (RAND() * 900000)));

    -- ATOMIC TRANSACTION START
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
    -- ATOMIC TRANSACTION COMMIT

    SET p_invoice_no = v_new_invoice;
END //


-- ----------------------------------------------------------------------------
-- Transaction 2.2: Atomic Room Damage Reporting & Inventory Balance
-- Tables Modified: room_inventory, inventory, complaints
-- ACID Feature: Balances broken stock in room with warehouse inventory and
-- complaint ticket status simultaneously.
-- ----------------------------------------------------------------------------
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

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_damage_id = -999;
    END;

    -- Query rooms table to find room_id
    SELECT id INTO v_room_id FROM rooms WHERE room_number = p_room_number LIMIT 1;
    IF v_room_id IS NULL THEN
        SET p_damage_id = -1;
        LEAVE proc_label;
    END IF;

    -- Query inventory table to locate the equipment item
    SELECT id, available_quantity INTO v_inv_id, v_avail 
    FROM inventory 
    WHERE LOWER(item_name) LIKE LOWER(CONCAT('%', p_item_name, '%')) 
    LIMIT 1;

    IF v_inv_id IS NULL THEN
        SET p_damage_id = -2;
        LEAVE proc_label;
    END IF;

    -- ATOMIC TRANSACTION START
    START TRANSACTION;
        -- Record damage in room_inventory
        INSERT INTO room_inventory (room_id, inventory_id, broken_quantity, damage_description, reported_date, status)
        VALUES (v_room_id, v_inv_id, p_broken_qty, p_description, CURRENT_DATE, 'BROKEN');

        SET p_damage_id = LAST_INSERT_ID();

        -- Update warehouse stock counts
        UPDATE inventory 
        SET broken_quantity = broken_quantity + p_broken_qty,
            available_quantity = GREATEST(0, available_quantity - p_broken_qty)
        WHERE id = v_inv_id;

        -- Cross-table update on complaints: link matching student complaint to IN_PROGRESS
        UPDATE complaints
        SET status = 'IN_PROGRESS'
        WHERE room_number = p_room_number 
          AND LOWER(item) LIKE LOWER(CONCAT('%', p_item_name, '%')) 
          AND status = 'PENDING';
    COMMIT;
    -- ATOMIC TRANSACTION COMMIT
END //


-- ----------------------------------------------------------------------------
-- Transaction 2.3: Atomic Room Repair Completion & Complaint Auto-Resolution
-- Tables Modified: room_inventory, inventory, complaints
-- ACID Feature: Restores warehouse inventory levels and marks tickets resolved
-- in a single atomic commit.
-- ----------------------------------------------------------------------------
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

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status = 'ERROR: Database transaction failed during repair completion. Changes rolled back.';
    END;

    -- Multi-table query: Join room_inventory, rooms, and inventory
    SELECT ri.inventory_id, ri.room_id, r.room_number, inv.item_name, ri.broken_quantity, ri.status 
    INTO v_inv_id, v_room_id, v_room_no, v_item_name, v_qty, v_curr_status
    FROM room_inventory ri
    JOIN rooms r ON ri.room_id = r.id
    JOIN inventory inv ON ri.inventory_id = inv.id
    WHERE ri.id = p_damage_id 
    LIMIT 1;

    -- Verify damage record exists
    IF v_inv_id IS NULL THEN
        SET p_status = 'ERROR: Damage record not found.';
        LEAVE proc_label;
    END IF;

    -- Verify not already repaired
    IF v_curr_status = 'REPAIRED' THEN
        SET p_status = 'INFO: Asset has already been repaired.';
        LEAVE proc_label;
    END IF;

    -- ATOMIC TRANSACTION START
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
    -- ATOMIC TRANSACTION COMMIT

    SET p_status = CONCAT('SUCCESS: Asset #', p_damage_id, ' (', v_item_name, ' in Room ', v_room_no, ') marked as REPAIRED. Stock restored & complaints resolved.');
END //


-- ----------------------------------------------------------------------------
-- Transaction 2.4: Atomic Staff Shift Check-In & Attendance Audit
-- Tables Modified: staff_attendance, user_audit_log
-- ACID Feature: Inserts duty clock-in time and immediately logs supervisor audit entry.
-- ----------------------------------------------------------------------------
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

    -- Error handler: If SQLEXCEPTION occurs, rollback transaction and report error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status = 'ERROR: Database transaction failed during staff check-in. Changes rolled back.';
    END;

    -- Query users table for staff profile
    SELECT id, full_name, role 
    INTO v_user_id, v_staff_name, v_department
    FROM users 
    WHERE student_id = p_staff_id AND role IN ('SECURITY', 'MAINTENANCE', 'CLEANING') 
    LIMIT 1;

    -- Validate staff authorization
    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Staff ID not found or unauthorized role.';
        LEAVE proc_label;
    END IF;

    -- Check if already clocked in for today
    SELECT id INTO v_existing_att 
    FROM staff_attendance 
    WHERE user_id = v_user_id AND date = CURRENT_DATE 
    LIMIT 1;

    IF v_existing_att IS NOT NULL THEN
        SET p_status = CONCAT('INFO: Staff member ', v_staff_name, ' is already checked in for today.');
        LEAVE proc_label;
    END IF;

    -- ATOMIC TRANSACTION START
    START TRANSACTION;
        -- Insert attendance record
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
    -- ATOMIC TRANSACTION COMMIT

    SET p_status = CONCAT('SUCCESS: Staff ', v_staff_name, ' (', p_staff_id, ' - ', v_department, ') checked in successfully.');
END //

DELIMITER ;

-- ============================================================================
-- VERIFICATION & DEMONSTRATION TEST CASES (ACID COMPLIANCE)
-- ============================================================================
-- 1. Test Payment Transaction:
-- CALL sp_RecordStudentPayment('TG/2021/0001', 'November 2026', 1500.00, @inv);
-- SELECT @inv AS invoice_result;
-- SELECT * FROM payment_audit_log ORDER BY id DESC LIMIT 1;
-- 
-- 2. Test Room Allocation Transaction:
-- CALL sp_AllocateStudentRoom('TG/2021/0001', 'A-102', @alloc_status);
-- SELECT @alloc_status AS allocation_result;
-- SELECT * FROM user_audit_log ORDER BY id DESC LIMIT 1;
-- ============================================================================
