-- ============================================================================
-- Advance Database Management Systems (ADBMS) - Comprehensive Sample Dataset
-- University of Ruhuna - Hostel Management System (HMS)
-- Zero ORM Architecture - Pure SQL Realistic Historical Seeding Script
-- Current System Date Reference: 2026-10-27
-- ============================================================================
-- This script populates all 13 core relational tables and audit stores with
-- cohesive, multi-table historical data reflecting active hostel operations
-- across staff shifts, resident students, room allocations, monthly fee
-- collections, maintenance work orders, security gate passes, and inventory.
-- ============================================================================

USE hms_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. HOSTEL ROOMS (Blocks A, B, C, D - Multi-floor allocation)
-- ----------------------------------------------------------------------------
DELETE FROM rooms;

INSERT INTO rooms (id, room_number, block_name, capacity, current_occupancy) VALUES
-- Block A (Engineering Undergraduates - 1st & 2nd Floor)
(1, 'A-101', 'Block A', 4, 2),
(2, 'A-102', 'Block A', 4, 1),
(3, 'A-103', 'Block A', 4, 0),
(4, 'A-104', 'Block A', 4, 0),
(5, 'A-201', 'Block A', 4, 0),
(6, 'A-202', 'Block A', 4, 0),
(7, 'A-203', 'Block A', 4, 0),
(8, 'A-204', 'Block A', 4, 0),
-- Block B (Engineering Undergraduates - 1st & 2nd Floor)
(9,  'B-101', 'Block B', 4, 0),
(10, 'B-102', 'Block B', 4, 0),
(11, 'B-201', 'Block B', 4, 2),
(12, 'B-202', 'Block B', 4, 0),
-- Block C (Technology Undergraduates - 1st & 2nd Floor)
(13, 'C-101', 'Block C', 4, 1),
(14, 'C-102', 'Block C', 4, 1),
(15, 'C-201', 'Block C', 4, 0),
(16, 'C-202', 'Block C', 4, 0),
-- Block D (Senior Undergraduates - 3rd Floor)
(17, 'D-301', 'Block D', 4, 2),
(18, 'D-302', 'Block D', 4, 0),
(19, 'D-303', 'Block D', 4, 0),
(20, 'D-304', 'Block D', 4, 0);

-- ----------------------------------------------------------------------------
-- 2. USERS (Admin, Staff: Security, Maintenance, Cleaning, and Students)
-- ----------------------------------------------------------------------------
DELETE FROM users;

INSERT INTO users (id, student_id, full_name, password, email, phone, role, room_id) VALUES
-- Administration
(1,  'admin',       'System Administrator (Sub Warden)',   'admin123',   'admin@ruhuna.ac.lk',        '0771234567', 'ADMIN',       NULL),

-- Security Staff
(2,  'SEC001',      'Chief Security Officer Bandara',     'sec123',     'sec.bandara@ruhuna.ac.lk',  '0770000001', 'SECURITY',    NULL),
(3,  'SEC002',      'Security Officer Chaminda',          'sec123',     'sec.chaminda@ruhuna.ac.lk', '0770000002', 'SECURITY',    NULL),

-- Maintenance Staff
(4,  'MNT001',      'Sunil Rathnayake (Electrical)',      'mnt123',     'mnt.sunil@ruhuna.ac.lk',    '0770000003', 'MAINTENANCE', NULL),
(5,  'MNT002',      'Gamini Dissanayake (Plumbing)',       'mnt123',     'mnt.gamini@ruhuna.ac.lk',   '0770000004', 'MAINTENANCE', NULL),

-- Housekeeping & Cleaning Staff
(6,  'CLN001',      'Kamala Perera (Housekeeping Lead)',  'cln123',     'cln.kamala@ruhuna.ac.lk',   '0770000005', 'CLEANING',    NULL),
(7,  'CLN002',      'Kusumawathi (Housekeeping Aide)',    'cln123',     'cln.kusuma@ruhuna.ac.lk',   '0770000006', 'CLEANING',    NULL),

-- Resident Students
(8,  'TG/2021/0001', 'Kasun Silva',                       'student123', 'kasun.silva@eng.ruh.ac.lk', '0711111101', 'STUDENT',     1),
(9,  'TG/2021/0002', 'Nuwan Perera',                      'student123', 'nuwan.perera@eng.ruh.ac.lk','0711111102', 'STUDENT',     1),
(10, 'TG/2021/0003', 'Sachith Fernando',                  'student123', 'sachith.f@eng.ruh.ac.lk',   '0711111103', 'STUDENT',     2),
(11, 'TG/2021/0004', 'Dinuka Jayasinghe',                 'student123', 'dinuka.j@eng.ruh.ac.lk',    '0711111104', 'STUDENT',     11),
(12, 'TG/2021/0005', 'Kavindu Madushan',                  'student123', 'kavindu.m@eng.ruh.ac.lk',   '0711111105', 'STUDENT',     11),
(13, 'TG/2021/0006', 'Thilina Wickramasinghe',            'student123', 'thilina.w@eng.ruh.ac.lk',   '0711111106', 'STUDENT',     13),
(14, 'TG/2021/0007', 'Isuru Dananjaya',                   'student123', 'isuru.d@eng.ruh.ac.lk',     '0711111107', 'STUDENT',     14),
(15, 'TG/2021/0008', 'Charith Senaratne',                 'student123', 'charith.s@eng.ruh.ac.lk',   '0711111108', 'STUDENT',     17),
(16, 'TG/2021/0009', 'Malith Bandara',                    'student123', 'malith.b@eng.ruh.ac.lk',    '0711111109', 'STUDENT',     17),
(17, 'TG/2021/0010', 'Ashen Chamod (Applicant)',          'student123', 'ashen.c@eng.ruh.ac.lk',     '0711111110', 'STUDENT',     NULL);

-- ----------------------------------------------------------------------------
-- 3. INVENTORY CATALOG (Central Logistics Warehouse Master Data)
-- ----------------------------------------------------------------------------
DELETE FROM inventory;

INSERT INTO inventory (id, item_name, total_quantity, available_quantity, broken_quantity, category) VALUES
(1, 'Study Desk',         100, 95,  5,  'Furniture'),
(2, 'Wooden Chair',       150, 138, 12, 'Furniture'),
(3, 'Ceiling Fan',        80,  74,  6,  'Electrical'),
(4, 'LED Tube Light',     200, 182, 18, 'Electrical'),
(5, 'Water Tap Fixture',  60,  52,  8,  'Plumbing'),
(6, 'Bed Mattress',       120, 118, 2,  'Bedding'),
(7, 'Wall Socket Unit',   90,  85,  5,  'Electrical');

-- ----------------------------------------------------------------------------
-- 4. STAFF ATTENDANCE HISTORY (From 2026-10-01 to 2026-10-27)
-- Complete shifts logged for Security (2,3), Maintenance (4,5), Cleaning (6,7)
-- ----------------------------------------------------------------------------
DELETE FROM staff_attendance;

INSERT INTO staff_attendance (user_id, date, status, check_in_time, check_out_time, marked_by, remarks) VALUES
-- Officer Bandara (SEC001) - Exemplary service with daily check-ins
(2, '2026-10-01', 'PRESENT', '07:48:00', '17:15:00', 'STAFF', 'Shift completed without incidents'),
(2, '2026-10-02', 'PRESENT', '07:50:00', '17:10:00', 'STAFF', 'Main gate routine verification conducted'),
(2, '2026-10-03', 'PRESENT', '07:45:00', '17:05:00', 'STAFF', 'Weekend gate monitoring duty'),
(2, '2026-10-04', 'PRESENT', '07:55:00', '17:12:00', 'STAFF', 'Sunday security shift completed'),
(2, '2026-10-05', 'PRESENT', '07:46:00', '17:08:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-06', 'PRESENT', '07:52:00', '17:20:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-07', 'PRESENT', '07:49:00', '17:15:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-08', 'PRESENT', '07:50:00', '17:10:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-09', 'PRESENT', '07:47:00', '17:18:00', 'STAFF', 'Evening pass check inspection'),
(2, '2026-10-10', 'PRESENT', '07:54:00', '17:05:00', 'STAFF', 'Weekend security supervision'),
(2, '2026-10-11', 'PRESENT', '07:51:00', '17:12:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-12', 'PRESENT', '07:48:00', '17:15:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-13', 'PRESENT', '07:45:00', '17:10:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-14', 'PRESENT', '07:53:00', '17:22:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-15', 'PRESENT', '07:50:00', '17:14:00', 'STAFF', 'Mid-month security inspection report submitted'),
(2, '2026-10-16', 'PRESENT', '07:49:00', '17:10:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-17', 'PRESENT', '07:52:00', '17:08:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-18', 'PRESENT', '07:48:00', '17:15:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-19', 'PRESENT', '07:46:00', '17:10:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-20', 'PRESENT', '07:51:00', '17:25:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-21', 'PRESENT', '07:48:00', '17:12:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-22', 'PRESENT', '07:47:00', '17:15:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-23', 'PRESENT', '07:50:00', '17:18:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-24', 'PRESENT', '07:53:00', '17:10:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-25', 'PRESENT', '07:49:00', '17:15:00', 'STAFF', 'Processed Hackathon student departures'),
(2, '2026-10-26', 'PRESENT', '07:46:00', '17:12:00', 'STAFF', 'Completed full shift duty'),
(2, '2026-10-27', 'PRESENT', '07:45:00', NULL,       'STAFF', 'Active on duty shift [Current date: 2026-10-27]'),

-- Officer Chaminda (SEC002) - Security Staff
(3, '2026-10-01', 'PRESENT', '07:55:00', '17:20:00', 'STAFF', 'Duty completed'),
(3, '2026-10-02', 'PRESENT', '07:52:00', '17:15:00', 'STAFF', 'Duty completed'),
(3, '2026-10-05', 'PRESENT', '07:58:00', '17:25:00', 'STAFF', 'Duty completed'),
(3, '2026-10-06', 'PRESENT', '07:50:00', '17:10:00', 'STAFF', 'Duty completed'),
(3, '2026-10-07', 'PRESENT', '07:54:00', '17:18:00', 'STAFF', 'Duty completed'),
(3, '2026-10-08', 'PRESENT', '07:51:00', '17:15:00', 'STAFF', 'Duty completed'),
(3, '2026-10-09', 'PRESENT', '07:48:00', '17:12:00', 'STAFF', 'Duty completed'),
(3, '2026-10-12', 'PRESENT', '07:50:00', '17:15:00', 'STAFF', 'Duty completed'),
(3, '2026-10-13', 'PRESENT', '07:55:00', '17:20:00', 'STAFF', 'Duty completed'),
(3, '2026-10-14', 'PRESENT', '07:52:00', '17:18:00', 'STAFF', 'Duty completed'),
(3, '2026-10-15', 'PRESENT', '07:49:00', '17:10:00', 'STAFF', 'Duty completed'),
(3, '2026-10-16', 'PRESENT', '07:53:00', '17:15:00', 'STAFF', 'Duty completed'),
(3, '2026-10-19', 'PRESENT', '07:50:00', '17:14:00', 'STAFF', 'Duty completed'),
(3, '2026-10-20', 'PRESENT', '07:47:00', '17:12:00', 'STAFF', 'Duty completed'),
(3, '2026-10-21', 'PRESENT', '07:52:00', '17:18:00', 'STAFF', 'Duty completed'),
(3, '2026-10-22', 'PRESENT', '07:55:00', '17:22:00', 'STAFF', 'Duty completed'),
(3, '2026-10-23', 'PRESENT', '07:49:00', '17:15:00', 'STAFF', 'Duty completed'),
(3, '2026-10-26', 'PRESENT', '07:50:00', '17:10:00', 'STAFF', 'Duty completed'),
(3, '2026-10-27', 'PRESENT', '07:48:00', NULL,       'STAFF', 'Active on duty shift [Current date: 2026-10-27]'),

-- Sunil Rathnayake (MNT001) - Electrical Technician
(4, '2026-10-01', 'PRESENT', '08:00:00', '16:30:00', 'STAFF', 'Checked Block A electrical DB boxes'),
(4, '2026-10-02', 'PRESENT', '07:58:00', '16:45:00', 'STAFF', 'Replaced hallway LED tubes in Block C'),
(4, '2026-10-05', 'PRESENT', '08:05:00', '16:35:00', 'STAFF', 'Routine inspection'),
(4, '2026-10-06', 'PRESENT', '07:55:00', '16:30:00', 'STAFF', 'Repaired corridor emergency lights'),
(4, '2026-10-07', 'PRESENT', '08:02:00', '16:40:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-08', 'PRESENT', '07:59:00', '16:30:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-09', 'PRESENT', '08:00:00', '16:45:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-12', 'PRESENT', '08:04:00', '16:30:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-13', 'PRESENT', '07:57:00', '16:35:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-14', 'PRESENT', '08:01:00', '16:30:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-15', 'PRESENT', '08:00:00', '16:40:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-16', 'PRESENT', '08:03:00', '16:30:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-19', 'PRESENT', '07:56:00', '16:35:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-20', 'PRESENT', '08:02:00', '16:50:00', 'STAFF', 'Repaired Study Chair in room A-102'),
(4, '2026-10-21', 'PRESENT', '08:00:00', '16:30:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-22', 'PRESENT', '07:58:00', '16:40:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-23', 'PRESENT', '08:05:00', '16:30:00', 'STAFF', 'Routine maintenance'),
(4, '2026-10-26', 'PRESENT', '08:01:00', '16:45:00', 'STAFF', 'Inspected Block D low water pressure'),
(4, '2026-10-27', 'PRESENT', '07:52:00', NULL,       'STAFF', 'Investigating wall socket sparks in room B-201 [Current Date]'),

-- Gamini Dissanayake (MNT002) - Plumbing Specialist (includes approved medical leave)
(5, '2026-10-01', 'PRESENT',  '08:10:00', '16:40:00', 'STAFF', 'Serviced overhead tank float valves'),
(5, '2026-10-02', 'PRESENT',  '08:05:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-05', 'PRESENT',  '08:00:00', '16:35:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-06', 'PRESENT',  '08:12:00', '16:45:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-07', 'PRESENT',  '08:08:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-08', 'PRESENT',  '08:04:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-09', 'PRESENT',  '08:00:00', '16:35:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-12', 'PRESENT',  '08:06:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-13', 'PRESENT',  '08:10:00', '16:40:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-14', 'PRESENT',  '08:05:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-15', 'ON_LEAVE', NULL,       NULL,       'ADMIN', 'Excused medical leave approved by Sub Warden'),
(5, '2026-10-16', 'PRESENT',  '08:15:00', '16:30:00', 'STAFF', 'Returned from leave; resumed duties'),
(5, '2026-10-19', 'PRESENT',  '08:02:00', '16:35:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-20', 'PRESENT',  '08:05:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-21', 'PRESENT',  '08:00:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-22', 'PRESENT',  '08:08:00', '16:40:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-23', 'PRESENT',  '08:04:00', '16:30:00', 'STAFF', 'Plumbing inspection'),
(5, '2026-10-26', 'PRESENT',  '08:00:00', '16:45:00', 'STAFF', 'Assisting municipal water line check'),
(5, '2026-10-27', 'PRESENT',  '07:55:00', NULL,       'STAFF', 'Active on duty shift [Current date: 2026-10-27]'),

-- Kamala Perera (CLN001) - Housekeeping Supervisor
(6, '2026-10-01', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Morning sanitization of Block A bathrooms completed'),
(6, '2026-10-02', 'PRESENT', '07:35:00', '15:30:00', 'STAFF', 'Block B common area cleaning'),
(6, '2026-10-05', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-06', 'PRESENT', '07:32:00', '15:35:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-07', 'PRESENT', '07:28:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-08', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-09', 'PRESENT', '07:35:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-12', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-13', 'PRESENT', '07:33:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-14', 'PRESENT', '07:29:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-15', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-16', 'PRESENT', '07:34:00', '15:35:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-19', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-20', 'PRESENT', '07:31:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-21', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-22', 'PRESENT', '07:35:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-23', 'PRESENT', '07:30:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-26', 'PRESENT', '07:28:00', '15:30:00', 'STAFF', 'Sanitization shift completed'),
(6, '2026-10-27', 'PRESENT', '07:25:00', NULL,       'STAFF', 'Active on duty shift [Current date: 2026-10-27]'),

-- Kusumawathi (CLN002) - Housekeeping Aide (includes 1 unscheduled absence)
(7, '2026-10-01', 'PRESENT', '07:40:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-02', 'PRESENT', '07:38:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-05', 'PRESENT', '07:42:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-06', 'PRESENT', '07:40:00', '15:35:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-07', 'PRESENT', '07:39:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-08', 'PRESENT', '07:41:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-09', 'PRESENT', '07:45:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-12', 'PRESENT', '07:40:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-13', 'PRESENT', '07:44:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-14', 'PRESENT', '07:38:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-15', 'PRESENT', '07:40:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-16', 'PRESENT', '07:42:00', '15:35:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-19', 'PRESENT', '07:40:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-20', 'PRESENT', '07:39:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-21', 'ABSENT',  NULL,       NULL,       'ADMIN', 'Unscheduled absence recorded during morning roll call'),
(7, '2026-10-22', 'PRESENT', '07:45:00', '15:30:00', 'STAFF', 'Reported back on duty'),
(7, '2026-10-23', 'PRESENT', '07:40:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-26', 'PRESENT', '07:38:00', '15:30:00', 'STAFF', 'Housekeeping duty completed'),
(7, '2026-10-27', 'PRESENT', '07:35:00', NULL,       'STAFF', 'Active on duty shift [Current date: 2026-10-27]');

-- ----------------------------------------------------------------------------
-- 5. STUDENT MAINTENANCE COMPLAINTS (Resolved, In-Progress, Pending)
-- ----------------------------------------------------------------------------
DELETE FROM complaints;

INSERT INTO complaints (id, user_id, room_number, item, description, status, created_at, notified_at, assigned_to, priority, escalation_count, due_date, admin_notes) VALUES
-- Complaint 1: Resolved in September (Kasun Silva, A-101)
(1, 8,  'A-101', 'Ceiling Fan',           'Regulator smoking and sparks when turned to speed 4.',                   'RESOLVED',    '2026-09-05', '2026-09-06', 'Sunil Rathnayake',  'HIGH',   0, '2026-09-08', 'Capacitor and regulator replaced with new stock. Tested operational.'),

-- Complaint 2: Resolved in September (Dinuka Jayasinghe, B-201)
(2, 11, 'B-201', 'Water Tap Fixture',      'Bathroom basin tap leaking continuously causing water wastage.',         'RESOLVED',    '2026-09-12', '2026-09-13', 'Gamini Dissanayake', 'NORMAL', 0, '2026-09-15', 'Inner washer replaced and tightened. Leak completely resolved.'),

-- Complaint 3: Resolved in early October (Thilina Wickramasinghe, C-101)
(3, 13, 'C-101', 'LED Tube Light',         'Main room study light flickering and now completely dark.',             'RESOLVED',    '2026-10-02', '2026-10-03', 'Sunil Rathnayake',  'NORMAL', 0, '2026-10-04', 'Replaced defective 20W LED tube from central inventory stock.'),

-- Complaint 4: Currently In Progress (Sachith Fernando, A-102)
(4, 10, 'A-102', 'Wooden Chair',           'Study chair right leg joint broken and wobbling dangerously.',          'IN_PROGRESS', '2026-10-20', '2026-10-21', 'Sunil Rathnayake',  'NORMAL', 0, '2026-10-29', 'Work initiated; sent to carpentry workshop for bracket welding.'),

-- Complaint 5: Currently In Progress & Escalated (Charith Senaratne, D-301)
(5, 15, 'D-301', 'Door Latch Unit',        'Room front door latch sticking; difficult to lock from outside.',       'IN_PROGRESS', '2026-10-24', '2026-10-25', 'Maintenance Team',  'HIGH',   1, '2026-10-28', 'Escalated by Sub Warden. Lubrication applied, lock cylinder replacement scheduled.'),

-- Complaint 6: Pending (Charith Senaratne, D-301)
(6, 15, 'D-301', 'Plumbing Supply Line',   'Extremely low water flow in 3rd floor bathrooms during morning hours.',  'PENDING',     '2026-10-26', NULL,         NULL,                'URGENT', 0, NULL,         'Awaiting Sub Warden dispatch to municipal water pump maintenance.'),

-- Complaint 7: Pending reported today (Dinuka Jayasinghe, B-201)
(7, 11, 'B-201', 'Wall Socket Unit',       'Bedside plug sparks when phone/laptop charger inserted.',               'PENDING',     '2026-10-27', NULL,         NULL,                'URGENT', 0, NULL,         'Reported today; priority dispatch required immediately.');

-- ----------------------------------------------------------------------------
-- 6. STUDENT GATE PASSES (Returned, Departed, Pending, Rejected)
-- ----------------------------------------------------------------------------
DELETE FROM gate_passes;

INSERT INTO gate_passes (id, user_id, reason, from_date, to_date, status) VALUES
-- Pass 1: Returned past pass
(1, 8,  'Attending family wedding ceremony in Matara',                       '2026-09-15', '2026-09-18', 'RETURNED'),
-- Pass 2: Returned clinic visit
(2, 11, 'Medical clinic appointment at Karapitiya Teaching Hospital',         '2026-09-22', '2026-09-23', 'RETURNED'),
-- Pass 3: Returned weekend visit
(3, 13, 'Weekend visit home to Kandy',                                       '2026-10-04', '2026-10-07', 'RETURNED'),
-- Pass 4: Active Departure (Currently away at competition)
(4, 9,  'Participating in IEEE National Hackathon in Colombo',               '2026-10-25', '2026-10-28', 'DEPARTED'),
-- Pass 5: Pending approval for upcoming recess
(5, 12, 'Mid-semester study recess visit home to Kurunegala',                 '2026-10-30', '2026-11-04', 'PENDING'),
-- Pass 6: Rejected due to academic exam week
(6, 10, 'Personal leisure trip to Galle Fort',                               '2026-10-09', '2026-10-11', 'REJECTED');

-- ----------------------------------------------------------------------------
-- 7. MONTHLY HOSTEL ACCOMMODATION PAYMENTS (August, September, October 2026)
-- Realistic arrears testing: 2 students pending for October 2026
-- ----------------------------------------------------------------------------
DELETE FROM payments;

INSERT INTO payments (id, invoice_no, user_id, amount, month, status, payment_date) VALUES
-- August 2026 (All 9 resident students settled on time)
(1,  'INV-2026081001', 8,  1500.00, 'August 2026', 'PAID', '2026-08-05'),
(2,  'INV-2026081002', 9,  1500.00, 'August 2026', 'PAID', '2026-08-05'),
(3,  'INV-2026081003', 10, 1500.00, 'August 2026', 'PAID', '2026-08-06'),
(4,  'INV-2026081004', 11, 1500.00, 'August 2026', 'PAID', '2026-08-04'),
(5,  'INV-2026081005', 12, 1500.00, 'August 2026', 'PAID', '2026-08-07'),
(6,  'INV-2026081006', 13, 1500.00, 'August 2026', 'PAID', '2026-08-05'),
(7,  'INV-2026081007', 14, 1500.00, 'August 2026', 'PAID', '2026-08-08'),
(8,  'INV-2026081008', 15, 1500.00, 'August 2026', 'PAID', '2026-08-04'),
(9,  'INV-2026081009', 16, 1500.00, 'August 2026', 'PAID', '2026-08-05'),

-- September 2026 (All 9 resident students settled on time)
(10, 'INV-2026091010', 8,  1500.00, 'September 2026', 'PAID', '2026-09-04'),
(11, 'INV-2026091011', 9,  1500.00, 'September 2026', 'PAID', '2026-09-05'),
(12, 'INV-2026091012', 10, 1500.00, 'September 2026', 'PAID', '2026-09-06'),
(13, 'INV-2026091013', 11, 1500.00, 'September 2026', 'PAID', '2026-09-04'),
(14, 'INV-2026091014', 12, 1500.00, 'September 2026', 'PAID', '2026-09-07'),
(15, 'INV-2026091015', 13, 1500.00, 'September 2026', 'PAID', '2026-09-05'),
(16, 'INV-2026091016', 14, 1500.00, 'September 2026', 'PAID', '2026-09-08'),
(17, 'INV-2026091017', 15, 1500.00, 'September 2026', 'PAID', '2026-09-04'),
(18, 'INV-2026091018', 16, 1500.00, 'September 2026', 'PAID', '2026-09-05'),

-- October 2026 (7 paid, 2 pending for arrears monitoring)
(19, 'INV-2026101019', 8,  1500.00, 'October 2026', 'PAID',    '2026-10-06'),
(20, 'INV-2026101020', 9,  1500.00, 'October 2026', 'PAID',    '2026-10-05'),
(21, 'INV-2026101021', 10, 1500.00, 'October 2026', 'PENDING', '2026-10-01'), -- Sachith Fernando (Arrears)
(22, 'INV-2026101022', 11, 1500.00, 'October 2026', 'PAID',    '2026-10-04'),
(23, 'INV-2026101023', 12, 1500.00, 'October 2026', 'PAID',    '2026-10-07'),
(24, 'INV-2026101024', 13, 1500.00, 'October 2026', 'PENDING', '2026-10-01'), -- Thilina Wickramasinghe (Arrears)
(25, 'INV-2026101025', 14, 1500.00, 'October 2026', 'PAID',    '2026-10-06'),
(26, 'INV-2026101026', 15, 1500.00, 'October 2026', 'PAID',    '2026-10-05'),
(27, 'INV-2026101027', 16, 1500.00, 'October 2026', 'PAID',    '2026-10-06');

-- ----------------------------------------------------------------------------
-- 8. ROOM INVENTORY DAMAGES & REPAIR TRACKER
-- ----------------------------------------------------------------------------
DELETE FROM room_inventory;

INSERT INTO room_inventory (id, room_id, inventory_id, broken_quantity, damage_description, status, reported_date) VALUES
(1, 2,  2, 1, 'Right wooden leg fractured; sent for workshop repair', 'BROKEN',   '2026-10-20'),
(2, 11, 5, 1, 'Basin water tap leaking continuously',                 'REPAIRED', '2026-09-12'),
(3, 13, 3, 1, 'Capacitor fused; replaced with spare stock',           'REPAIRED', '2026-10-02');

-- ----------------------------------------------------------------------------
-- 9. OFFICIAL BULLETIN NOTICES
-- ----------------------------------------------------------------------------
DELETE FROM notices;

INSERT INTO notices (id, title, content, date_posted, target_audience) VALUES
(1, 'Hostel Accommodation Fee Collection - October 2026', 
    'All resident students living in Blocks A, B, C, and D are requested to settle their monthly accommodation fee of Rs. 1,500.00 on or before October 31st, 2026. Official receipts will be generated via the online portal.', 
    '2026-10-01', 'STUDENTS'),

(2, 'Scheduled Water Tank Cleaning & Supply Interruption Notice', 
    'Please be notified that the main overhead water reservoir tank will undergo routine descaling and chlorinated disinfection on Thursday, October 29th, from 09:00 AM to 03:00 PM. Water supply to all blocks will be interrupted temporarily during this window.', 
    '2026-10-22', 'ALL'),

(3, 'Campus Security Curfew & Gate Pass Verification Reminder', 
    'All undergraduate residents must return to the hostel premises prior to the 09:00 PM security gate lock. Students on approved leave must present their official digital Gate Pass to the duty security officer upon arrival.', 
    '2026-10-24', 'ALL');

-- ----------------------------------------------------------------------------
-- 10. AUDIT TRAIL LOGS (User allocations & Financial settlements)
-- ----------------------------------------------------------------------------
DELETE FROM user_audit_log;

INSERT INTO user_audit_log (id, user_id, action_type, old_value, new_value, performed_at, performed_by) VALUES
(1, 8,  'ROOM_ALLOCATION',    'UNALLOCATED',                       'A-101 (Block A)',                      '2026-08-01 09:15:00', 'ADMIN'),
(2, 9,  'ROOM_ALLOCATION',    'UNALLOCATED',                       'A-101 (Block A)',                      '2026-08-01 09:20:00', 'ADMIN'),
(3, 10, 'ROOM_ALLOCATION',    'UNALLOCATED',                       'A-102 (Block A)',                      '2026-08-01 09:25:00', 'ADMIN'),
(4, 11, 'ROOM_ALLOCATION',    'UNALLOCATED',                       'B-201 (Block B)',                      '2026-08-01 09:30:00', 'ADMIN'),
(5, 8,  'GATE_PASS_DECISION', 'Pass #1 was PENDING',               'APPROVED [Student: Kasun Silva]',      '2026-09-14 14:00:00', 'ADMIN'),
(6, 9,  'GATE_PASS_DECISION', 'Pass #4 was PENDING',               'APPROVED [Student: Nuwan Perera]',     '2026-10-24 16:30:00', 'ADMIN'),
(7, 10, 'GATE_PASS_DECISION', 'Pass #6 was PENDING',               'REJECTED [Reason: Mid-term exam week]','2026-10-08 11:20:00', 'ADMIN');

DELETE FROM payment_audit_log;

INSERT INTO payment_audit_log (id, payment_id, invoice_no, student_id, amount, action_type, logged_at) VALUES
(1, 1,  'INV-2026081001', 'TG/2021/0001', 1500.00, 'PAYMENT_SETTLED', '2026-08-05 10:14:22'),
(2, 2,  'INV-2026081002', 'TG/2021/0002', 1500.00, 'PAYMENT_SETTLED', '2026-08-05 11:05:10'),
(3, 10, 'INV-2026091010', 'TG/2021/0001', 1500.00, 'PAYMENT_SETTLED', '2026-09-04 09:45:00'),
(4, 19, 'INV-2026101019', 'TG/2021/0001', 1500.00, 'PAYMENT_SETTLED', '2026-10-06 14:22:15');

-- ----------------------------------------------------------------------------
-- 11. HOSTEL OCCUPANCY DAILY STATS (Snapshot history)
-- ----------------------------------------------------------------------------
DELETE FROM hostel_daily_stats;

INSERT INTO hostel_daily_stats (stat_date, block_name, occupied_beds, total_capacity, recorded_at) VALUES
('2026-10-01', 'Block A', 3, 32, '2026-10-01 23:59:59'),
('2026-10-01', 'Block B', 2, 16, '2026-10-01 23:59:59'),
('2026-10-01', 'Block C', 2, 16, '2026-10-01 23:59:59'),
('2026-10-01', 'Block D', 2, 16, '2026-10-01 23:59:59'),
('2026-10-27', 'Block A', 3, 32, '2026-10-27 08:00:00'),
('2026-10-27', 'Block B', 2, 16, '2026-10-27 08:00:00'),
('2026-10-27', 'Block C', 2, 16, '2026-10-27 08:00:00'),
('2026-10-27', 'Block D', 2, 16, '2026-10-27 08:00:00');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Verification Queries to demonstrate active database state
-- ============================================================================
SELECT 'DATABASE DATA SEEDING COMPLETE' AS Status;
SELECT COUNT(*) AS total_rooms FROM rooms;
SELECT role, COUNT(*) AS count_by_role FROM users GROUP BY role;
SELECT COUNT(*) AS total_attendance_records FROM staff_attendance;
SELECT status, COUNT(*) AS complaints_by_status FROM complaints GROUP BY status;
SELECT status, COUNT(*) AS gatepasses_by_status FROM gate_passes GROUP BY status;
SELECT month, status, COUNT(*) AS count, SUM(amount) AS total_lkr FROM payments GROUP BY month, status;
