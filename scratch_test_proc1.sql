USE hms_db;

DELIMITER //

-- ============================================================================
-- MEMBER 1: ENHANCED MULTI-TABLE STORED PROCEDURES
-- ============================================================================

-- Procedure 1.1: Multi-table room allocation (users, rooms, payments, room_inventory, user_audit_log)
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

    -- Multi-table query: Find student and join current room details
    SELECT u.id, u.full_name, u.room_id, r.room_number 
    INTO v_user_id, v_student_name, v_current_room, v_current_room_no
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE u.student_id = p_student_id AND u.role = 'STUDENT' 
    LIMIT 1;

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

    IF v_room_id IS NULL THEN
        SET p_status = CONCAT('ERROR: Target room ', p_room_number, ' does not exist.');
        LEAVE proc_label;
    END IF;

    -- Check capacity
    IF v_occupancy >= v_capacity THEN
        SET p_status = CONCAT('ERROR: Room ', p_room_number, ' is full (Capacity: ', v_capacity, ').');
        LEAVE proc_label;
    END IF;

    -- Check if already assigned
    IF v_current_room IS NOT NULL AND v_current_room = v_room_id THEN
        SET p_status = CONCAT('INFO: Student ', v_student_name, ' is already allocated to Room ', p_room_number, '.');
        LEAVE proc_label;
    END IF;

    -- Check student payment standing across payments table
    SELECT COUNT(*) INTO v_payments_count FROM payments WHERE user_id = v_user_id;

    START TRANSACTION;
        -- If student was in another room, decrement previous room occupancy
        IF v_current_room IS NOT NULL THEN
            UPDATE rooms 
            SET current_occupancy = GREATEST(0, current_occupancy - 1) 
            WHERE id = v_current_room;
        END IF;

        -- Update users table with new room_id
        UPDATE users 
        SET room_id = v_room_id 
        WHERE id = v_user_id;

        -- Increment target room occupancy
        UPDATE rooms 
        SET current_occupancy = LEAST(capacity, current_occupancy + 1) 
        WHERE id = v_room_id;

        -- Insert audit log with joined information
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'ROOM_ALLOCATION', 
            IFNULL(v_current_room_no, 'UNALLOCATED'), 
            CONCAT(p_room_number, ' (', v_block, ')'), 
            'ADMIN'
        );
    COMMIT;

    SET p_status = CONCAT('SUCCESS: Student ', v_student_name, ' (', p_student_id, ') allocated to Room ', p_room_number, ' [', v_block, '].');
END //

-- Procedure 1.2: Multi-table room deallocation with clearance checks (users, rooms, complaints, user_audit_log)
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

    -- Multi-table query: Join users and rooms
    SELECT u.id, u.full_name, u.room_id, r.room_number
    INTO v_user_id, v_student_name, v_room_id, v_room_no
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE u.student_id = p_student_id AND u.role = 'STUDENT' 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    IF v_room_id IS NULL THEN
        SET p_status = CONCAT('INFO: Student ', v_student_name, ' has no active room allocation.');
        LEAVE proc_label;
    END IF;

    -- Multi-table check: Check complaints table for pending hostel issues
    SELECT COUNT(*) INTO v_pending_complaints 
    FROM complaints 
    WHERE user_id = v_user_id AND status <> 'RESOLVED';

    START TRANSACTION;
        UPDATE rooms 
        SET current_occupancy = GREATEST(0, current_occupancy - 1) 
        WHERE id = v_room_id;

        UPDATE users 
        SET room_id = NULL 
        WHERE id = v_user_id;

        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (
            v_user_id, 
            'ROOM_DEALLOCATION', 
            v_room_no, 
            CONCAT('DEALLOCATED (Pending Complaints: ', v_pending_complaints, ')'), 
            'ADMIN'
        );
    COMMIT;

    SET p_status = CONCAT('SUCCESS: Student ', v_student_name, ' deallocated from Room ', v_room_no, '. Pending issues: ', v_pending_complaints, '.');
END //

-- Procedure 1.3: Multi-table gate pass clearance (gate_passes, users, rooms, user_audit_log)
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

    -- Multi-table query joining gate_passes, users, and rooms
    SELECT gp.status, gp.user_id, u.student_id, u.full_name, IFNULL(r.room_number, 'UNASSIGNED')
    INTO v_current_status, v_user_id, v_student_id, v_student_name, v_room_number
    FROM gate_passes gp
    JOIN users u ON gp.user_id = u.id
    LEFT JOIN rooms r ON u.room_id = r.id
    WHERE gp.id = p_pass_id 
    LIMIT 1;

    IF v_current_status IS NULL THEN
        SET p_result = 'ERROR: Gate pass ID not found.';
        LEAVE proc_label;
    END IF;

    IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
        SET p_result = 'ERROR: Decision must be APPROVED or REJECTED.';
        LEAVE proc_label;
    END IF;

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

    SET p_result = CONCAT('SUCCESS: Gate pass #', p_pass_id, ' for ', v_student_name, ' (Room ', v_room_number, ') marked as ', p_decision, '.');
END //

-- Procedure 1.4: Multi-table student complaint filing with inventory cross-reference
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

    -- Multi-table query: Join users and rooms
    SELECT u.id, u.full_name, r.room_number 
    INTO v_user_id, v_student_name, v_allocated_room 
    FROM users u 
    LEFT JOIN rooms r ON u.room_id = r.id 
    WHERE u.student_id = p_student_id 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_complaint_id = -1;
        LEAVE proc_label;
    END IF;

    IF p_room_number IS NULL OR TRIM(p_room_number) = '' THEN
        SET p_room_number = IFNULL(v_allocated_room, 'UNSPECIFIED');
    END IF;

    -- Multi-table check: Cross-reference inventory warehouse table
    SELECT IFNULL(available_quantity, 0) INTO v_inv_avail
    FROM inventory 
    WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(p_item))
    LIMIT 1;

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
END //

DELIMITER ;
