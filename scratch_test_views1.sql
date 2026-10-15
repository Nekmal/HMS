USE hms_db;

-- ============================================================================
-- TEST MEMBER 1 UPGRADED MULTI-TABLE VIEWS & PROCEDURES
-- ============================================================================

-- View 4.1 (Joins 4 tables: users, rooms, payments, complaints)
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

-- View 4.2 (Joins 3 tables: gate_passes, users, rooms)
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

-- View 4.3 (Joins 4 tables: complaints, users, rooms, inventory)
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

-- View 4.4 (Joins 4 tables: rooms, users, room_inventory, complaints)
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
