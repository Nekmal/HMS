USE hms_db;

-- ============================================================================
-- TEST MEMBER 2 UPGRADED MULTI-TABLE VIEWS
-- ============================================================================

-- View 4.1: (Joins 3 tables: payments, users, rooms)
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

-- View 4.2: (Joins 3 tables: inventory, room_inventory, complaints)
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

-- View 4.3: (Joins 4 tables: room_inventory, rooms, inventory, users)
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

-- View 4.4: (Joins 3 tables: users, staff_attendance, user_audit_log)
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
