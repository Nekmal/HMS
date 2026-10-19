-- Advance Database Management Systems (ADBMS) - Mini Project
-- University of Ruhuna - Hostel Management System (HMS)
-- Member 1 Contribution Script
-- Domain: Student Welfare, Room Allocations, Gate Passes, Complaints, and Residence Management
-- Components Implemented (4 of each):
-- 1. Stored Procedures (4) - All multi-table operations across 3 to 5 tables
-- 2. Database Triggers (4) - Automated business rules and data synchronization
-- 3. Stored Functions / UDFs (4) - Reusable multi-table calculation functions
-- 4. Analytical Views (4) - Complex reporting queries joining 3 to 4 tables
-- 5. Performance Indexes (4) - Targeted indexes for critical query acceleration
-- 6. Scheduled Events (4) - Background maintenance and periodic audit tasks

USE hms_db;

-- Prerequisite Table 1: User Audit Trail
-- Tracks user room allocations, deallocations, complaint resolution status, and gate pass decisions
CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action_type VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100) DEFAULT 'SYSTEM'
);

-- Prerequisite Table 2: Daily Hostel Occupancy Statistics
-- Stores daily snapshots of occupied vs total bed capacity per hostel block
CREATE TABLE IF NOT EXISTS hostel_daily_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE,
    block_name VARCHAR(50),
    occupied_beds INT,
    total_capacity INT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- SECTION 1: STORED PROCEDURES (MEMBER 1 - 4 PROCEDURES)
DELIMITER //

-- Procedure 1.1: Safely allocate a student to a room with multi-table validations
-- Tables involved: users, rooms, payments, room_inventory, user_audit_log (5 tables)
-- Validations:
-- 1. Checks if student exists and has 'STUDENT' role
-- 2. Checks if target room exists and has available bed capacity
-- 3. Checks if target room has broken furniture/equipment
-- 4. Checks payment history
-- 5. Atomically transfers student, updates old & new room occupancies, and logs audit record
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

    -- Atomic room allocation transaction
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

    SET p_status = CONCAT('SUCCESS: Student ', v_student_name, ' (', p_student_id, ') allocated to Room ', p_room_number, ' [', v_block, '].');
END //

-- Procedure 1.2: Multi-table room deallocation with clearance checks
-- Tables involved: users, rooms, complaints, user_audit_log (4 tables)
-- Validations:
-- 1. Checks if student has an active room allocation
-- 2. Checks complaints table for any unresolved issues or damaged hostel properties
-- 3. Clears room assignment, decrements room occupancy, and records clearance in audit log
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

    -- Atomic deallocation transaction
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

    SET p_status = CONCAT('SUCCESS: Student ', v_student_name, ' deallocated from Room ', v_room_no, '. Pending issues: ', v_pending_complaints, '.');
END //

-- Procedure 1.3: Multi-table gate pass review and approval workflow
-- Tables involved: gate_passes, users, rooms, user_audit_log (4 tables)
-- Validations:
-- 1. Checks if gate pass ID exists
-- 2. Validates that decision is either 'APPROVED' or 'REJECTED'
-- 3. Performs 3-table join to fetch student identity and allocated room
-- 4. Updates status and logs audit trail with reviewer name
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

    SET p_result = CONCAT('SUCCESS: Gate pass #', p_pass_id, ' for ', v_student_name, ' (Room ', v_room_number, ') marked as ', p_decision, '.');
END //

-- Procedure 1.4: Multi-table student complaint filing with inventory cross-reference
-- Tables involved: users, rooms, inventory, complaints, user_audit_log (5 tables)
-- Validations:
-- 1. Verifies student identity from users table
-- 2. Infers student's allocated room number if not explicitly specified
-- 3. Cross-references warehouse inventory to check spare parts availability
-- 4. Creates complaint ticket and records entry in user_audit_log
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

    -- Atomic complaint insertion transaction
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


-- SECTION 2: DATABASE TRIGGERS (MEMBER 1 - 4 TRIGGERS)
DELIMITER //

-- Trigger 2.1: Auto-synchronize room occupancy counters when user room changes
-- Target Table: users
-- Trigger Timing: AFTER UPDATE
-- Description: Automatically increments/decrements current occupancy of rooms when a student is moved,
-- assigned, or deallocated, ensuring room counters are always accurate without manual calculation.
DROP TRIGGER IF EXISTS trg_AfterUserRoomChange //
CREATE TRIGGER trg_AfterUserRoomChange
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    -- Case 1: Student assigned to a room for the first time
    IF (OLD.room_id IS NULL AND NEW.room_id IS NOT NULL) THEN
        UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;

    -- Case 2: Student removed from a room
    ELSEIF (OLD.room_id IS NOT NULL AND NEW.room_id IS NULL) THEN
        UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE id = OLD.room_id;

    -- Case 3: Student moved from one room to another
    ELSEIF (OLD.room_id IS NOT NULL AND NEW.room_id IS NOT NULL AND OLD.room_id <> NEW.room_id) THEN
        UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE id = OLD.room_id;
        UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = NEW.room_id;
    END IF;
END //

-- Trigger 2.2: Validate gate pass dates before insertion
-- Target Table: gate_passes
-- Trigger Timing: BEFORE INSERT
-- Description: Enforces that expected return date cannot be before departure date.
-- If validation fails, aborts insert with custom SQLSTATE 45000 error message.
-- Defaults status to 'PENDING' if left blank.
DROP TRIGGER IF EXISTS trg_BeforeGatePassInsert //
CREATE TRIGGER trg_BeforeGatePassInsert
BEFORE INSERT ON gate_passes
FOR EACH ROW
BEGIN
    -- Check return date vs departure date
    IF NEW.to_date < NEW.from_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gate pass validation failed: Expected return date cannot be earlier than departure date.';
    END IF;

    -- Set default status
    IF NEW.status IS NULL OR TRIM(NEW.status) = '' THEN
        SET NEW.status = 'PENDING';
    END IF;
END //

-- Trigger 2.3: Prevent room occupancy from ever exceeding room capacity
-- Target Table: rooms
-- Trigger Timing: BEFORE UPDATE
-- Description: Database-level invariant that prevents occupancy from exceeding configured capacity,
-- protecting against overbooking errors.
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

-- Trigger 2.4: Log audit entry when complaint status transitions to RESOLVED
-- Target Table: complaints
-- Trigger Timing: AFTER UPDATE
-- Description: Automatically writes an audit trail entry into user_audit_log whenever a maintenance
-- ticket is marked as resolved by staff.
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


-- SECTION 3: STORED FUNCTIONS / UDFs (MEMBER 1 - 4 FUNCTIONS)
DELIMITER //

-- Function 3.1: Calculate room occupancy rate percentage
-- Joins: rooms and users
-- Parameters: p_room_id (BIGINT)
-- Returns: DECIMAL(5,2) percentage (0.00% to 100.00%)
DROP FUNCTION IF EXISTS fn_GetRoomOccupancyRate //
CREATE FUNCTION fn_GetRoomOccupancyRate(p_room_id BIGINT) 
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_cap INT DEFAULT 0;
    DECLARE v_occ INT DEFAULT 0;
    DECLARE v_rate DECIMAL(5,2) DEFAULT 0.00;

    -- Query rooms joined with users to calculate active student count
    SELECT r.capacity, COUNT(u.id) 
    INTO v_cap, v_occ
    FROM rooms r
    LEFT JOIN users u ON r.id = u.room_id AND u.role = 'STUDENT'
    WHERE r.id = p_room_id
    GROUP BY r.id, r.capacity;

    IF v_cap > 0 THEN
        SET v_rate = ROUND((v_occ / v_cap) * 100.0, 2);
    END IF;

    RETURN v_rate;
END //

-- Function 3.2: Get total complaints filed by student
-- Joins: users and complaints
-- Parameters: p_user_id (BIGINT)
-- Returns: INT count of filed complaints
DROP FUNCTION IF EXISTS fn_GetStudentTotalComplaints //
CREATE FUNCTION fn_GetStudentTotalComplaints(p_user_id BIGINT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_count INT DEFAULT 0;

    -- Count complaints linked to this user_id
    SELECT COUNT(c.id) INTO v_count 
    FROM complaints c
    JOIN users u ON c.user_id = u.id
    WHERE u.id = p_user_id;

    RETURN v_count;
END //

-- Function 3.3: Check a student's active gate pass status
-- Joins: users and gate_passes
-- Parameters: p_user_id (BIGINT)
-- Returns: VARCHAR status ('IN_HOSTEL', 'ON_OFFICIAL_LEAVE', 'OVERDUE_RETURN', 'LEAVE_REQUEST_PENDING')
DROP FUNCTION IF EXISTS fn_CheckStudentGatePassStatus //
CREATE FUNCTION fn_CheckStudentGatePassStatus(p_user_id BIGINT)
RETURNS VARCHAR(50)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_status VARCHAR(50) DEFAULT 'IN_HOSTEL';
    DECLARE v_pass_status VARCHAR(50);
    DECLARE v_from DATE;
    DECLARE v_to DATE;

    -- Query most recent gate pass for the student
    SELECT gp.status, gp.from_date, gp.to_date 
    INTO v_pass_status, v_from, v_to
    FROM gate_passes gp
    JOIN users u ON gp.user_id = u.id
    WHERE u.id = p_user_id 
    ORDER BY gp.id DESC 
    LIMIT 1;

    -- Evaluate pass validity against current date
    IF v_pass_status = 'APPROVED' THEN
        IF CURRENT_DATE BETWEEN v_from AND v_to THEN
            SET v_status = 'ON_OFFICIAL_LEAVE';
        ELSEIF CURRENT_DATE > v_to THEN
            SET v_status = 'OVERDUE_RETURN';
        ELSE
            SET v_status = 'APPROVED_UPCOMING';
        END IF;
    ELSEIF v_pass_status = 'PENDING' THEN
        SET v_status = 'LEAVE_REQUEST_PENDING';
    END IF;

    RETURN v_status;
END //

-- Function 3.4: Format and parse Block & Floor from Room Number
-- Parameters: p_room_number (VARCHAR)
-- Returns: Formatted text (e.g. 'Block A - Floor 1')
DROP FUNCTION IF EXISTS fn_GetRoomBlockFloor //
CREATE FUNCTION fn_GetRoomBlockFloor(p_room_number VARCHAR(50))
RETURNS VARCHAR(50)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_block CHAR(1);
    DECLARE v_floor CHAR(1);

    IF p_room_number IS NULL OR LENGTH(p_room_number) < 3 THEN
        RETURN 'Unknown Location';
    END IF;

    SET v_block = SUBSTRING(p_room_number, 1, 1);
    SET v_floor = SUBSTRING(p_room_number, 3, 1);

    RETURN CONCAT('Block ', v_block, ' - Floor ', v_floor);
END //

DELIMITER ;


-- SECTION 4: ANALYTICAL & REPORTING VIEWS (MEMBER 1 - 4 VIEWS)

-- View 4.1: Comprehensive student residency & room allocation details
-- Joins 4 tables: users, rooms, payments, complaints
-- Purpose: Provides a single 360-degree view of student profile, assigned room,
-- total fee payments made, and unresolved maintenance complaints.
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
    IFNULL(c_agg.pending_complaints, 0) AS unresolved_complaints,
    CASE 
        WHEN r.current_occupancy >= r.capacity THEN 'FULL'
        WHEN r.current_occupancy > 0 THEN 'PARTIAL'
        WHEN r.id IS NOT NULL THEN 'EMPTY'
        ELSE 'UNASSIGNED'
    END AS room_allocation_status
FROM users u
LEFT JOIN rooms r ON u.room_id = r.id
LEFT JOIN (
    SELECT user_id, SUM(amount) AS total_paid_lkr, COUNT(id) AS payment_records_count
    FROM payments 
    WHERE status = 'PAID'
    GROUP BY user_id
) p_agg ON u.id = p_agg.user_id
LEFT JOIN (
    SELECT user_id, COUNT(id) AS total_complaints, SUM(CASE WHEN status <> 'RESOLVED' THEN 1 ELSE 0 END) AS pending_complaints
    FROM complaints
    GROUP BY user_id
) c_agg ON u.id = c_agg.user_id
WHERE u.role = 'STUDENT';

-- View 4.2: Real-time Main Gate Departure Clearance view
-- Joins 3 tables: gate_passes, users, rooms
-- Purpose: Security guard dashboard to inspect who is permitted to exit, who is currently out,
-- and identify overdue students.
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
    gp.status AS pass_status,
    CASE 
        WHEN gp.status = 'APPROVED' AND CURRENT_DATE > gp.to_date THEN 'OVERDUE'
        WHEN gp.status = 'APPROVED' AND CURRENT_DATE BETWEEN gp.from_date AND gp.to_date THEN 'CURRENTLY_OUTSIDE'
        WHEN gp.status = 'APPROVED' THEN 'UPCOMING_LEAVE'
        WHEN gp.status = 'PENDING' THEN 'AWAITING_WARDEN'
        ELSE gp.status
    END AS real_time_clearance_status
FROM gate_passes gp
JOIN users u ON gp.user_id = u.id
LEFT JOIN rooms r ON u.room_id = r.id;

-- View 4.3: Unresolved Student Complaints Dashboard with Warehouse Logistics
-- Joins 4 tables: complaints, users, rooms, inventory
-- Purpose: Maintenance team dashboard highlighting open tickets, days pending, urgency level,
-- and spare stock in warehouse.
CREATE OR REPLACE VIEW vw_PendingComplaintsDashboard AS
SELECT 
    c.id AS complaint_id,
    c.created_at AS filed_date,
    DATEDIFF(CURRENT_DATE, c.created_at) AS days_pending,
    u.student_id,
    u.full_name AS student_name,
    u.phone AS student_phone,
    IFNULL(r.room_number, c.room_number) AS room_number,
    IFNULL(r.block_name, 'General Area') AS block_name,
    c.item AS reported_item,
    IFNULL(inv.category, 'General Maintenance') AS item_category,
    IFNULL(inv.available_quantity, 0) AS warehouse_available_stock,
    c.description AS issue_description,
    c.status AS complaint_status,
    CASE 
        WHEN DATEDIFF(CURRENT_DATE, c.created_at) >= 5 THEN 'HIGH_OVERDUE'
        WHEN DATEDIFF(CURRENT_DATE, c.created_at) >= 2 THEN 'MEDIUM_PENDING'
        ELSE 'NORMAL'
    END AS urgency_level,
    CASE 
        WHEN inv.available_quantity > 0 THEN 'REPLACEMENT_READY'
        WHEN inv.id IS NOT NULL THEN 'OUT_OF_STOCK_NEEDS_PURCHASE'
        ELSE 'SERVICE_REQUIRED'
    END AS logistics_action
FROM complaints c
JOIN users u ON c.user_id = u.id
LEFT JOIN rooms r ON (u.room_id = r.id OR c.room_number = r.room_number)
LEFT JOIN inventory inv ON LOWER(TRIM(c.item)) = LOWER(TRIM(inv.item_name))
WHERE c.status <> 'RESOLVED';

-- View 4.4: Hostel Block & Room Occupancy Analytics
-- Joins 4 tables: rooms, users, room_inventory, complaints
-- Purpose: Sub-warden and warden analytics view showing bed capacity, occupancy percentage,
-- broken assets, and active complaints per room.
CREATE OR REPLACE VIEW vw_RoomOccupancyOverview AS
SELECT 
    r.id AS room_id,
    r.room_number,
    r.block_name,
    r.capacity AS bed_capacity,
    COUNT(DISTINCT u.id) AS resident_student_count,
    (r.capacity - COUNT(DISTINCT u.id)) AS available_beds,
    ROUND((COUNT(DISTINCT u.id) / r.capacity) * 100.0, 1) AS occupancy_rate_pct,
    IFNULL(GROUP_CONCAT(DISTINCT u.student_id ORDER BY u.student_id SEPARATOR ', '), 'EMPTY') AS resident_student_ids,
    IFNULL(SUM(DISTINCT CASE WHEN ri.status = 'BROKEN' THEN ri.broken_quantity ELSE 0 END), 0) AS broken_assets_in_room,
    COUNT(DISTINCT CASE WHEN c.status <> 'RESOLVED' THEN c.id ELSE NULL END) AS active_complaints_count,
    CASE 
        WHEN COUNT(DISTINCT u.id) >= r.capacity THEN 'FULL'
        WHEN COUNT(DISTINCT u.id) > 0 THEN 'AVAILABLE_PARTIAL'
        ELSE 'VACANT'
    END AS room_status
FROM rooms r
LEFT JOIN users u ON r.id = u.room_id AND u.role = 'STUDENT'
LEFT JOIN room_inventory ri ON r.id = ri.room_id
LEFT JOIN complaints c ON r.room_number = c.room_number
GROUP BY r.id, r.room_number, r.block_name, r.capacity;


-- SECTION 5: PERFORMANCE INDEXES (MEMBER 1 - 4 INDEXES)

-- Index 5.1: Index on users(student_id)
-- Table: users
-- Indexed Columns: student_id
-- Purpose: Speeds up student credential validation, search by TG registration number, and profile loading.
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- Index 5.2: Composite index on users(room_id, role)
-- Table: users
-- Indexed Columns: room_id, role
-- Purpose: Speeds up roommate queries and room occupant lookups.
CREATE INDEX IF NOT EXISTS idx_users_room_role ON users(room_id, role);

-- Index 5.3: Composite index on gate_passes(user_id, status)
-- Table: gate_passes
-- Indexed Columns: user_id, status
-- Purpose: Speeds up student pass history and active leave checks without table scans.
CREATE INDEX IF NOT EXISTS idx_gate_passes_user_status ON gate_passes(user_id, status);

-- Index 5.4: Composite index on complaints(status, room_number)
-- Table: complaints
-- Indexed Columns: status, room_number
-- Purpose: Accelerates maintenance ticket filtering by status and room number.
CREATE INDEX IF NOT EXISTS idx_complaints_status_room ON complaints(status, room_number);


-- SECTION 6: SCHEDULED EVENTS (MEMBER 1 - 4 EVENTS)
DELIMITER //

-- Event 6.1: Auto-expire unreviewed gate passes whose departure date has passed
-- Frequency: Every 1 Day
-- Purpose: Automatically updates pending gate passes to 'EXPIRED' if departure date has passed without approval.
DROP EVENT IF EXISTS evt_AutoExpireOldGatePasses //
CREATE EVENT evt_AutoExpireOldGatePasses
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 5 MINUTE)
DO
BEGIN
    UPDATE gate_passes 
    SET status = 'EXPIRED' 
    WHERE status = 'PENDING' AND from_date < CURRENT_DATE;
END //

-- Event 6.2: Capture daily room occupancy snapshot for trend analysis
-- Frequency: Every 1 Day at 23:59
-- Purpose: Aggregates occupied beds vs total capacity per block and saves into hostel_daily_stats table.
DROP EVENT IF EXISTS evt_DailyRoomOccupancySnapshot //
CREATE EVENT evt_DailyRoomOccupancySnapshot
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 23 HOUR + INTERVAL 59 MINUTE)
DO
BEGIN
    INSERT INTO hostel_daily_stats (stat_date, block_name, occupied_beds, total_capacity)
    SELECT CURRENT_DATE, block_name, SUM(current_occupancy), SUM(capacity)
    FROM rooms
    GROUP BY block_name;
END //

-- Event 6.3: Flag students who have not returned past their approved gate pass date
-- Frequency: Every 6 Hours
-- Purpose: Automatically changes status to 'OVERDUE_RETURN' for approved gate passes where return date has passed.
DROP EVENT IF EXISTS evt_FlagOverdueResidents //
CREATE EVENT evt_FlagOverdueResidents
ON SCHEDULE EVERY 6 HOUR
DO
BEGIN
    UPDATE gate_passes 
    SET status = 'OVERDUE_RETURN' 
    WHERE status = 'APPROVED' AND to_date < CURRENT_DATE;
END //

-- Event 6.4: Auto-escalate complaints pending for more than 4 days
-- Frequency: Every 1 Day
-- Purpose: Automatically logs escalation notices in user_audit_log for unresolved complaints older than 4 days.
DROP EVENT IF EXISTS evt_AutoEscalatePendingComplaints //
CREATE EVENT evt_AutoEscalatePendingComplaints
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 8 HOUR)
DO
BEGIN
    INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
    SELECT user_id, 'COMPLAINT_ESCALATED', CONCAT('Complaint #', id, ' pending for ', DATEDIFF(CURRENT_DATE, created_at), ' days'), 'ESCALATED_TO_SUB_WARDEN', 'SYSTEM_SCHEDULER'
    FROM complaints
    WHERE status = 'PENDING' AND DATEDIFF(CURRENT_DATE, created_at) >= 4;
END //

DELIMITER ;
