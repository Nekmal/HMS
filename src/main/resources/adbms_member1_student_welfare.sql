-- ============================================================================
-- ADVANCE DATABASE MANAGEMENT SYSTEMS (ADBMS) - MINI PROJECT
-- UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM (HMS)
-- ============================================================================
-- MEMBER 1 CONTRIBUTION SCRIPT
-- DOMAIN: STUDENT WELFARE, ROOM ALLOCATIONS, GATE PASSES, COMPLAINTS & RESIDENCE
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
-- PREREQUISITE AUDIT & STATS TABLES FOR MEMBER 1
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

CREATE TABLE IF NOT EXISTS hostel_daily_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE,
    block_name VARCHAR(50),
    occupied_beds INT,
    total_capacity INT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 1: STORED PROCEDURES (MEMBER 1 - 4 PROCEDURES)
-- ============================================================================

DELIMITER //

-- Procedure 1.1: Safely allocate a student to a room with transaction & capacity checks
DROP PROCEDURE IF EXISTS sp_AllocateStudentRoom //
CREATE PROCEDURE sp_AllocateStudentRoom(
    IN p_student_id VARCHAR(50),
    IN p_room_number VARCHAR(50),
    OUT p_status VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_room_id BIGINT;
    DECLARE v_capacity INT;
    DECLARE v_occupancy INT;
    DECLARE v_current_room BIGINT;

    -- Find student
    SELECT id, room_id INTO v_user_id, v_current_room 
    FROM users 
    WHERE student_id = p_student_id AND role = 'STUDENT' 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    -- Find room details
    SELECT id, capacity, current_occupancy INTO v_room_id, v_capacity, v_occupancy 
    FROM rooms 
    WHERE room_number = p_room_number 
    LIMIT 1;

    IF v_room_id IS NULL THEN
        SET p_status = 'ERROR: Room number not found.';
        LEAVE proc_label;
    END IF;

    -- Check if room is already full
    IF v_occupancy >= v_capacity THEN
        SET p_status = CONCAT('ERROR: Room ', p_room_number, ' is full (Capacity: ', v_capacity, ').');
        LEAVE proc_label;
    END IF;

    -- Check if already assigned to this exact room
    IF v_current_room IS NOT NULL AND v_current_room = v_room_id THEN
        SET p_status = 'INFO: Student is already assigned to this room.';
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        -- If student was in another room, decrement old room occupancy
        IF v_current_room IS NOT NULL THEN
            UPDATE rooms 
            SET current_occupancy = GREATEST(0, current_occupancy - 1) 
            WHERE id = v_current_room;
        END IF;

        -- Assign new room to student
        UPDATE users 
        SET room_id = v_room_id 
        WHERE id = v_user_id;

        -- Increment new room occupancy
        UPDATE rooms 
        SET current_occupancy = LEAST(capacity, current_occupancy + 1) 
        WHERE id = v_room_id;

        -- Log allocation
        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (v_user_id, 'ROOM_ALLOCATION', IFNULL(v_current_room, 'NONE'), v_room_id, 'ADMIN');

    COMMIT;

    SET p_status = CONCAT('SUCCESS: Student allocated to Room ', p_room_number, '.');
END //

-- Procedure 1.2: Deallocate student from current room
DROP PROCEDURE IF EXISTS sp_DeallocateStudentRoom //
CREATE PROCEDURE sp_DeallocateStudentRoom(
    IN p_student_id VARCHAR(50),
    OUT p_status VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_current_room BIGINT;

    SELECT id, room_id INTO v_user_id, v_current_room 
    FROM users 
    WHERE student_id = p_student_id AND role = 'STUDENT' 
    LIMIT 1;

    IF v_user_id IS NULL THEN
        SET p_status = 'ERROR: Student ID not found.';
        LEAVE proc_label;
    END IF;

    IF v_current_room IS NULL THEN
        SET p_status = 'INFO: Student has no room currently assigned.';
        LEAVE proc_label;
    END IF;

    START TRANSACTION;
        UPDATE rooms 
        SET current_occupancy = GREATEST(0, current_occupancy - 1) 
        WHERE id = v_current_room;

        UPDATE users 
        SET room_id = NULL 
        WHERE id = v_user_id;

        INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
        VALUES (v_user_id, 'ROOM_DEALLOCATION', v_current_room, 'UNALLOCATED', 'ADMIN');
    COMMIT;

    SET p_status = 'SUCCESS: Student deallocated from room successfully.';
END //

-- Procedure 1.3: Evaluate and decide on a Student Gate Pass
DROP PROCEDURE IF EXISTS sp_ProcessGatePassApproval //
CREATE PROCEDURE sp_ProcessGatePassApproval(
    IN p_pass_id BIGINT,
    IN p_decision VARCHAR(20),
    IN p_reviewer VARCHAR(100),
    OUT p_result VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_current_status VARCHAR(50);
    DECLARE v_user_id BIGINT;

    SELECT status, user_id INTO v_current_status, v_user_id 
    FROM gate_passes 
    WHERE id = p_pass_id 
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

    INSERT INTO user_audit_log (user_id, action_type, old_value, new_value, performed_by)
    VALUES (v_user_id, 'GATE_PASS_DECISION', v_current_status, p_decision, p_reviewer);

    SET p_result = CONCAT('SUCCESS: Gate pass #', p_pass_id, ' marked as ', p_decision, '.');
END //

-- Procedure 1.4: Lodge a new student complaint with room and item classification
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
    DECLARE v_allocated_room VARCHAR(50);

    SELECT u.id, r.room_number INTO v_user_id, v_allocated_room 
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

    INSERT INTO complaints (user_id, room_number, item, description, status, created_at)
    VALUES (v_user_id, p_room_number, p_item, p_description, 'PENDING', CURRENT_DATE);

    SET p_complaint_id = LAST_INSERT_ID();
END //

DELIMITER ;

-- ============================================================================
-- SECTION 2: DATABASE TRIGGERS (MEMBER 1 - 4 TRIGGERS)
-- ============================================================================

DELIMITER //

-- Trigger 2.1: Auto-synchronize room occupancy counters when user room changes
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

-- Trigger 2.2: Validate gate pass dates before insertion
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

-- Trigger 2.3: Prevent room occupancy from ever exceeding room capacity
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
-- SECTION 3: STORED FUNCTIONS / UDFs (MEMBER 1 - 4 FUNCTIONS)
-- ============================================================================

DELIMITER //

-- Function 3.1: Calculate room occupancy rate percentage
DROP FUNCTION IF EXISTS fn_GetRoomOccupancyRate //
CREATE FUNCTION fn_GetRoomOccupancyRate(p_room_id BIGINT) 
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_cap INT DEFAULT 0;
    DECLARE v_occ INT DEFAULT 0;
    DECLARE v_rate DECIMAL(5,2) DEFAULT 0.00;

    SELECT capacity, current_occupancy INTO v_cap, v_occ 
    FROM rooms 
    WHERE id = p_room_id 
    LIMIT 1;

    IF v_cap > 0 THEN
        SET v_rate = ROUND((v_occ / v_cap) * 100.0, 2);
    END IF;

    RETURN v_rate;
END //

-- Function 3.2: Get total complaints filed by a student
DROP FUNCTION IF EXISTS fn_GetStudentTotalComplaints //
CREATE FUNCTION fn_GetStudentTotalComplaints(p_user_id BIGINT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_count INT DEFAULT 0;
    SELECT COUNT(*) INTO v_count FROM complaints WHERE user_id = p_user_id;
    RETURN v_count;
END //

-- Function 3.3: Check a student's active gate pass status
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

    SELECT status, from_date, to_date INTO v_pass_status, v_from, v_to
    FROM gate_passes 
    WHERE user_id = p_user_id 
    ORDER BY id DESC 
    LIMIT 1;

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

-- ============================================================================
-- SECTION 4: ANALYTICAL & REPORTING VIEWS (MEMBER 1 - 4 VIEWS)
-- ============================================================================

-- View 4.1: Comprehensive student residency & room allocation details
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
    CASE 
        WHEN r.current_occupancy >= r.capacity THEN 'FULL'
        WHEN r.current_occupancy > 0 THEN 'PARTIAL'
        WHEN r.id IS NOT NULL THEN 'EMPTY'
        ELSE 'NOT_APPLICABLE'
    END AS room_allocation_status
FROM users u
LEFT JOIN rooms r ON u.room_id = r.id
WHERE u.role = 'STUDENT';

-- View 4.2: Real-time Main Gate Departure Clearance view
CREATE OR REPLACE VIEW vw_ActiveGatePasses AS
SELECT 
    gp.id AS pass_id,
    u.student_id,
    u.full_name AS student_name,
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

-- View 4.3: Unresolved Student Complaints Dashboard
CREATE OR REPLACE VIEW vw_PendingComplaintsDashboard AS
SELECT 
    c.id AS complaint_id,
    c.created_at AS filed_date,
    DATEDIFF(CURRENT_DATE, c.created_at) AS days_pending,
    u.student_id,
    u.full_name AS student_name,
    c.room_number,
    IFNULL(c.item, 'General Fixture') AS damaged_item,
    c.description AS issue_description,
    c.status AS complaint_status,
    CASE 
        WHEN DATEDIFF(CURRENT_DATE, c.created_at) >= 5 THEN 'HIGH_OVERDUE'
        WHEN DATEDIFF(CURRENT_DATE, c.created_at) >= 2 THEN 'MEDIUM_PENDING'
        ELSE 'NORMAL'
    END AS urgency_level
FROM complaints c
JOIN users u ON c.user_id = u.id
WHERE c.status <> 'RESOLVED';

-- View 4.4: Hostel Block & Room Occupancy Analytics
CREATE OR REPLACE VIEW vw_RoomOccupancyOverview AS
SELECT 
    block_name,
    COUNT(id) AS total_rooms,
    SUM(capacity) AS total_capacity_beds,
    SUM(current_occupancy) AS total_occupied_beds,
    (SUM(capacity) - SUM(current_occupancy)) AS total_available_beds,
    ROUND((SUM(current_occupancy) / SUM(capacity)) * 100.0, 1) AS overall_occupancy_percentage,
    SUM(CASE WHEN current_occupancy >= capacity THEN 1 ELSE 0 END) AS fully_occupied_rooms,
    SUM(CASE WHEN current_occupancy = 0 THEN 1 ELSE 0 END) AS vacant_rooms
FROM rooms
GROUP BY block_name;

-- ============================================================================
-- SECTION 5: PERFORMANCE INDEXES (MEMBER 1 - 4 INDEXES)
-- ============================================================================

-- Index 5.1: Index on users(student_id) for rapid student credential & TG lookup
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- Index 5.2: Composite index on users(room_id, role) for roommate queries
CREATE INDEX IF NOT EXISTS idx_users_room_role ON users(room_id, role);

-- Index 5.3: Composite index on gate_passes(user_id, status) for student pass lookups
CREATE INDEX IF NOT EXISTS idx_gate_passes_user_status ON gate_passes(user_id, status);

-- Index 5.4: Composite index on complaints(status, room_number) for maintenance ticket filtering
CREATE INDEX IF NOT EXISTS idx_complaints_status_room ON complaints(status, room_number);

-- ============================================================================
-- SECTION 6: SCHEDULED EVENTS (MEMBER 1 - 4 EVENTS)
-- ============================================================================

DELIMITER //

-- Event 6.1: Auto-expire unreviewed gate passes whose departure date has passed
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
