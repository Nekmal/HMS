-- ============================================================================
-- Advance Database Management Systems (ADBMS) - Mini Project
-- University of Ruhuna - Hostel Management System (HMS)
-- Comprehensive Execution & Verification Script for all 8 Stored Functions (UDFs)
-- Master Dataset: 100 Rooms, 160 Students, 15 Staff, 1,800+ Shifts
-- ============================================================================

SET NAMES utf8mb4;
USE hms_db;

-- ----------------------------------------------------------------------------
-- Function 1: Monthly Total Revenue Calculator
-- Domain: Hostel Treasury & Financial Analytics
-- Description: Aggregates total paid student accommodation fees for a given billing month
-- ----------------------------------------------------------------------------
SELECT 
    '1. fn_CalculateMonthlyTotalRevenue' AS Function_Name,
    'October 2026' AS Billing_Month,
    fn_CalculateMonthlyTotalRevenue('October 2026') AS Collected_Revenue_LKR;

-- ----------------------------------------------------------------------------
-- Function 2: Student Fee Arrears Calculator
-- Domain: Student Accounts & Defaulter Tracking
-- Description: Multi-table financial check calculating unpaid invoices for a student
-- ----------------------------------------------------------------------------
SELECT 
    '2. fn_CalculateStudentFeeArrears' AS Function_Name,
    u.student_id,
    u.full_name AS Student_Name,
    fn_CalculateStudentFeeArrears(u.id) AS Total_Arrears_LKR
FROM users u 
WHERE u.student_id IN ('TG/2021/0001', 'TG/2021/0005', 'TG/2021/0025');

-- ----------------------------------------------------------------------------
-- Function 3: Student Gate Pass Status Checker
-- Domain: Student Welfare & Campus Gate Clearance
-- Description: Queries active leave/gate pass status for student campus departure verification
-- ----------------------------------------------------------------------------
SELECT 
    '3. fn_CheckStudentGatePassStatus' AS Function_Name,
    u.student_id,
    u.full_name AS Student_Name,
    fn_CheckStudentGatePassStatus(u.id) AS Real_Time_Gate_Clearance
FROM users u 
WHERE u.student_id IN ('TG/2021/0001', 'TG/2021/0069', 'TG/2021/0081');

-- ----------------------------------------------------------------------------
-- Function 4: Warehouse Item Stock Availability Checker
-- Domain: Inventory Logistics & Facility Maintenance
-- Description: Returns net available quantity of equipment after subtracting broken items
-- ----------------------------------------------------------------------------
SELECT 
    '4. fn_GetItemAvailableStock' AS Function_Name,
    i.id AS Item_ID,
    i.item_name AS Catalog_Item,
    i.category,
    fn_GetItemAvailableStock(i.id) AS Available_Units
FROM inventory i 
WHERE i.id IN (1, 2, 3, 5, 7);

-- ----------------------------------------------------------------------------
-- Function 5: Room Block & Floor Extractor
-- Domain: Residence Management & Spatial Mapping
-- Description: Parses room numbering patterns to derive designated block and floor level
-- ----------------------------------------------------------------------------
SELECT 
    '5. fn_GetRoomBlockFloor' AS Function_Name,
    r.room_number,
    r.block_name,
    fn_GetRoomBlockFloor(r.room_number) AS Architectural_Floor_Assignment
FROM rooms r 
WHERE r.room_number IN ('A-101', 'A-125', 'B-201', 'C-315', 'D-420');

-- ----------------------------------------------------------------------------
-- Function 6: Room Occupancy Rate Calculator
-- Domain: Hostel Administration & Bed Space Utilization
-- Description: Calculates percentage of occupied beds against configured room capacity
-- ----------------------------------------------------------------------------
SELECT 
    '6. fn_GetRoomOccupancyRate' AS Function_Name,
    r.room_number,
    r.block_name,
    r.capacity AS Total_Beds,
    r.current_occupancy AS Occupied_Beds,
    fn_GetRoomOccupancyRate(r.id) AS Occupancy_Rate_Pct
FROM rooms r 
WHERE r.room_number IN ('A-101', 'A-125', 'B-215', 'B-220', 'C-301');

-- ----------------------------------------------------------------------------
-- Function 7: Staff Monthly Present Days Counter
-- Domain: Human Resources, Security & Housekeeping Shift Duty
-- Description: Aggregates total verified present duty shifts for a staff employee in a given month
-- ----------------------------------------------------------------------------
SELECT 
    '7. fn_GetStaffMonthlyPresentDays' AS Function_Name,
    u.student_id AS Staff_Code,
    u.full_name AS Staff_Name,
    u.role AS Department,
    'October 2026' AS Duty_Period,
    fn_GetStaffMonthlyPresentDays(u.id, 2026, 10) AS Present_Days_Logged
FROM users u 
WHERE u.role IN ('SECURITY', 'MAINTENANCE', 'CLEANING')
LIMIT 6;

-- ----------------------------------------------------------------------------
-- Function 8: Student Lifetime Complaints Aggregator
-- Domain: Student Residence Welfare & Grievance Resolution
-- Description: Counts total maintenance tickets and breakdown complaints filed by a student
-- ----------------------------------------------------------------------------
SELECT 
    '8. fn_GetStudentTotalComplaints' AS Function_Name,
    u.student_id,
    u.full_name AS Student_Name,
    fn_GetStudentTotalComplaints(u.id) AS Total_Complaints_Filed
FROM users u 
WHERE u.student_id IN ('TG/2021/0001', 'TG/2021/0005', 'TG/2021/0009', 'TG/2021/0013');
