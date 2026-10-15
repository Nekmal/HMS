USE hms_db;

DELIMITER //

-- ============================================================================
-- MEMBER 2: ENHANCED MULTI-TABLE STORED PROCEDURES
-- ============================================================================

-- Procedure 1.1: Multi-table payment processing (users, rooms, payments, payment_audit_log)
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

-- Procedure 1.2: Multi-table room damage reporting (rooms, inventory, room_inventory, complaints)
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

-- Procedure 1.3: Multi-table room repair completion & complaint resolution (room_inventory, inventory, rooms, complaints)
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

-- Procedure 1.4: Multi-table staff shift registration (users, staff_attendance, user_audit_log)
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
