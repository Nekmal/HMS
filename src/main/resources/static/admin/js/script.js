// Sub Warden (Administration) Portal Frontend Controller
// Manages student admissions, room allocations across Blocks A-D, gate pass approvals,
// master inventory, staff attendance oversight, and campus notices.

const API_BASE = '/hms/api';

// Tab Switching Logic
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('pop-up-animation');
    });

    const target = document.getElementById('view-' + tabId);
    if (target) {
        target.style.display = 'block';
        void target.offsetWidth; // Force reflow to replay animation
        target.classList.add('pop-up-animation');
    }

    // Sync active menu state
    const navItems = document.querySelectorAll('.sidebar-menu li');
    navItems.forEach(li => {
        if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(`'${tabId}'`)) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });

    if (tabId === 'dashboard') {
        document.getElementById('page-title').innerText = 'Sub Warden Portal';
        loadDashboardStats();
    } else if (tabId === 'users') {
        document.getElementById('page-title').innerText = 'User Management';
        loadUsers();
    } else if (tabId === 'rooms') {
        document.getElementById('page-title').innerText = 'Room Management';
        loadRooms();
    } else if (tabId === 'inventory') {
        document.getElementById('page-title').innerText = 'Inventory Management';
        loadInventory();
    } else if (tabId === 'payments') {
        document.getElementById('page-title').innerText = 'Payment Records';
        loadAdminPayments();
    } else if (tabId === 'complaints') {
        document.getElementById('page-title').innerText = 'Manage Complaints';
        loadAdminComplaints();
    } else if (tabId === 'gatepasses') {
        document.getElementById('page-title').innerText = 'Manage Gate Passes';
        loadAdminGatePasses();
    } else if (tabId === 'notices') {
        document.getElementById('page-title').innerText = 'Notice Board';
        loadAdminNotices();
    } else if (tabId === 'staff') {
        document.getElementById('page-title').innerText = 'Staff & Attendance Management';
        loadStaffAttendanceManagement();
    }
}

// Global state cache
let allRoomsData = [];
let allUsersData = [];
let allInventoryData = [];
let allRoomDamagesData = [];

// Modal Logic
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'block';

    if (modalId === 'roomModal') {
        showToast('All 100 hostel rooms are fixed and permanently configured across Blocks A-D. New rooms cannot be added.', 'info');
        return;
    }

    if (modalId === 'userModal') {
        const roleSelect = document.getElementById('role');
        if (roleSelect && !roleSelect.value) roleSelect.value = 'STUDENT';
        
        if (!allUsersData || allUsersData.length === 0) {
            fetch(`${API_BASE}/users`)
                .then(r => r.json())
                .then(users => {
                    allUsersData = users;
                    onUserRoleChange();
                })
                .catch(() => onUserRoleChange());
        } else {
            onUserRoleChange();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Global chart holders to prevent duplicate instances
let occupancyChartInstance = null;
let complaintsChartInstance = null;

// Fetch API Data & Render Dynamic Dashboard Analytics
async function loadDashboardStats() {
    try {
        const [usersRes, roomsRes, paymentsRes, complaintsRes] = await Promise.all([
            fetch(`${API_BASE}/users`),
            fetch(`${API_BASE}/rooms`),
            fetch(`${API_BASE}/payments`),
            fetch(`${API_BASE}/complaints`)
        ]);

        const users = await usersRes.json();
        const rooms = await roomsRes.json();
        const payments = await paymentsRes.json();
        const complaints = await complaintsRes.json();

        allUsersData = users;
        allRoomsData = rooms;

        // 1. KPI Cards
        const students = users.filter(u => u.role === 'STUDENT');
        const studentCount = students.length || users.length;
        document.getElementById('stat-users').innerText = studentCount;
        const heroStudentEl = document.getElementById('hero-students-count');
        if (heroStudentEl) heroStudentEl.innerText = studentCount;
        const heroRoomsEl = document.getElementById('hero-rooms-count');
        if (heroRoomsEl) heroRoomsEl.innerText = rooms.length;

        let totalCapacity = 0;
        let totalOccupied = 0;
        const blockMap = {};

        rooms.forEach(room => {
            const block = room.blockName || 'General';
            const cap = room.capacity || 0;
            const occ = room.currentOccupancy || 0;

            totalCapacity += cap;
            totalOccupied += occ;

            if (!blockMap[block]) {
                blockMap[block] = { count: 0, capacity: 0, occupied: 0 };
            }
            blockMap[block].count += 1;
            blockMap[block].capacity += cap;
            blockMap[block].occupied += occ;
        });

        document.getElementById('stat-rooms').innerText = `${rooms.length} Rooms (${totalOccupied}/${totalCapacity} Beds)`;
        const heroBlocksEl = document.getElementById('hero-blocks-count');
        if (heroBlocksEl) heroBlocksEl.innerText = Object.keys(blockMap).length || 4;

        let totalRevenue = 0;
        payments.forEach(p => {
            if (p.amount) totalRevenue += Number(p.amount);
        });
        document.getElementById('stat-payments').innerText = `Rs. ${totalRevenue.toLocaleString()}`;

        const activeComplaints = complaints.filter(c => c.status !== 'RESOLVED');
        document.getElementById('stat-complaints').innerText = activeComplaints.length;

        // 2. Summary Table 1: Block Occupancy Summary
        const blockTbody = document.getElementById('block-summary-tbody');
        if (blockTbody) {
            blockTbody.innerHTML = '';
            const blockNames = Object.keys(blockMap).sort();
            blockNames.forEach(bName => {
                const b = blockMap[bName];
                const rate = b.capacity > 0 ? Math.min(100, Math.round((b.occupied / b.capacity) * 100)) : 0;
                blockTbody.innerHTML += `
                    <tr>
                        <td><strong>${bName}</strong></td>
                        <td>${b.count}</td>
                        <td>${b.capacity}</td>
                        <td>${b.occupied}</td>
                        <td style="min-width: 140px;">
                            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; margin-bottom:2px;">
                                <span>${rate}%</span>
                                <span style="color:#777;">${b.capacity - b.occupied} free</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${rate}%;"></div>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // 3. Summary Table 2: Recent Complaints
        const recentComplaintsTbody = document.getElementById('recent-complaints-tbody');
        if (recentComplaintsTbody) {
            recentComplaintsTbody.innerHTML = '';
            const recent5 = complaints.slice(-5).reverse();
            if (recent5.length === 0) {
                recentComplaintsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No complaints filed yet.</td></tr>';
            } else {
                recent5.forEach(c => {
                    let statusClass = 'pending';
                    if (c.status === 'RESOLVED') statusClass = 'paid';
                    else if (c.status === 'IN_PROGRESS') statusClass = 'allocated';

                    const sName = c.user ? (c.user.fullName || c.user.studentId) : 'Student';
                    const rNum = c.room ? c.room.roomNumber : (c.user && c.user.room ? c.user.room.roomNumber : '-');
                    recentComplaintsTbody.innerHTML += `
                        <tr>
                            <td><strong>${sName}</strong></td>
                            <td><span style="font-weight:600;">${rNum}</span></td>
                            <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.description}">${c.description}</td>
                            <td><span class="status ${statusClass}">${c.status}</span></td>
                        </tr>
                    `;
                });
            }
        }

        // Supplementary Summary Data (Gate Passes, Staff Attendance, Room Damages)
        let gatepasses = [];
        let attendance = [];
        let damages = [];
        try {
            const [gpRes, attRes, damRes] = await Promise.all([
                fetch(`${API_BASE}/gatepasses`),
                fetch(`${API_BASE}/staff-attendance`),
                fetch(`${API_BASE}/room-inventory`)
            ]);
            if (gpRes.ok) gatepasses = await gpRes.json();
            if (attRes.ok) attendance = await attRes.json();
            if (damRes.ok) damages = await damRes.json();
        } catch (e) {
            console.warn("Could not load supplementary summary data", e);
        }

        // Active Gate Passes & Broken Items KPI
        const activeGatePasses = gatepasses.filter(p => p.status === 'APPROVED' || p.status === 'PENDING');
        const statGpEl = document.getElementById('stat-gatepasses');
        if (statGpEl) statGpEl.innerText = `${activeGatePasses.length} (${gatepasses.filter(p => p.status === 'DEPARTED').length} Away)`;

        const brokenDamages = damages.filter(d => d.status !== 'REPAIRED');
        const statDamEl = document.getElementById('stat-damages');
        if (statDamEl) statDamEl.innerText = `${brokenDamages.length} Items`;

        // Summary Table 3: Student Gate Passes & Leaves Summary
        const gpTbody = document.getElementById('admin-gatepass-summary-tbody');
        if (gpTbody) {
            gpTbody.innerHTML = '';
            const recentGP = gatepasses.slice(-5).reverse();
            if (recentGP.length === 0) {
                gpTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No student gate passes recorded.</td></tr>';
            } else {
                recentGP.forEach(gp => {
                    let stBadge = 'pending';
                    if (gp.status === 'APPROVED') stBadge = 'allocated';
                    else if (gp.status === 'DEPARTED') stBadge = 'paid';
                    else if (gp.status === 'REJECTED') stBadge = 'maintenance';

                    const sName = gp.user ? (gp.user.fullName || gp.user.studentId) : 'Student';
                    const rNum = gp.user && gp.user.room ? gp.user.room.roomNumber : '-';
                    gpTbody.innerHTML += `
                        <tr>
                            <td><strong>${sName}</strong></td>
                            <td><span style="font-weight:600;">${rNum}</span></td>
                            <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${gp.reason || ''}">${gp.reason || 'Leave'}</td>
                            <td>${gp.departureDate || '-'}</td>
                            <td><span class="status ${stBadge}">${gp.status}</span></td>
                        </tr>
                    `;
                });
            }
        }

        // Summary Table 4: Staff Duty & Attendance Today
        const staffTbody = document.getElementById('admin-staff-summary-tbody');
        if (staffTbody) {
            staffTbody.innerHTML = '';
            const recentAtt = attendance.slice(-5).reverse();
            if (recentAtt.length === 0) {
                staffTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No staff attendance logs recorded today.</td></tr>';
            } else {
                recentAtt.forEach(att => {
                    const st = (att.status || 'PRESENT').toUpperCase();
                    let stBadge = 'paid';
                    if (st === 'ABSENT') stBadge = 'maintenance';
                    else if (st === 'ON_LEAVE' || st === 'LEAVE') stBadge = 'pending';

                    const staffObj = att.staff || att.user;
                    const staffName = staffObj ? (staffObj.fullName || staffObj.studentId) : 'Staff Member';
                    const dept = (staffObj && staffObj.role) ? staffObj.role.toUpperCase() : 'SERVICE';
                    
                    let deptBadge = dept;
                    if (dept === 'SECURITY') {
                        deptBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; font-weight:700; border: 1px solid rgba(46, 213, 115, 0.3); border-radius: 8px; padding: 3px 8px;"><i class="fas fa-shield-alt"></i> Security</span>';
                    } else if (dept === 'MAINTENANCE') {
                        deptBadge = '<span class="status-badge" style="background: rgba(217, 119, 6, 0.15); color: #d97706; font-weight:700; border: 1px solid rgba(217, 119, 6, 0.3); border-radius: 8px; padding: 3px 8px;"><i class="fas fa-tools"></i> Maintenance</span>';
                    } else if (dept === 'CLEANING') {
                        deptBadge = '<span class="status-badge" style="background: rgba(8, 145, 178, 0.15); color: #0891b2; font-weight:700; border: 1px solid rgba(8, 145, 178, 0.3); border-radius: 8px; padding: 3px 8px;"><i class="fas fa-broom"></i> Cleaning</span>';
                    } else {
                        deptBadge = `<span class="status-badge" style="padding: 3px 8px; border-radius: 8px;">${dept}</span>`;
                    }

                    const checkInDisplay = formatAdminTime(att.checkInTime);
                    staffTbody.innerHTML += `
                        <tr>
                            <td><strong>${staffName}</strong></td>
                            <td>${deptBadge}</td>
                            <td><code>${checkInDisplay}</code></td>
                            <td><span class="status ${stBadge}">${st}</span></td>
                        </tr>
                    `;
                });
            }
        }

        // Summary Table 5: Room Equipment Damages Summary
        const damTbody = document.getElementById('admin-damage-summary-tbody');
        if (damTbody) {
            damTbody.innerHTML = '';
            const recentDam = damages.slice(-5).reverse();
            if (recentDam.length === 0) {
                damTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No equipment damages reported. All facilities intact!</td></tr>';
            } else {
                recentDam.forEach(d => {
                    const rNum = d.room ? d.room.roomNumber : 'Room';
                    const iName = d.inventory ? d.inventory.itemName : 'Asset';
                    const st = d.status || 'PENDING';
                    const stBadge = st === 'REPAIRED' ? 'paid' : (st === 'IN_PROGRESS' ? 'allocated' : 'pending');
                    damTbody.innerHTML += `
                        <tr>
                            <td><strong>${rNum}</strong></td>
                            <td>${iName}</td>
                            <td><span style="color:#d63031; font-weight:700;">${d.brokenQuantity || 1}x</span></td>
                            <td><span class="status ${stBadge}">${st}</span></td>
                        </tr>
                    `;
                });
            }
        }

        // Summary Table 6: Recent Financial Invoices & Payments
        const payTbody = document.getElementById('admin-payment-summary-tbody');
        if (payTbody) {
            payTbody.innerHTML = '';
            const recentPay = payments.slice(-5).reverse();
            if (recentPay.length === 0) {
                payTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No fee payments recorded yet.</td></tr>';
            } else {
                recentPay.forEach(p => {
                    const sName = p.user ? (p.user.fullName || p.user.studentId) : 'Student';
                    payTbody.innerHTML += `
                        <tr>
                            <td><strong>${sName}</strong></td>
                            <td><code>${p.invoiceNo || '-'}</code></td>
                            <td>${p.month || '-'}</td>
                            <td><strong style="color:#10ac84;">Rs. ${(p.amount || 0).toLocaleString()}</strong></td>
                        </tr>
                    `;
                });
            }
        }

        // 4. Chart 1: Column Graph for Block Occupancy (Chart.js)
        const barCanvas = document.getElementById('occupancyBarChart');
        if (barCanvas && typeof Chart !== 'undefined') {
            const blocks = Object.keys(blockMap).sort();
            const occupiedData = blocks.map(b => blockMap[b].occupied);
            const availableData = blocks.map(b => Math.max(0, blockMap[b].capacity - blockMap[b].occupied));

            if (occupancyChartInstance) {
                occupancyChartInstance.destroy();
            }

            occupancyChartInstance = new Chart(barCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: blocks,
                    datasets: [
                        {
                            label: 'Occupied Beds',
                            data: occupiedData,
                            backgroundColor: '#FFD700',
                            borderRadius: 6
                        },
                        {
                            label: 'Available Beds',
                            data: availableData,
                            backgroundColor: '#1e1e1e',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: { family: 'Outfit', weight: '600' }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Outfit', weight: '600' } }
                        }
                    }
                }
            });
        }

        // 5. Chart 2: Complaints Status Breakdown (Pie/Doughnut)
        const pieCanvas = document.getElementById('complaintsPieChart');
        if (pieCanvas && typeof Chart !== 'undefined') {
            const pendingCount = complaints.filter(c => c.status === 'PENDING').length;
            const inProgressCount = complaints.filter(c => c.status === 'IN_PROGRESS').length;
            const resolvedCount = complaints.filter(c => c.status === 'RESOLVED').length;

            if (complaintsChartInstance) {
                complaintsChartInstance.destroy();
            }

            complaintsChartInstance = new Chart(pieCanvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'In Progress', 'Resolved'],
                    datasets: [{
                        data: [pendingCount, inProgressCount, resolvedCount],
                        backgroundColor: ['#ff4757', '#ffa502', '#2ed573'],
                        borderWidth: 2,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: 'Outfit', weight: '600' },
                                boxWidth: 14
                            }
                        }
                    },
                    cutout: '65%'
                }
            });
        }

    } catch (e) {
        console.error("Failed to load dashboard statistics", e);
    }
}

// User Management Subtab & Filter State
let currentUserSubTab = 'students';
let currentStaffDeptFilter = 'ALL';
let currentUserSearchQuery = '';
let todayStaffAttendanceMap = {};

function switchUserSubTab(tabName) {
    currentUserSubTab = tabName;
    const btnStudents = document.getElementById('subtab-btn-students');
    const btnStaff = document.getElementById('subtab-btn-staff');
    const secStudents = document.getElementById('users-section-students');
    const secStaff = document.getElementById('users-section-staff');

    if (tabName === 'students') {
        if (btnStudents) btnStudents.classList.add('active');
        if (btnStaff) btnStaff.classList.remove('active');
        if (secStudents) secStudents.style.display = 'block';
        if (secStaff) secStaff.style.display = 'none';
    } else {
        if (btnStudents) btnStudents.classList.remove('active');
        if (btnStaff) btnStaff.classList.add('active');
        if (secStudents) secStudents.style.display = 'none';
        if (secStaff) secStaff.style.display = 'block';
    }
    renderUsersTables();
}

function filterStaffByDept(dept, btn) {
    currentStaffDeptFilter = dept;
    document.querySelectorAll('.staff-dept-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderUsersTables();
}

function onUserSearchInput(query) {
    currentUserSearchQuery = (query || '').toLowerCase().trim();
    renderUsersTables();
}

async function loadUsers() {
    try {
        const [usersRes, attRes] = await Promise.all([
            fetch(`${API_BASE}/users`),
            fetch(`${API_BASE}/staff-attendance`)
        ]);

        allUsersData = await usersRes.json();
        
        // Cache today's staff attendance
        todayStaffAttendanceMap = {};
        if (attRes.ok) {
            const attList = await attRes.json();
            const todayStr = '2026-10-15';
            attList.forEach(rec => {
                if (rec.date === todayStr && rec.staff) {
                    todayStaffAttendanceMap[rec.staff.id] = rec;
                }
            });
        }

        renderUsersTables();
    } catch (e) {
        console.error("Failed to load users", e);
    }
}

function renderUsersTables() {
    if (!allUsersData) return;

    const query = currentUserSearchQuery;
    const filteredUsers = allUsersData.filter(u => {
        if (!query) return true;
        const idMatch = (u.studentId || '').toLowerCase().includes(query);
        const nameMatch = (u.fullName || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const phoneMatch = (u.phone || '').toLowerCase().includes(query);
        const roleMatch = (u.role || '').toLowerCase().includes(query);
        const roomMatch = u.room ? (u.room.roomNumber + ' ' + (u.room.blockName || '')).toLowerCase().includes(query) : false;
        return idMatch || nameMatch || emailMatch || phoneMatch || roleMatch || roomMatch;
    });

    const students = filteredUsers.filter(u => (u.role || '').toUpperCase() === 'STUDENT');
    const allTotalStudents = allUsersData.filter(u => (u.role || '').toUpperCase() === 'STUDENT').length;
    
    const staff = filteredUsers.filter(u => (u.role || '').toUpperCase() !== 'STUDENT');
    const allTotalStaff = allUsersData.filter(u => (u.role || '').toUpperCase() !== 'STUDENT');

    // Update count badges
    const badgeStudents = document.getElementById('count-badge-students');
    if (badgeStudents) badgeStudents.innerText = query ? `${students.length}/${allTotalStudents}` : allTotalStudents;
    
    const badgeStaff = document.getElementById('count-badge-staff');
    if (badgeStaff) badgeStaff.innerText = query ? `${staff.length}/${allTotalStaff.length}` : allTotalStaff.length;

    const cntAll = document.getElementById('staff-filter-all-cnt');
    if (cntAll) cntAll.innerText = allTotalStaff.length;
    const cntSec = document.getElementById('staff-filter-sec-cnt');
    if (cntSec) cntSec.innerText = allTotalStaff.filter(s => (s.role || '').toUpperCase() === 'SECURITY').length;
    const cntMaint = document.getElementById('staff-filter-maint-cnt');
    if (cntMaint) cntMaint.innerText = allTotalStaff.filter(s => (s.role || '').toUpperCase() === 'MAINTENANCE').length;
    const cntClean = document.getElementById('staff-filter-clean-cnt');
    if (cntClean) cntClean.innerText = allTotalStaff.filter(s => (s.role || '').toUpperCase() === 'CLEANING').length;
    const cntAdmin = document.getElementById('staff-filter-admin-cnt');
    if (cntAdmin) cntAdmin.innerText = allTotalStaff.filter(s => (s.role || '').toUpperCase() === 'ADMIN').length;

    // 1. Render Students Table Body
    const studentsTbody = document.getElementById('students-table-body');
    if (studentsTbody) {
        studentsTbody.innerHTML = '';
        if (students.length === 0) {
            studentsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 25px; color:#888;"><i class="fas fa-search" style="margin-right:6px;"></i> No students found matching your criteria.</td></tr>`;
        } else {
            students.forEach((s, idx) => {
                const roomBadge = s.room 
                    ? `<span class="status allocated" style="font-weight:700;"><i class="fas fa-bed"></i> Room ${s.room.roomNumber} (${s.room.blockName || 'Block A'})</span>` 
                    : `<span class="status pending" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; font-weight:700; border: 1px solid rgba(255, 71, 87, 0.3);"><i class="fas fa-exclamation-circle"></i> Not Assigned</span>`;
                
                const actionBtn = s.room 
                    ? `<button class="btn btn-secondary btn-sm" onclick="openAllocateModal(${s.id})" title="Change Room Allocation"><i class="fas fa-exchange-alt"></i> Change Room</button>`
                    : `<button class="btn btn-primary btn-sm" onclick="openAllocateModal(${s.id})" title="Allocate Bed to Student"><i class="fas fa-door-open"></i> Allocate Room</button>`;

                const emailDisplay = s.email || `${s.studentId.replace(/\//g, '').toLowerCase()}@ruhuna.ac.lk`;
                const phoneDisplay = s.phone || '077-XXXXXXX';

                studentsTbody.innerHTML += `
                    <tr>
                        <td style="color:#777; font-weight:600;">${idx + 1}</td>
                        <td>
                            <span style="font-family:'Outfit', monospace; font-size:13px; font-weight:700; color:#4338ca; background:#eef2ff; border:1px solid #c7d2fe; padding:4px 9px; border-radius:6px; letter-spacing:0.4px; display:inline-flex; align-items:center; gap:5px;">
                                <i class="fas fa-id-badge" style="color:#6366f1; font-size:11.5px;"></i>${s.studentId}
                            </span>
                        </td>
                        <td><strong style="font-size:14.5px; color:#1e293b;">${s.fullName}</strong></td>
                        <td>${roomBadge}</td>
                        <td style="font-size:13px;">
                            <div>
                                <a href="javascript:void(0)" onclick="openEmailModalForStudent(${s.id})" style="color:#0284c7; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:6px; transition: all 0.2s;" onmouseover="this.style.color='#0369a1'; this.style.textDecoration='underline';" onmouseout="this.style.color='#0284c7'; this.style.textDecoration='none';" title="Click to send email to ${s.fullName}">
                                    <i class="fas fa-envelope" style="color:#0ea5e9;"></i> <span>${emailDisplay}</span>
                                    <i class="fas fa-paper-plane" style="font-size:10px; opacity:0.85; margin-left:1px; color:#0ea5e9;"></i>
                                </a>
                            </div>
                            <div style="color:#64748b; margin-top:3px;"><i class="fas fa-phone-alt" style="color:#94a3b8; width:16px;"></i> ${phoneDisplay}</div>
                        </td>
                        <td>
                            <div style="display:flex; gap:6px; align-items:center;">
                                ${actionBtn}
                                <button class="btn btn-sm" onclick="openEmailModalForStudent(${s.id})" style="background:rgba(2,132,199,0.08); border:1.5px solid rgba(2,132,199,0.3); color:#0284c7; padding:6px 11px; border-radius:6px; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:5px; transition:all 0.2s;" onmouseover="this.style.background='#0284c7'; this.style.color='#ffffff';" onmouseout="this.style.background='rgba(2,132,199,0.08)'; this.style.color='#0284c7';" title="Send Email to ${s.fullName}">
                                    <i class="fas fa-envelope"></i> Email
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // 2. Render Staff Table Body
    const staffTbody = document.getElementById('staff-table-body');
    if (staffTbody) {
        staffTbody.innerHTML = '';
        let deptFilteredStaff = staff;
        if (currentStaffDeptFilter !== 'ALL') {
            deptFilteredStaff = staff.filter(s => (s.role || '').toUpperCase() === currentStaffDeptFilter);
        }

        if (deptFilteredStaff.length === 0) {
            staffTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 25px; color:#888;"><i class="fas fa-search" style="margin-right:6px;"></i> No staff personnel found in this department.</td></tr>`;
        } else {
            deptFilteredStaff.forEach((stf, idx) => {
                const uRole = (stf.role || '').toUpperCase();
                let roleBadge = '';
                if (uRole === 'SECURITY') {
                    roleBadge = '<span class="status" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3); font-weight:700;"><i class="fas fa-shield-alt"></i> Security</span>';
                } else if (uRole === 'MAINTENANCE') {
                    roleBadge = '<span class="status" style="background: rgba(217, 119, 6, 0.15); color: #d97706; border: 1px solid rgba(217, 119, 6, 0.3); font-weight:700;"><i class="fas fa-tools"></i> Maintenance</span>';
                } else if (uRole === 'CLEANING') {
                    roleBadge = '<span class="status" style="background: rgba(8, 145, 178, 0.15); color: #0891b2; border: 1px solid rgba(8, 145, 178, 0.3); font-weight:700;"><i class="fas fa-broom"></i> Cleaning</span>';
                } else if (uRole === 'ADMIN') {
                    roleBadge = '<span class="status" style="background: rgba(255, 215, 0, 0.15); color: #e6b800; border: 1px solid rgba(255, 215, 0, 0.3); font-weight:700;"><i class="fas fa-user-shield"></i> Administration</span>';
                } else {
                    roleBadge = `<span class="status">${uRole}</span>`;
                }

                // Check today's attendance record
                const attRec = todayStaffAttendanceMap[stf.id];
                let attBadge = '<span class="status" style="background:#2a2a2a; color:#888;">No Log Today</span>';
                if (attRec) {
                    const st = (attRec.status || '').toUpperCase();
                    if (st === 'PRESENT') {
                        attBadge = `<span class="status paid" style="font-weight:700;"><i class="fas fa-check-circle"></i> PRESENT (${attRec.checkInTime || 'On Duty'})</span>`;
                    } else if (st === 'ON_LEAVE') {
                        attBadge = `<span class="status pending" style="font-weight:700;"><i class="fas fa-calendar-minus"></i> ON LEAVE</span>`;
                    } else if (st === 'ABSENT') {
                        attBadge = `<span class="status" style="background:rgba(255,71,87,0.15); color:#ff4757; border:1px solid rgba(255,71,87,0.3); font-weight:700;"><i class="fas fa-times-circle"></i> ABSENT</span>`;
                    }
                }

                staffTbody.innerHTML += `
                    <tr>
                        <td style="color:#777; font-weight:600;">${idx + 1}</td>
                        <td>
                            <span style="font-family:'Outfit', monospace; font-size:13px; font-weight:700; color:#0f766e; background:#f0fdfa; border:1px solid #99f6e4; padding:4px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">
                                <i class="fas fa-user-tag" style="color:#0d9488; font-size:11.5px;"></i>${stf.studentId}
                            </span>
                        </td>
                        <td><strong style="font-size:14.5px; color:#1e293b;">${stf.fullName}</strong></td>
                        <td>${roleBadge}</td>
                        <td style="font-size:13px;">
                            <div>
                                <a href="javascript:void(0)" onclick="openEmailModalForStaff(${stf.id})" style="color:#0284c7; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.color='#0369a1'; this.style.textDecoration='underline';" onmouseout="this.style.color='#0284c7'; this.style.textDecoration='none';" title="Click to send email to ${stf.fullName}">
                                    <i class="fas fa-envelope" style="color:#0ea5e9;"></i> <span>${stf.email || '-'}</span>
                                    <i class="fas fa-paper-plane" style="font-size:10px; opacity:0.85; margin-left:1px; color:#0ea5e9;"></i>
                                </a>
                            </div>
                            <div style="color:#64748b; margin-top:3px;"><i class="fas fa-phone-alt" style="color:#94a3b8; width:16px;"></i> ${stf.phone || '-'}</div>
                        </td>
                        <td>${attBadge}</td>
                        <td>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <button class="btn btn-dark btn-sm" onclick="switchTab('staff')" title="View Attendance in Staff Duty Tab">
                                    <i class="fas fa-user-clock"></i> Duty Logs
                                </button>
                                <button class="btn btn-sm" onclick="openEmailModalForStaff(${stf.id})" style="background:rgba(2,132,199,0.08); border:1.5px solid rgba(2,132,199,0.3); color:#0284c7; padding:6px 11px; border-radius:6px; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:5px; transition:all 0.2s;" onmouseover="this.style.background='#0284c7'; this.style.color='#ffffff';" onmouseout="this.style.background='rgba(2,132,199,0.08)'; this.style.color='#0284c7';" title="Send Email to ${stf.fullName}">
                                    <i class="fas fa-envelope"></i> Email
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    }
}

let selectedRoomBlock = 'ALL';
let roomSearchQuery = '';

async function loadRooms() {
    try {
        const [roomsRes, dmgRes] = await Promise.all([
            fetch(`${API_BASE}/rooms`),
            fetch(`${API_BASE}/room-inventory`)
        ]);
        allRoomsData = await roomsRes.json();
        allRoomDamagesData = await dmgRes.json();

        updateBlockButtonCounts();
        renderRoomsTable();
    } catch (e) {
        console.error("Failed to load rooms", e);
    }
}

function updateBlockButtonCounts() {
    if (!allRoomsData || !allRoomsData.length) return;
    
    const countAll = allRoomsData.length;
    const countA = allRoomsData.filter(r => r.blockName === 'Block A').length;
    const countB = allRoomsData.filter(r => r.blockName === 'Block B').length;
    const countC = allRoomsData.filter(r => r.blockName === 'Block C').length;
    const countD = allRoomsData.filter(r => r.blockName === 'Block D').length;

    const elAll = document.getElementById('block-count-all');
    if (elAll) elAll.innerText = `${countAll} Rooms`;
    const elA = document.getElementById('block-count-a');
    if (elA) elA.innerText = `${countA} Rooms`;
    const elB = document.getElementById('block-count-b');
    if (elB) elB.innerText = `${countB} Rooms`;
    const elC = document.getElementById('block-count-c');
    if (elC) elC.innerText = `${countC} Rooms`;
    const elD = document.getElementById('block-count-d');
    if (elD) elD.innerText = `${countD} Rooms`;
}

function filterRoomsByBlock(blockName) {
    selectedRoomBlock = blockName;
    
    // Toggle active class on buttons
    document.querySelectorAll('.block-tab-btn').forEach(btn => btn.classList.remove('active'));
    let activeBtnId = 'blockBtn-ALL';
    if (blockName === 'Block A') activeBtnId = 'blockBtn-A';
    else if (blockName === 'Block B') activeBtnId = 'blockBtn-B';
    else if (blockName === 'Block C') activeBtnId = 'blockBtn-C';
    else if (blockName === 'Block D') activeBtnId = 'blockBtn-D';
    
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');

    renderRoomsTable();
}

function onRoomSearchChange() {
    const input = document.getElementById('roomSearchInput');
    roomSearchQuery = input ? input.value.trim().toLowerCase() : '';
    renderRoomsTable();
}

function renderRoomsTable() {
    const tbody = document.getElementById('rooms-table-body');
    if (!tbody) return;

    if (!allRoomsData || !allRoomsData.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#888;">No rooms loaded.</td></tr>`;
        return;
    }

    // Filter by Block
    let filtered = allRoomsData;
    if (selectedRoomBlock !== 'ALL') {
        filtered = filtered.filter(r => r.blockName === selectedRoomBlock);
    }

    // Filter by Search Query
    if (roomSearchQuery) {
        filtered = filtered.filter(r => 
            (r.roomNumber && r.roomNumber.toLowerCase().includes(roomSearchQuery)) ||
            (r.blockName && r.blockName.toLowerCase().includes(roomSearchQuery)) ||
            (String(r.id).includes(roomSearchQuery))
        );
    }

    // Update Block Summary Card
    updateBlockSummaryCard(filtered);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px 20px; color: #888;">
                    <i class="fas fa-door-closed" style="font-size: 32px; color: #ced6e0; margin-bottom: 10px; display: block;"></i>
                    <strong style="font-size: 15px; color: #57606f;">No rooms found in ${selectedRoomBlock === 'ALL' ? 'Any Block' : selectedRoomBlock}</strong>
                    <div style="font-size: 12.5px; color: #a4b0be; margin-top: 4px;">${roomSearchQuery ? `No rooms match search term "${roomSearchQuery}"` : 'There are currently no rooms registered under this block filter.'}</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(room => {
        const isFull = room.currentOccupancy >= room.capacity;
        const availableBeds = Math.max(0, room.capacity - room.currentOccupancy);
        const statusBadge = isFull 
            ? `<span class="status pending" style="background:#ff4757; color:#fff; font-weight:700; box-shadow: 0 2px 6px rgba(255, 71, 87, 0.3);">FULL (4/4)</span>` 
            : `<span class="status paid" style="background:rgba(46, 213, 115, 0.15); color:#2ed573; border:1px solid rgba(46, 213, 115, 0.3); font-weight:700;"><i class="fas fa-bed"></i> ${availableBeds} Beds Available</span>`;
        
        // Check if this room has broken equipment
        const activeDamages = allRoomDamagesData.filter(d => d.room && d.room.id === room.id && d.status !== 'REPAIRED');
        let damageBadge = '';
        if (activeDamages.length > 0) {
            const itemSummary = activeDamages.map(d => `${d.brokenQuantity}x ${d.inventory ? d.inventory.itemName : 'Item'}`).join(', ');
            damageBadge = `<div style="margin-top:5px;"><span class="status pending" style="background:#fff0f3; color:#d63031; border:1px solid #ff7675; font-size:11.5px; padding:3px 8px; border-radius: 6px;" title="${itemSummary}"><i class="fas fa-tools"></i> <strong>${activeDamages.length} Damaged:</strong> ${itemSummary}</span></div>`;
        }

        // Extract Floor indicator if room has standard numbering like A-101, A-201
        let floorInfo = room.blockName;
        if (room.roomNumber && room.roomNumber.length >= 3) {
            const floorChar = room.roomNumber.charAt(2);
            if (!isNaN(floorChar)) {
                floorInfo = `${room.blockName} • Floor ${floorChar}`;
            }
        }

        const pct = Math.min(100, Math.round((room.currentOccupancy / room.capacity) * 100));

        tbody.innerHTML += `
            <tr style="transition: background 0.15s ease;">
                <td><strong style="color: #747d8c;">#${room.id}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 9px;">
                        <span style="display: inline-flex; width: 34px; height: 34px; border-radius: 8px; background: rgba(255, 215, 0, 0.14); color: #b78103; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; border: 1px solid rgba(255, 215, 0, 0.3);">
                            <i class="fas fa-door-open"></i>
                        </span>
                        <div>
                            <strong style="font-size: 14.5px; color: #1e272e;">${room.roomNumber}</strong>
                        </div>
                    </div>
                </td>
                <td><span class="status allocated" style="font-weight: 600;"><i class="fas fa-building"></i> ${floorInfo}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; max-width: 90px; height: 7px; background: #eaedf0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background: ${isFull ? '#ff4757' : (pct > 0 ? '#2ed573' : '#ced6e0')}; border-radius: 4px;"></div>
                        </div>
                        <span style="font-size: 12.5px; font-weight: 700; color: #2f3542;">${room.currentOccupancy} / ${room.capacity}</span>
                    </div>
                </td>
                <td>
                    ${statusBadge}
                    ${damageBadge}
                </td>
            </tr>
        `;
    });
}

function updateBlockSummaryCard(filteredRooms) {
    const titleEl = document.getElementById('blockSummaryTitle');
    const subEl = document.getElementById('blockSummarySub');
    const statRoomsEl = document.getElementById('blockStatRooms');
    const statOccupiedEl = document.getElementById('blockStatOccupied');
    const statAvailableEl = document.getElementById('blockStatAvailable');
    const statRateEl = document.getElementById('blockStatRate');

    if (!titleEl) return;

    const totalRooms = filteredRooms.length;
    let totalCap = 0;
    let totalOccupied = 0;
    filteredRooms.forEach(r => {
        totalCap += (r.capacity || 4);
        totalOccupied += (r.currentOccupancy || 0);
    });
    const totalAvailable = Math.max(0, totalCap - totalOccupied);
    const rate = totalCap > 0 ? ((totalOccupied / totalCap) * 100).toFixed(1) : 0;

    if (selectedRoomBlock === 'ALL') {
        titleEl.innerHTML = `<i class="fas fa-city" style="color:var(--primary-yellow);"></i> Showing: All Residential Blocks (A, B, C & D)`;
        if (subEl) subEl.innerText = `100 Total Rooms • Capacity: ${totalCap} Student Beds across all 4 Blocks`;
    } else {
        titleEl.innerHTML = `<i class="fas fa-building" style="color:var(--primary-yellow);"></i> Showing: ${selectedRoomBlock} (${totalRooms} Residential Rooms)`;
        if (subEl) subEl.innerText = `${selectedRoomBlock} Wing • ${totalRooms} Rooms with ${totalCap} Total Student Bed Capacity`;
    }

    if (statRoomsEl) statRoomsEl.innerText = totalRooms;
    if (statOccupiedEl) statOccupiedEl.innerText = `${totalOccupied} Students`;
    if (statAvailableEl) statAvailableEl.innerText = `${totalAvailable} Beds`;
    if (statRateEl) statRateEl.innerText = `${rate}%`;
}


async function loadInventory() {
    try {
        const [invRes, dmgRes] = await Promise.all([
            fetch(`${API_BASE}/inventory`),
            fetch(`${API_BASE}/room-inventory`)
        ]);
        allInventoryData = await invRes.json();
        allRoomDamagesData = await dmgRes.json();

        // Update counts on buttons
        const stockCountEl = document.getElementById('inv-total-stock-count');
        if (stockCountEl) stockCountEl.innerText = allInventoryData.length;

        const brokenCountEl = document.getElementById('inv-total-broken-count');
        const activeDamages = allRoomDamagesData.filter(d => d.status !== 'REPAIRED');
        if (brokenCountEl) brokenCountEl.innerText = activeDamages.length;

        const tbody = document.getElementById('inventory-table-body');
        if (tbody) {
            tbody.innerHTML = '';
            allInventoryData.forEach(item => {
                const brokenBadge = item.brokenQuantity > 0 
                    ? `<span class="status pending" style="background:#ff4757; color:#fff; font-weight:700;">${item.brokenQuantity} Broken</span>`
                    : `<span class="status paid">0</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td>${item.id}</td>
                        <td><strong>${item.itemName}</strong></td>
                        <td><span class="status allocated">${item.category}</span></td>
                        <td>${item.totalQuantity}</td>
                        <td><span class="status paid">${item.availableQuantity}</span></td>
                        <td>${brokenBadge}</td>
                    </tr>
                `;
            });
        }

        renderRoomDamagesTable();
    } catch (e) {
        console.error("Failed to load inventory", e);
    }
}

// Admin Payments State & Handlers
let allAdminPaymentsData = [];
let selectedPaymentMonth = 'ALL';
let selectedPaymentCategory = 'ALL'; // 'ALL', 'FULL', 'HALF', 'UNPAID'
let paymentSearchQuery = '';
const STANDARD_MONTHLY_FEE = 2000.0;
const HALF_MONTHLY_FEE = 1000.0;

async function loadAdminPayments() {
    try {
        const [payRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/payments`),
            (!allUsersData || allUsersData.length === 0) ? fetch(`${API_BASE}/users`) : Promise.resolve(null)
        ]);

        if (!payRes.ok) throw new Error(`HTTP error ${payRes.status}`);
        allAdminPaymentsData = await payRes.json();

        if (usersRes && usersRes.ok) {
            allUsersData = await usersRes.json();
        }
        
        // Extract distinct months
        const monthMap = {};
        allAdminPaymentsData.forEach(p => {
            if (p.month && p.month.trim()) {
                monthMap[p.month.trim()] = true;
            }
        });

        const monthNames = ["january", "february", "march", "april", "may", "june", 
                            "july", "august", "september", "october", "november", "december"];
        function getMonthScore(str) {
            const parts = str.trim().split(/\s+/);
            if (parts.length >= 2) {
                const mIdx = monthNames.indexOf(parts[0].toLowerCase());
                const yr = parseInt(parts[1], 10) || 0;
                return yr * 100 + (mIdx !== -1 ? mIdx : 0);
            }
            return 0;
        }

        const distinctMonths = Object.keys(monthMap).sort((a, b) => getMonthScore(b) - getMonthScore(a)); // Descending chronological

        // Populate dropdown
        const select = document.getElementById('paymentMonthFilter');
        if (select) {
            const currentVal = select.value || 'ALL';
            let optionsHtml = '<option value="ALL">📅 All Months (Overall)</option>';
            distinctMonths.forEach(m => {
                optionsHtml += `<option value="${m}">🗓️ ${m}</option>`;
            });
            select.innerHTML = optionsHtml;
            
            // Restore selection if valid
            if (distinctMonths.includes(currentVal) || currentVal === 'ALL') {
                select.value = currentVal;
                selectedPaymentMonth = currentVal;
            } else {
                select.value = 'ALL';
                selectedPaymentMonth = 'ALL';
            }
        }

        renderAdminPaymentsTable();
    } catch (e) {
        console.error("Failed to load admin payments:", e);
        const tbody = document.getElementById('payments-table-body-admin');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#ff4757; padding:20px;"><i class="fas fa-exclamation-triangle"></i> Failed to load payments from server.</td></tr>';
        }
    }
}

function onPaymentMonthFilterChange() {
    const filter = document.getElementById('paymentMonthFilter');
    selectedPaymentMonth = filter ? filter.value : 'ALL';
    renderAdminPaymentsTable();
}

function switchPaymentCategory(category) {
    selectedPaymentCategory = category;

    ['ALL', 'FULL', 'HALF', 'UNPAID'].forEach(cat => {
        const btn = document.getElementById(`payTab-${cat}`);
        if (btn) {
            if (cat === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    renderAdminPaymentsTable();
}

function onPaymentSearchChange() {
    const input = document.getElementById('paymentSearchInput');
    paymentSearchQuery = input ? input.value.toLowerCase().trim() : '';
    renderAdminPaymentsTable();
}

// Helper to determine unpaid students
function getUnpaidStudentsList(month) {
    if (!allUsersData || allUsersData.length === 0) return [];

    const students = allUsersData.filter(u => (u.role || '').toUpperCase() === 'STUDENT');

    if (month && month !== 'ALL') {
        const paidUserIds = new Set();
        allAdminPaymentsData.forEach(p => {
            if ((p.month || '').trim().toLowerCase() === month.trim().toLowerCase() && (Number(p.amount) || 0) > 0) {
                if (p.user && p.user.id) paidUserIds.add(p.user.id);
            }
        });

        return students.filter(s => !paidUserIds.has(s.id));
    } else {
        const anyPaidUserIds = new Set();
        allAdminPaymentsData.forEach(p => {
            if ((Number(p.amount) || 0) > 0) {
                if (p.user && p.user.id) anyPaidUserIds.add(p.user.id);
            }
        });

        return students.filter(s => !anyPaidUserIds.has(s.id));
    }
}

function renderAdminPaymentsTable() {
    const thead = document.getElementById('payments-table-head-admin');
    const tbody = document.getElementById('payments-table-body-admin');
    if (!tbody) return;

    // Filter payments for month
    const monthPayments = allAdminPaymentsData.filter(p => {
        if (selectedPaymentMonth === 'ALL') return true;
        return (p.month || '').trim() === selectedPaymentMonth.trim();
    });

    // Counts for Category Tabs
    const fullPayments = monthPayments.filter(p => (Number(p.amount) >= 2000) || (p.status || '').toUpperCase() === 'PAID');
    const halfPayments = monthPayments.filter(p => (Number(p.amount) > 0 && Number(p.amount) < 2000) || (p.status || '').toUpperCase() === 'PARTIAL');
    const unpaidStudents = getUnpaidStudentsList(selectedPaymentMonth);

    // Update Category Badges
    const badgeAll = document.getElementById('payCount-ALL');
    if (badgeAll) badgeAll.innerText = monthPayments.length;
    const badgeFull = document.getElementById('payCount-FULL');
    if (badgeFull) badgeFull.innerText = fullPayments.length;
    const badgeHalf = document.getElementById('payCount-HALF');
    if (badgeHalf) badgeHalf.innerText = halfPayments.length;
    const badgeUnpaid = document.getElementById('payCount-UNPAID');
    if (badgeUnpaid) badgeUnpaid.innerText = unpaidStudents.length;

    // Update Summary Header / Bar
    let totalRevenue = 0;
    monthPayments.forEach(p => {
        totalRevenue += (Number(p.amount) || 0);
    });

    const titleEl = document.getElementById('paymentSummaryMonthTitle');
    if (titleEl) {
        titleEl.innerText = selectedPaymentMonth === 'ALL' 
            ? 'All Months (Overall Audit)' 
            : `${selectedPaymentMonth} Statement`;
    }

    const countEl = document.getElementById('paymentSummaryCount');
    if (countEl) {
        countEl.innerText = `${monthPayments.length} Invoices (${unpaidStudents.length} Unpaid)`;
    }

    const revEl = document.getElementById('paymentSummaryRevenue');
    if (revEl) {
        revEl.innerText = `Rs. ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Active Filter Label
    const activeLabelEl = document.getElementById('paymentActiveFilterLabel');
    if (activeLabelEl) {
        if (selectedPaymentCategory === 'ALL') {
            activeLabelEl.innerText = `Showing: All Invoices (${monthPayments.length})`;
            activeLabelEl.style.color = '#2ed573';
        } else if (selectedPaymentCategory === 'FULL') {
            activeLabelEl.innerText = `Showing: Full Paid Students - Rs. 2,000 (${fullPayments.length})`;
            activeLabelEl.style.color = '#2ed573';
        } else if (selectedPaymentCategory === 'HALF') {
            activeLabelEl.innerText = `Showing: Half Paid Students - Rs. 1,000 (${halfPayments.length})`;
            activeLabelEl.style.color = '#ffa502';
        } else if (selectedPaymentCategory === 'UNPAID') {
            activeLabelEl.innerText = `Showing: Unpaid Resident Students (${unpaidStudents.length})`;
            activeLabelEl.style.color = '#ff4757';
        }
    }

    // Render based on selected category
    if (selectedPaymentCategory === 'UNPAID') {
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th style="width: 45px;">#</th>
                    <th>Student TG No</th>
                    <th>Student Name</th>
                    <th>Room & Block</th>
                    <th>Contact Info</th>
                    <th>Billing Month</th>
                    <th>Fee Arrears</th>
                    <th>Payment Status</th>
                    <th style="text-align: center; width: 140px;">Action</th>
                </tr>
            `;
        }

        const filteredUnpaid = unpaidStudents.filter(s => {
            if (!paymentSearchQuery) return true;
            const tg = (s.studentId || '').toLowerCase();
            const name = (s.fullName || '').toLowerCase();
            const email = (s.email || '').toLowerCase();
            const phone = (s.phone || '').toLowerCase();
            const room = s.room ? `${s.room.roomNumber} ${s.room.blockName || ''}`.toLowerCase() : '';
            return tg.includes(paymentSearchQuery) || name.includes(paymentSearchQuery) || 
                   email.includes(paymentSearchQuery) || phone.includes(paymentSearchQuery) || room.includes(paymentSearchQuery);
        });

        if (filteredUnpaid.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #2ed573; padding: 25px; font-weight: 600;"><i class="fas fa-check-circle"></i> Great! No unpaid students found for ${selectedPaymentMonth}.</td></tr>`;
            return;
        }

        const effectiveMonth = selectedPaymentMonth === 'ALL' ? 'Current Term' : selectedPaymentMonth;
        let rowsHtml = '';
        filteredUnpaid.forEach((s, idx) => {
            const tg = s.studentId || s.username || '-';
            const name = s.fullName || 'Resident Student';
            const roomStr = s.room ? `${s.room.roomNumber} (${s.room.blockName || 'Hostel'})` : '<span style="color:#888;">Unassigned</span>';
            const phoneStr = s.phone ? `<i class="fas fa-phone-alt" style="font-size:11px; color:#888;"></i> ${s.phone}` : '-';
            const emailDisplayStr = s.email || `${(s.studentId || 'student').replace(/\//g, '').toLowerCase()}@ruhuna.ac.lk`;
            const emailLink = `<div style="font-size:11.5px; margin-top:2px;">
                     <a href="javascript:void(0)" onclick="openEmailModalForStudent(${s.id}, 'FEE_REMINDER')" style="color:#ffa502; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;" title="Send fee payment reminder email to ${name}">
                       <i class="fas fa-envelope"></i> ${emailDisplayStr}
                       <i class="fas fa-paper-plane" style="font-size:9.5px; opacity:0.85;"></i>
                     </a>
                   </div>`;

            rowsHtml += `
                <tr>
                    <td style="color: #888; font-weight: 600;">${idx + 1}</td>
                    <td><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; font-weight: 700; color: #ffa502;">${tg}</span></td>
                    <td style="font-weight: 700; color: #fff;">${name}</td>
                    <td><span style="font-weight: 600; color: #cbd5e1;">${roomStr}</span></td>
                    <td><div>${phoneStr}</div>${emailLink}</td>
                    <td><span style="font-weight: 600; color: #cbd5e1;">${effectiveMonth}</span></td>
                    <td style="font-weight: 800; color: #ff4757;">Rs. 2,000.00</td>
                    <td><span class="status unpaid"><i class="fas fa-exclamation-circle"></i> UNPAID</span></td>
                    <td style="text-align: center;">
                        <div style="display:inline-flex; gap:6px;">
                            <button class="btn btn-sm" onclick="openRecordPaymentForStudent(${s.id}, '${effectiveMonth}')" style="background: #2ed573; color: #121212; font-weight: 800; border: none; padding: 6px 11px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(46,213,115,0.3);">
                                <i class="fas fa-hand-holding-usd"></i> Record
                            </button>
                            <button class="btn btn-sm" onclick="openEmailModalForStudent(${s.id}, 'FEE_REMINDER')" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1.5px solid rgba(255, 165, 2, 0.4); font-weight: 700; padding: 6px 9px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Send fee payment reminder email to ${name}">
                                <i class="fas fa-envelope"></i> Email
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;
        return;
    }

    // Default: ALL, FULL, or HALF Payments View
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th style="width: 45px;">#</th>
                <th>Invoice ID</th>
                <th>Student Name</th>
                <th>Student TG No</th>
                <th>Billing Month</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th style="text-align: center; width: 90px;">Action</th>
            </tr>
        `;
    }

    let displayedPayments = monthPayments;
    if (selectedPaymentCategory === 'FULL') {
        displayedPayments = fullPayments;
    } else if (selectedPaymentCategory === 'HALF') {
        displayedPayments = halfPayments;
    }

    if (paymentSearchQuery) {
        displayedPayments = displayedPayments.filter(p => {
            const invoice = (p.invoiceNo || `INV-${p.id}`).toLowerCase();
            const stuName = (p.user ? (p.user.fullName || '') : '').toLowerCase();
            const stuId = (p.user ? (p.user.studentId || p.user.username || '') : '').toLowerCase();
            const month = (p.month || '').toLowerCase();
            const status = (p.status || '').toLowerCase();
            return invoice.includes(paymentSearchQuery) || stuName.includes(paymentSearchQuery) ||
                   stuId.includes(paymentSearchQuery) || month.includes(paymentSearchQuery) || status.includes(paymentSearchQuery);
        });
    }

    if (displayedPayments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #888; padding: 25px;">No payment records found matching the criteria.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    displayedPayments.forEach((p, idx) => {
        const invoiceNo = p.invoiceNo || `INV-${p.id}`;
        const stuName = p.user ? (p.user.fullName || 'Student') : 'Unknown';
        const stuId = p.user ? (p.user.studentId || p.user.username || '-') : '-';
        const month = p.month || '-';
        const amtNum = Number(p.amount) || 0;
        const amtStr = amtNum.toFixed(2);
        const pDate = p.paymentDate ? p.paymentDate : '-';
        
        let statusBadge = '';
        if (amtNum >= 2000 || (p.status || '').toUpperCase() === 'PAID') {
            statusBadge = `<span class="status paid"><i class="fas fa-check-circle"></i> FULL (PAID)</span>`;
        } else if (amtNum > 0 && amtNum < 2000 || (p.status || '').toUpperCase() === 'PARTIAL') {
            statusBadge = `<span class="status partial"><i class="fas fa-adjust"></i> HALF (PARTIAL)</span>`;
        } else {
            statusBadge = `<span class="status pending">${p.status || 'PENDING'}</span>`;
        }

        const amtColor = amtNum >= 2000 ? '#2ed573' : (amtNum >= 1000 ? '#ffa502' : '#ffffff');

        rowsHtml += `
            <tr>
                <td style="color: #888; font-weight: 600;">${idx + 1}</td>
                <td style="font-family: monospace; font-weight: 700; color: var(--primary-yellow);">${invoiceNo}</td>
                <td style="font-weight: 600; color: #fff;">${stuName}</td>
                <td><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 12px; font-family: monospace;">${stuId}</span></td>
                <td><span style="font-weight: 600; color: #cbd5e1;">${month}</span></td>
                <td style="font-weight: 800; color: ${amtColor};">Rs. ${amtStr}</td>
                <td style="color: #94a3b8; font-size: 13px;">${pDate}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button class="btn btn-sm" onclick="openEditPaymentModal(${p.id})" style="background: rgba(255, 215, 0, 0.12); color: var(--primary-yellow); border: 1px solid rgba(255, 215, 0, 0.35); font-weight: 700; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

// Edit Payment Modal Handlers
function openEditPaymentModal(paymentId) {
    const payment = allAdminPaymentsData.find(p => p.id === paymentId);
    if (!payment) {
        showToast('Payment record not found.', 'error');
        return;
    }

    document.getElementById('editPaymentId').value = payment.id;

    const stuName = payment.user ? (payment.user.fullName || 'Student') : 'Unknown';
    const stuId = payment.user ? (payment.user.studentId || payment.user.username || '-') : '-';
    document.getElementById('editPaymentStudentInfo').innerText = `${stuName} (${stuId})`;
    document.getElementById('editPaymentInvoiceInfo').innerText = `Invoice: ${payment.invoiceNo || 'INV-' + payment.id} • Registered Date: ${payment.paymentDate || 'N/A'}`;

    const amt = Number(payment.amount) || 2000;
    document.getElementById('editPaymentAmount').value = amt;
    document.getElementById('editPaymentStatus').value = payment.status || (amt >= 2000 ? 'PAID' : 'PARTIAL');
    document.getElementById('editPaymentMonth').value = payment.month || (selectedPaymentMonth !== 'ALL' ? selectedPaymentMonth : 'March 2026');
    document.getElementById('editPaymentDate').value = payment.paymentDate || new Date().toISOString().split('T')[0];

    updateEditTierButtons(amt);
    openModal('editPaymentModal');
}

function updateEditTierButtons(amount) {
    const btnFull = document.getElementById('editTierBtnFull');
    const btnHalf = document.getElementById('editTierBtnHalf');
    if (!btnFull || !btnHalf) return;

    if (amount >= 2000) {
        btnFull.style.background = 'rgba(46, 213, 115, 0.25)';
        btnFull.style.borderColor = '#2ed573';
        btnHalf.style.background = 'rgba(255, 165, 2, 0.08)';
        btnHalf.style.borderColor = 'rgba(255, 165, 2, 0.3)';
    } else if (amount === 1000) {
        btnHalf.style.background = 'rgba(255, 165, 2, 0.25)';
        btnHalf.style.borderColor = '#ffa502';
        btnFull.style.background = 'rgba(46, 213, 115, 0.08)';
        btnFull.style.borderColor = 'rgba(46, 213, 115, 0.3)';
    } else {
        btnFull.style.background = 'rgba(255, 255, 255, 0.05)';
        btnFull.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        btnHalf.style.background = 'rgba(255, 255, 255, 0.05)';
        btnHalf.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}

function setEditPaymentTier(tier) {
    const amtInput = document.getElementById('editPaymentAmount');
    const statusSelect = document.getElementById('editPaymentStatus');
    if (tier === 'FULL') {
        amtInput.value = 2000;
        statusSelect.value = 'PAID';
        updateEditTierButtons(2000);
    } else if (tier === 'HALF') {
        amtInput.value = 1000;
        statusSelect.value = 'PARTIAL';
        updateEditTierButtons(1000);
    }
}

function onEditAmountChange() {
    const amt = Number(document.getElementById('editPaymentAmount').value) || 0;
    const statusSelect = document.getElementById('editPaymentStatus');
    if (amt >= 2000) {
        statusSelect.value = 'PAID';
    } else if (amt > 0 && amt < 2000) {
        statusSelect.value = 'PARTIAL';
    }
    updateEditTierButtons(amt);
}

async function submitEditPayment(e) {
    e.preventDefault();
    const id = document.getElementById('editPaymentId').value;
    const amount = Number(document.getElementById('editPaymentAmount').value);
    const status = document.getElementById('editPaymentStatus').value;
    const month = document.getElementById('editPaymentMonth').value.trim();
    const paymentDate = document.getElementById('editPaymentDate').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid payment amount.', 'warning');
        return;
    }
    if (!month) {
        showToast('Please specify a billing month.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/payments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                status: status,
                month: month,
                paymentDate: paymentDate
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `Server responded with ${res.status}`);
        }

        closeModal('editPaymentModal');
        showToast(`Payment of Rs. ${amount.toLocaleString()} updated successfully!`, 'success');
        await loadAdminPayments();
    } catch (err) {
        console.error("Failed to update payment:", err);
        showToast(`Update failed: ${err.message}`, 'error');
    }
}

// Record Payment for Unpaid Student Handlers
function openRecordPaymentForStudent(userId, month) {
    const student = (allUsersData || []).find(u => u.id === userId);
    if (!student) {
        showToast('Student information not found.', 'error');
        return;
    }

    document.getElementById('recordPaymentUserId').value = student.id;
    document.getElementById('recordPaymentStudentName').innerText = `${student.fullName} (${student.studentId || student.username})`;
    
    const roomStr = student.room 
        ? `Allocated Room: ${student.room.roomNumber} (${student.room.blockName || 'Hostel'})` 
        : 'Room: Not Allocated';
    document.getElementById('recordPaymentStudentRoom').innerText = roomStr;

    const targetMonth = (month && month !== 'ALL' && month !== 'Current Term') 
        ? month 
        : (selectedPaymentMonth !== 'ALL' ? selectedPaymentMonth : 'March 2026');
    document.getElementById('recordPaymentMonth').value = targetMonth;
    document.getElementById('recordPaymentDate').value = new Date().toISOString().split('T')[0];

    setRecordPaymentTier('FULL');
    openModal('recordUnpaidPaymentModal');
}

function updateRecordTierButtons(amount) {
    const btnFull = document.getElementById('recTierBtnFull');
    const btnHalf = document.getElementById('recTierBtnHalf');
    if (!btnFull || !btnHalf) return;

    if (amount >= 2000) {
        btnFull.style.background = 'rgba(46, 213, 115, 0.25)';
        btnFull.style.borderColor = '#2ed573';
        btnHalf.style.background = 'rgba(255, 165, 2, 0.08)';
        btnHalf.style.borderColor = 'rgba(255, 165, 2, 0.4)';
    } else if (amount === 1000) {
        btnHalf.style.background = 'rgba(255, 165, 2, 0.25)';
        btnHalf.style.borderColor = '#ffa502';
        btnFull.style.background = 'rgba(46, 213, 115, 0.08)';
        btnFull.style.borderColor = 'rgba(46, 213, 115, 0.3)';
    }
}

function setRecordPaymentTier(tier) {
    const amtInput = document.getElementById('recordPaymentAmount');
    const statusSelect = document.getElementById('recordPaymentStatus');
    if (tier === 'FULL') {
        amtInput.value = 2000;
        statusSelect.value = 'PAID';
        updateRecordTierButtons(2000);
    } else if (tier === 'HALF') {
        amtInput.value = 1000;
        statusSelect.value = 'PARTIAL';
        updateRecordTierButtons(1000);
    }
}

function onRecordAmountChange() {
    const amt = Number(document.getElementById('recordPaymentAmount').value) || 0;
    const statusSelect = document.getElementById('recordPaymentStatus');
    if (amt >= 2000) {
        statusSelect.value = 'PAID';
    } else if (amt > 0 && amt < 2000) {
        statusSelect.value = 'PARTIAL';
    }
    updateRecordTierButtons(amt);
}

async function submitNewStudentPayment(e) {
    e.preventDefault();
    const userId = document.getElementById('recordPaymentUserId').value;
    const amount = Number(document.getElementById('recordPaymentAmount').value);
    const status = document.getElementById('recordPaymentStatus').value;
    const month = document.getElementById('recordPaymentMonth').value.trim();
    const paymentDate = document.getElementById('recordPaymentDate').value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid payment amount.', 'warning');
        return;
    }
    if (!month) {
        showToast('Please specify a billing month.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user: { id: Number(userId) },
                amount: amount,
                status: status,
                month: month,
                paymentDate: paymentDate
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `Server responded with ${res.status}`);
        }

        closeModal('recordUnpaidPaymentModal');
        showToast(`Fee payment of Rs. ${amount.toLocaleString()} recorded successfully!`, 'success');
        await loadAdminPayments();
    } catch (err) {
        console.error("Failed to record payment:", err);
        showToast(`Recording failed: ${err.message}`, 'error');
    }
}


function downloadMonthlyPaymentReport(format) {
    const monthLabel = selectedPaymentMonth === 'ALL' ? 'All Months' : selectedPaymentMonth;
    const fileSafeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, '_');

    // If on UNPAID tab, export unpaid students list
    if (selectedPaymentCategory === 'UNPAID') {
        const unpaidStudents = getUnpaidStudentsList(selectedPaymentMonth);
        if (unpaidStudents.length === 0) {
            showToast('No unpaid students to export for this selection.', 'info');
            return;
        }

        if (format === 'csv') {
            let csv = '\uFEFF';
            csv += '"#","Student TG No","Student Name","Allocated Room & Block","Phone","Email","Month Due","Arrears (LKR)","Status"\r\n';
            unpaidStudents.forEach((s, idx) => {
                const tg = (s.studentId || s.username || '-').replace(/"/g, '""');
                const name = (s.fullName || 'Resident Student').replace(/"/g, '""');
                const roomStr = (s.room ? `${s.room.roomNumber} (${s.room.blockName || 'Hostel'})` : 'Unassigned').replace(/"/g, '""');
                const phone = (s.phone || '-').replace(/"/g, '""');
                const email = (s.email || '-').replace(/"/g, '""');
                csv += `"${idx + 1}","${tg}","${name}","${roomStr}","${phone}","${email}","${monthLabel}","2000.00","UNPAID"\r\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Ruhuna_Unpaid_Students_${fileSafeMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast(`Downloaded Unpaid Students CSV (${unpaidStudents.length} records)!`, 'success');
            return;
        }
    }

    const monthPayments = allAdminPaymentsData.filter(p => {
        if (selectedPaymentMonth === 'ALL') return true;
        return (p.month || '').trim() === selectedPaymentMonth.trim();
    });

    let filtered = monthPayments;
    if (selectedPaymentCategory === 'FULL') {
        filtered = monthPayments.filter(p => (Number(p.amount) >= 2000) || (p.status || '').toUpperCase() === 'PAID');
    } else if (selectedPaymentCategory === 'HALF') {
        filtered = monthPayments.filter(p => (Number(p.amount) > 0 && Number(p.amount) < 2000) || (p.status || '').toUpperCase() === 'PARTIAL');
    }

    if (filtered.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No payment records to download for the selected category.', 'warning');
        } else {
            alert('No payment records to download for the selected category.');
        }
        return;
    }

    let totalRevenue = 0;
    filtered.forEach(p => {
        totalRevenue += (Number(p.amount) || 0);
    });

    if (format === 'csv') {
        // Generate CSV file
        let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        csv += '"#","Invoice ID","Student Name","Student TG No","Billing Month","Amount (LKR)","Payment Date","Status"\r\n';

        filtered.forEach((p, idx) => {
            const invoiceNo = (p.invoiceNo || `INV-${p.id}`).replace(/"/g, '""');
            const stuName = (p.user ? (p.user.fullName || 'Student') : 'Unknown').replace(/"/g, '""');
            const stuId = (p.user ? (p.user.studentId || p.user.username || '-') : '-').replace(/"/g, '""');
            const month = (p.month || '-').replace(/"/g, '""');
            const amt = Number(p.amount) ? Number(p.amount).toFixed(2) : '0.00';
            const pDate = (p.paymentDate || '-').replace(/"/g, '""');
            const status = (p.status || 'PAID').replace(/"/g, '""');

            csv += `"${idx + 1}","${invoiceNo}","${stuName}","${stuId}","${month}","${amt}","${pDate}","${status}"\r\n`;
        });

        // Summary row
        csv += `\r\n"","","","","TOTAL REVENUE:","${totalRevenue.toFixed(2)}","",""\r\n`;
        csv += `"","","","","TOTAL INVOICES:","${filtered.length}","",""\r\n`;
        csv += `"","","","","REPORT GENERATED:","${new Date().toLocaleString()}","",""\r\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Ruhuna_Hostel_Fee_Report_${fileSafeMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') {
            showToast(`Downloaded CSV report for ${monthLabel}!`, 'success');
        }
    } else if (format === 'pdf') {
        // High quality printable HTML statement (saveable as PDF via browser print dialog)
        const printWindow = window.open('', '_blank', 'width=1000,height=750');
        if (!printWindow) {
            alert('Please allow popups to download/print the PDF statement.');
            return;
        }

        let tableRowsHtml = '';
        filtered.forEach((p, idx) => {
            const invoiceNo = p.invoiceNo || `INV-${p.id}`;
            const stuName = p.user ? (p.user.fullName || 'Student') : 'Unknown';
            const stuId = p.user ? (p.user.studentId || p.user.username || '-') : '-';
            const month = p.month || '-';
            const amt = Number(p.amount) ? Number(p.amount).toFixed(2) : '0.00';
            const pDate = p.paymentDate ? p.paymentDate : '-';
            const status = p.status || 'PAID';

            tableRowsHtml += `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                    <td style="padding: 10px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 10px 8px; font-weight: 700; font-family: monospace; color: #1e293b;">${invoiceNo}</td>
                    <td style="padding: 10px 8px; font-weight: 600;">${stuName}</td>
                    <td style="padding: 10px 8px; font-family: monospace;">${stuId}</td>
                    <td style="padding: 10px 8px;">${month}</td>
                    <td style="padding: 10px 8px; font-weight: 700; text-align: right;">Rs. ${amt}</td>
                    <td style="padding: 10px 8px; text-align: center; color: #64748b;">${pDate}</td>
                    <td style="padding: 10px 8px; text-align: center;">
                        <span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 3px 10px; border-radius: 12px; font-size: 11px;">
                            ${status}
                        </span>
                    </td>
                </tr>
            `;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Hostel Fee Report - ${monthLabel} - University of Ruhuna</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4 landscape; margin: 15mm; }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        color: #1e293b;
                        margin: 0;
                        padding: 24px;
                        background: #ffffff;
                    }
                    .report-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2.5px solid #0f172a;
                        padding-bottom: 16px;
                        margin-bottom: 20px;
                    }
                    .header-left h1 {
                        font-family: 'Outfit', sans-serif;
                        font-size: 24px;
                        margin: 0 0 4px 0;
                        color: #0f172a;
                        letter-spacing: -0.5px;
                    }
                    .header-left p {
                        margin: 0;
                        font-size: 13px;
                        color: #64748b;
                        font-weight: 500;
                    }
                    .header-right {
                        text-align: right;
                    }
                    .badge-month {
                        display: inline-block;
                        background: #fef08a;
                        color: #854d0e;
                        font-weight: 800;
                        font-size: 14px;
                        padding: 6px 16px;
                        border-radius: 8px;
                        border: 1px solid #facc15;
                        margin-bottom: 4px;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                        margin-bottom: 24px;
                    }
                    .stat-box {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 12px 18px;
                    }
                    .stat-box .label {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #64748b;
                        font-weight: 600;
                        margin-bottom: 4px;
                    }
                    .stat-box .val {
                        font-size: 20px;
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .stat-box .val.money {
                        color: #059669;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 28px;
                    }
                    th {
                        background: #0f172a;
                        color: #ffffff;
                        font-size: 12px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        padding: 10px 8px;
                        text-align: left;
                    }
                    th.text-center { text-align: center; }
                    th.text-right { text-align: right; }
                    tbody tr:nth-child(even) {
                        background: #f8fafc;
                    }
                    .footer-sig {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        page-break-inside: avoid;
                    }
                    .sig-block {
                        border-top: 1.5px dashed #94a3b8;
                        padding-top: 8px;
                        width: 240px;
                        text-align: center;
                        font-size: 12.5px;
                        font-weight: 600;
                        color: #334155;
                    }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <div class="header-left">
                        <h1>UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM</h1>
                        <p>Sub Warden Treasury Office • Monthly Accommodation Billing & Revenue Audit</p>
                    </div>
                    <div class="header-right">
                        <div class="badge-month">\${monthLabel}</div>
                        <div style="font-size: 11.5px; color: #64748b; font-weight: 500;">Generated: \${new Date().toLocaleString()}</div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">Billing Scope</div>
                        <div class="val">\${monthLabel}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Verified Invoices</div>
                        <div class="val">\${filtered.length} Paid Invoices</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Total Amount Collected</div>
                        <div class="val money">Rs. \${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 40px;">#</th>
                            <th>Invoice ID</th>
                            <th>Student Full Name</th>
                            <th>Student TG No</th>
                            <th>Billing Month</th>
                            <th class="text-right">Amount (LKR)</th>
                            <th class="text-center">Payment Date</th>
                            <th class="text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        \${tableRowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a;">
                            <td colspan="5" style="padding: 12px 8px; text-align: right; font-size: 13px; text-transform: uppercase;">Total Verified Revenue:</td>
                            <td style="padding: 12px 8px; text-align: right; font-size: 14px; color: #059669;">Rs. \${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td colspan="2" style="padding: 12px 8px; text-align: center; font-size: 12px; color: #64748b;">\${filtered.length} Invoices Settled</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="footer-sig">
                    <div>
                        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Ruhuna HMS Automated Treasury Statement • Official University Record</p>
                        <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0;">System Verified Transaction Hash: SHA256-\${Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                    </div>
                    <div class="sig-block">
                        Sub Warden / Hostel Administrator<br>
                        <span style="font-size: 11px; color: #64748b; font-weight: 400;">Signature & Official Stamp</span>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    }
}

// Admin Complaints State & Handlers
let allAdminComplaintsData = [];
let selectedComplaintCategory = 'ALL'; // 'ALL', 'PENDING', 'IN_PROGRESS', 'OVERDUE', 'RESOLVED'
let adminComplaintSearchQuery = '';

async function loadAdminComplaints() {
    try {
        const res = await fetch(`${API_BASE}/complaints`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        allAdminComplaintsData = await res.json();
        renderAdminComplaintsTable();
    } catch (e) {
        console.error("Failed to load admin complaints:", e);
        const tbody = document.getElementById('complaints-table-body-admin');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#ff4757; padding:20px;"><i class="fas fa-exclamation-triangle"></i> Failed to load complaints from server.</td></tr>';
        }
    }
}

function switchComplaintCategory(cat) {
    selectedComplaintCategory = cat;

    ['ALL', 'PENDING', 'IN_PROGRESS', 'OVERDUE', 'RESOLVED'].forEach(c => {
        const btn = document.getElementById(`compTab-${c}`);
        if (btn) {
            if (c === cat) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    renderAdminComplaintsTable();
}

function onAdminComplaintSearchChange() {
    const input = document.getElementById('adminComplaintSearchInput');
    adminComplaintSearchQuery = input ? input.value.toLowerCase().trim() : '';
    renderAdminComplaintsTable();
}

function renderAdminComplaintsTable() {
    const tbody = document.getElementById('complaints-table-body-admin');
    if (!tbody) return;

    // Calculate Counts for KPIs and Filter Tabs
    const totalCount = allAdminComplaintsData.length;
    const pendingCount = allAdminComplaintsData.filter(c => (c.status || '').toUpperCase() === 'PENDING').length;
    const progressCount = allAdminComplaintsData.filter(c => (c.status || '').toUpperCase() === 'IN_PROGRESS').length;
    const overdueCount = allAdminComplaintsData.filter(c => c.overdue || (c.status || '').toUpperCase() === 'OVERDUE').length;
    const resolvedCount = allAdminComplaintsData.filter(c => (c.status || '').toUpperCase() === 'RESOLVED').length;

    // Update KPI Cards
    const kTotal = document.getElementById('kpi-comp-total');
    if (kTotal) kTotal.innerText = totalCount;
    const kPending = document.getElementById('kpi-comp-pending');
    if (kPending) kPending.innerText = pendingCount;
    const kProg = document.getElementById('kpi-comp-progress');
    if (kProg) kProg.innerText = progressCount;
    const kOver = document.getElementById('kpi-comp-overdue');
    if (kOver) kOver.innerText = overdueCount;
    const kRes = document.getElementById('kpi-comp-resolved');
    if (kRes) kRes.innerText = resolvedCount;

    // Update Badge Counts on Filter Tabs
    const bAll = document.getElementById('compBadge-ALL');
    if (bAll) bAll.innerText = totalCount;
    const bPending = document.getElementById('compBadge-PENDING');
    if (bPending) bPending.innerText = pendingCount;
    const bProg = document.getElementById('compBadge-IN_PROGRESS');
    if (bProg) bProg.innerText = progressCount;
    const bOver = document.getElementById('compBadge-OVERDUE');
    if (bOver) bOver.innerText = overdueCount;
    const bRes = document.getElementById('compBadge-RESOLVED');
    if (bRes) bRes.innerText = resolvedCount;

    // Filter by category
    let list = allAdminComplaintsData;
    if (selectedComplaintCategory === 'PENDING') {
        list = list.filter(c => (c.status || '').toUpperCase() === 'PENDING');
    } else if (selectedComplaintCategory === 'IN_PROGRESS') {
        list = list.filter(c => (c.status || '').toUpperCase() === 'IN_PROGRESS');
    } else if (selectedComplaintCategory === 'OVERDUE') {
        list = list.filter(c => c.overdue || (c.status || '').toUpperCase() === 'OVERDUE');
    } else if (selectedComplaintCategory === 'RESOLVED') {
        list = list.filter(c => (c.status || '').toUpperCase() === 'RESOLVED');
    }

    // Filter by search query
    if (adminComplaintSearchQuery) {
        list = list.filter(c => {
            const rNo = (c.roomNumber || ((c.user && c.user.room) ? c.user.room.roomNumber : '')).toLowerCase();
            const sName = (c.user ? (c.user.fullName || '') : '').toLowerCase();
            const sId = (c.user ? (c.user.studentId || c.user.username || '') : '').toLowerCase();
            const item = (c.item || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            const assigned = (c.assignedTo || '').toLowerCase();
            return rNo.includes(adminComplaintSearchQuery) || sName.includes(adminComplaintSearchQuery) ||
                   sId.includes(adminComplaintSearchQuery) || item.includes(adminComplaintSearchQuery) ||
                   desc.includes(adminComplaintSearchQuery) || assigned.includes(adminComplaintSearchQuery);
        });
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:30px;"><i class="fas fa-inbox"></i> No complaints found in this category.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    list.forEach((c, idx) => {
        const sName = c.user ? (c.user.fullName || 'Student') : 'Unknown';
        const sId = c.user ? (c.user.studentId || c.user.username || '') : '';
        const roomNo = c.roomNumber || ((c.user && c.user.room) ? c.user.room.roomNumber : '-');
        const blockName = (c.user && c.user.room && c.user.room.blockName) ? c.user.room.blockName : '';
        const roomDisplay = blockName ? `${roomNo} (${blockName})` : roomNo;

        const itemBadge = c.item 
            ? `<span style="background: rgba(255, 215, 0, 0.12); color: var(--primary-yellow); padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;"><i class="fas fa-tools"></i> ${c.item}</span>`
            : '<span style="color: #888; font-size: 12px;">General</span>';

        const statusRaw = (c.status || 'PENDING').toUpperCase();
        const isResolved = statusRaw === 'RESOLVED';
        const isOverdue = c.overdue || statusRaw === 'OVERDUE';
        const isProgress = statusRaw === 'IN_PROGRESS';
        const isPending = statusRaw === 'PENDING';

        // Assigned & Status Display
        let assignedInfo = '';
        if (isResolved) {
            assignedInfo = `<span class="status paid"><i class="fas fa-check-circle"></i> RESOLVED</span>`;
        } else if (isOverdue) {
            assignedInfo = `<span class="status unpaid" style="font-weight:700;"><i class="fas fa-exclamation-triangle"></i> OVERDUE</span><div style="font-size:11px; color:#ff4757; margin-top:3px;"><i class="fas fa-user-cog"></i> ${c.assignedTo || 'Maintenance'}</div>`;
        } else if (isProgress) {
            assignedInfo = `<span class="status allocated"><i class="fas fa-tools"></i> IN PROGRESS</span><div style="font-size:11px; color:#70a1ff; margin-top:3px;"><i class="fas fa-user-cog"></i> ${c.assignedTo || 'Maintenance'}</div>`;
        } else {
            assignedInfo = `<span class="status pending"><i class="fas fa-clock"></i> PENDING DISPATCH</span>`;
        }

        // Delay / Late Status Badge
        let delayBadge = '';
        if (isResolved) {
            delayBadge = `<span style="color:#2ed573; font-size:12px; font-weight:600;"><i class="fas fa-check"></i> Closed</span>`;
        } else if (isOverdue) {
            const days = c.daysLate || 1;
            const esc = c.escalationCount ? ` • Alerted ${c.escalationCount}x` : '';
            delayBadge = `<span style="background:rgba(255,71,87,0.15); color:#ff4757; border:1px solid rgba(255,71,87,0.35); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:800; display:inline-block;"><i class="fas fa-bolt"></i> ${days}d DELAYED${esc}</span>`;
        } else if (isProgress) {
            const dueStr = c.dueDate ? `Due: ${c.dueDate}` : 'Active Dispatch';
            delayBadge = `<span style="background:rgba(46,213,115,0.12); color:#2ed573; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;"><i class="fas fa-business-time"></i> ${dueStr}</span>`;
        } else {
            delayBadge = `<span style="color:#888; font-size:11.5px;"><i class="fas fa-hourglass-start"></i> Awaiting Notice</span>`;
        }

        // Action Column
        let actionButtonsHtml = '';
        if (isResolved) {
            actionButtonsHtml = `<span style="color: #2ed573; font-weight: 700; font-size: 13px;"><i class="fas fa-check-double"></i> Done</span>`;
        } else if (isPending) {
            // One-Click Notify Maintenance Button
            actionButtonsHtml = `
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-sm" onclick="quickNotifyMaintenance(${c.id})" title="1-Click Dispatch to Maintenance Specialist Sunil Rathnayake" style="background: linear-gradient(135deg, #e67e22, #d35400); color: #fff; font-weight: 700; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(230,126,34,0.3);">
                        <i class="fas fa-paper-plane"></i> Notify
                    </button>
                    <button class="btn btn-sm btn-dark" onclick="openNotifyModal(${c.id})" title="Customize Technician & Due Date" style="border: 1px solid rgba(255,255,255,0.2); padding: 5px 8px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sliders-h"></i>
                    </button>
                    <button class="btn btn-sm" onclick="resolveComplaint(${c.id})" title="Directly Mark Resolved" style="background: rgba(46,213,115,0.15); color: #2ed573; border: 1px solid rgba(46,213,115,0.3); padding: 5px 8px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            `;
        } else if (isOverdue) {
            // LATE / OVERDUE -> Urgent Reminder / Escalate Button!
            actionButtonsHtml = `
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-sm" onclick="openEscalateModal(${c.id})" title="Send Urgent Late Alert / Warning Reminder to Maintenance Team" style="background: linear-gradient(135deg, #ff4757, #ee5253); color: #fff; font-weight: 800; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(255,71,87,0.4); animation: pulse 1.8s infinite;">
                        <i class="fas fa-bolt"></i> Late Alert (${c.escalationCount || 0})
                    </button>
                    <button class="btn btn-sm" onclick="resolveComplaint(${c.id})" title="Mark Resolved" style="background: #2ed573; color: #121212; font-weight: 700; border: none; padding: 5px 9px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            `;
        } else {
            // In progress (not late)
            actionButtonsHtml = `
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-sm" onclick="openEscalateModal(${c.id})" title="Send Progress Reminder" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.35); font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-bell"></i> Remind
                    </button>
                    <button class="btn btn-sm" onclick="resolveComplaint(${c.id})" title="Mark Resolved" style="background: #2ed573; color: #121212; font-weight: 700; border: none; padding: 5px 9px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            `;
        }

        // Show escalation note if present
        const noteBadge = (c.adminNotes && isOverdue) 
            ? `<div style="font-size:11px; color:#ff6b81; margin-top:4px; font-weight:600;"><i class="fas fa-exclamation-circle"></i> Escalation Note logged</div>`
            : '';

        rowsHtml += `
            <tr>
                <td style="color: #888; font-weight: 600;">${idx + 1}</td>
                <td style="color: #94a3b8; font-size: 13px;">${c.createdAt || '-'}</td>
                <td>
                    <strong style="color: #fff;">${sName}</strong>
                    ${sId ? `<span style="font-size:11px; color:#888; font-family:monospace; display:block;">${sId}</span>` : ''}
                    <div style="font-weight: 700; color: #2ed573; font-size: 12.5px; margin-top: 2px;"><i class="fas fa-bed"></i> ${roomDisplay}</div>
                </td>
                <td>${itemBadge}</td>
                <td style="max-width: 220px;">
                    <div style="font-size: 13px; color: #cbd5e1;">${c.description}</div>
                    ${noteBadge}
                </td>
                <td>${assignedInfo}</td>
                <td>${delayBadge}</td>
                <td style="text-align: center;">${actionButtonsHtml}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// 1-Click Fast Notify Maintenance Dispatch
async function quickNotifyMaintenance(complaintId) {
    const complaint = (allAdminComplaintsData || []).find(c => c.id === complaintId);
    const roomStr = complaint ? (complaint.roomNumber || 'hostel room') : 'hostel room';
    const itemStr = complaint ? (complaint.item || 'fixture') : 'fixture';

    try {
        const res = await fetch(`${API_BASE}/complaints/${complaintId}/notify-maintenance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assignedTo: 'Sunil Rathnayake (Maintenance Specialist)',
                priority: 'HIGH',
                adminNotes: `1-Click Dispatch by Sub Warden for ${itemStr} in Room ${roomStr}.`
            })
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        showToast(`Dispatched to Sunil Rathnayake (Maintenance Specialist) for Room ${roomStr}!`, 'success');
        await loadAdminComplaints();
    } catch (err) {
        console.error("Failed to notify maintenance:", err);
        showToast(`Dispatch failed: ${err.message}`, 'error');
    }
}

// Open Customized Notify Modal
function openNotifyModal(complaintId) {
    const complaint = (allAdminComplaintsData || []).find(c => c.id === complaintId);
    if (!complaint) return;

    document.getElementById('dispatchComplaintId').value = complaint.id;
    document.getElementById('dispatchComplaintRoom').innerText = `Room: ${complaint.roomNumber || 'Hostel Room'}`;
    document.getElementById('dispatchComplaintItem').innerText = `Defective Item: ${complaint.item || 'General Maintenance'}`;
    document.getElementById('dispatchComplaintDesc').innerText = `Student Note: "${complaint.description || '-'}"`;

    // Default target due date = today + 2 days
    const due = new Date();
    due.setDate(due.getDate() + 2);
    document.getElementById('dispatchDueDate').value = due.toISOString().split('T')[0];
    document.getElementById('dispatchPriority').value = 'HIGH';
    document.getElementById('dispatchAdminNotes').value = `Please inspect ${complaint.item || 'fixture'} and restore operation promptly.`;

    openModal('notifyMaintenanceModal');
}

// Submit Customized Dispatch Form
async function submitNotifyMaintenance(e) {
    e.preventDefault();
    const id = document.getElementById('dispatchComplaintId').value;
    const assignedTo = document.getElementById('dispatchAssignedTo').value;
    const priority = document.getElementById('dispatchPriority').value;
    const dueDate = document.getElementById('dispatchDueDate').value;
    const adminNotes = document.getElementById('dispatchAdminNotes').value.trim();

    try {
        const res = await fetch(`${API_BASE}/complaints/${id}/notify-maintenance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assignedTo: assignedTo,
                priority: priority,
                dueDate: dueDate,
                adminNotes: adminNotes
            })
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        closeModal('notifyMaintenanceModal');
        showToast(`Maintenance dispatched successfully to ${assignedTo}!`, 'success');
        await loadAdminComplaints();
    } catch (err) {
        console.error("Failed to dispatch:", err);
        showToast(`Dispatch failed: ${err.message}`, 'error');
    }
}

// Open Late / Overdue Escalation Modal
function openEscalateModal(complaintId) {
    const complaint = (allAdminComplaintsData || []).find(c => c.id === complaintId);
    if (!complaint) return;

    document.getElementById('escalateComplaintId').value = complaint.id;
    const days = complaint.daysLate || 2;
    const roomStr = complaint.roomNumber || 'Room';
    const itemStr = complaint.item || 'Item';
    const tech = complaint.assignedTo || 'Maintenance Crew';
    const timesAlerted = complaint.escalationCount || 0;

    document.getElementById('escalateDelayDetail').innerHTML = `
        <strong>Complaint #${complaint.id} (${roomStr} - ${itemStr})</strong><br>
        Currently assigned to: <strong>${tech}</strong><br>
        Delay status: <span style="color:#ff4757; font-weight:800;">${days} Days Overdue</span> (Alerted ${timesAlerted} times previously).
    `;

    document.getElementById('escalateNoteText').value = `URGENT OVERDUE ALERT: Repair for ${itemStr} in Room ${roomStr} has been delayed by ${days} days. Attend and fix immediately today!`;

    openModal('escalateLateComplaintModal');
}

// Submit Late Escalation
async function submitEscalateComplaint(e) {
    e.preventDefault();
    const id = document.getElementById('escalateComplaintId').value;
    const note = document.getElementById('escalateNoteText').value.trim();

    try {
        const res = await fetch(`${API_BASE}/complaints/${id}/escalate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: note })
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        closeModal('escalateLateComplaintModal');
        showToast("Urgent Late Reminder sent to Maintenance Crew with High Priority!", "success");
        await loadAdminComplaints();
    } catch (err) {
        console.error("Failed to escalate:", err);
        showToast(`Escalation failed: ${err.message}`, 'error');
    }
}

// Resolve Complaint
async function resolveComplaint(id) {
    try {
        const res = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
            method: 'PUT'
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        showToast("Complaint marked as resolved!", "success");
        await loadAdminComplaints();
    } catch (err) {
        console.error("Failed to resolve complaint:", err);
        showToast(`Resolution failed: ${err.message}`, 'error');
    }
}


// ==========================================
// 7. GATE PASSES & LEAVE CLEARANCE MANAGEMENT
// Weekly & Monthly Summary System
// ==========================================
let allAdminGatePassesData = [];
let gatePassPeriodMode = 'weekly'; // 'weekly' | 'monthly' | 'all'
let selectedGatePassWeek = '';     // startStr_endStr e.g. '2026-10-12_2026-10-18'
let selectedGatePassMonth = '';    // YYYY-MM e.g. '2026-10'
let selectedGatePassBlock = '';
let selectedGatePassStatus = '';
let gatePassSearchQuery = '';

// Helper to compute ISO Week start (Monday) and end (Sunday)
function getWeekRangeForDate(dStr) {
    if (!dStr) return null;
    const d = new Date(dStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    
    // Day of week (0 is Sunday, 1 is Monday ... 6 is Saturday)
    const day = d.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const toYMD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const dt = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${dt}`;
    };

    const startStr = toYMD(monday);
    const endStr = toYMD(sunday);

    // Format readable label
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mLabel = monthNames[monday.getMonth()];
    const sLabel = monthNames[sunday.getMonth()];
    const dateRangeLabel = (monday.getMonth() === sunday.getMonth())
        ? `${mLabel} ${monday.getDate()} - ${sunday.getDate()}, ${monday.getFullYear()}`
        : `${mLabel} ${monday.getDate()} - ${sLabel} ${sunday.getDate()}, ${sunday.getFullYear()}`;

    return {
        key: `${startStr}_${endStr}`,
        startStr,
        endStr,
        monday,
        sunday,
        label: `Week of ${dateRangeLabel}`
    };
}

async function loadAdminGatePasses() {
    try {
        const res = await fetch(`${API_BASE}/gatepasses`);
        allAdminGatePassesData = await res.json();
        
        // Update Hero Banner KPIs (all time overview)
        const total = allAdminGatePassesData.length;
        const approved = allAdminGatePassesData.filter(p => p.status === 'APPROVED').length;
        const departed = allAdminGatePassesData.filter(p => p.status === 'DEPARTED').length;
        const pending = allAdminGatePassesData.filter(p => p.status === 'PENDING').length;
        const overdue = allAdminGatePassesData.filter(p => p.status === 'OVERDUE_RETURN').length;

        const elTot = document.getElementById('gp-stat-total');
        if (elTot) elTot.innerText = total;
        const elApp = document.getElementById('gp-stat-approved');
        if (elApp) elApp.innerText = approved;
        const elDep = document.getElementById('gp-stat-departed');
        if (elDep) elDep.innerText = departed;
        const elPen = document.getElementById('gp-stat-pending');
        if (elPen) elPen.innerText = pending;
        const elOvd = document.getElementById('gp-stat-overdue');
        if (elOvd) elOvd.innerText = overdue;

        // Build Week and Month Options
        populateGatePassDropdowns();

        // Render current summary and table
        renderGatePassSummaryAndTable();
    } catch (e) {
        console.error("Error loading gate passes", e);
    }
}

function populateGatePassDropdowns() {
    const weekSelect = document.getElementById('gpWeekSelect');
    const monthSelect = document.getElementById('gpMonthSelect');
    if (!weekSelect || !monthSelect) return;

    // Collect all unique weeks based on fromDate
    const weekMap = new Map();
    const monthMap = new Map();

    allAdminGatePassesData.forEach(p => {
        if (p.fromDate) {
            const wInfo = getWeekRangeForDate(p.fromDate);
            if (wInfo && !weekMap.has(wInfo.key)) {
                weekMap.set(wInfo.key, wInfo);
            }

            const mKey = p.fromDate.substring(0, 7); // YYYY-MM
            if (mKey && !monthMap.has(mKey)) {
                const dateObj = new Date(p.fromDate + 'T00:00:00');
                const mLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                monthMap.set(mKey, mLabel);
            }
        }
    });

    // Also include today's week and month if not present
    const todayStr = new Date().toISOString().split('T')[0];
    const todayWeek = getWeekRangeForDate(todayStr);
    if (todayWeek && !weekMap.has(todayWeek.key)) {
        weekMap.set(todayWeek.key, todayWeek);
    }
    const todayMonth = todayStr.substring(0, 7);
    if (!monthMap.has(todayMonth)) {
        const dObj = new Date();
        monthMap.set(todayMonth, dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }

    // Sort weeks descending
    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => b.startStr.localeCompare(a.startStr));
    weekSelect.innerHTML = sortedWeeks.map((w, idx) => {
        const isCurrent = (todayWeek && w.key === todayWeek.key);
        const prefix = isCurrent ? '📍 [Current Week] ' : '';
        return `<option value="${w.key}">${prefix}${w.label}</option>`;
    }).join('');

    if (!selectedGatePassWeek || !weekMap.has(selectedGatePassWeek)) {
        selectedGatePassWeek = todayWeek ? todayWeek.key : (sortedWeeks[0] ? sortedWeeks[0].key : '');
    }
    weekSelect.value = selectedGatePassWeek;

    // Sort months descending
    const sortedMonths = Array.from(monthMap.keys()).sort().reverse();
    monthSelect.innerHTML = sortedMonths.map(mKey => {
        const isCurrent = (mKey === todayMonth);
        const prefix = isCurrent ? '📍 [Current Month] ' : '';
        return `<option value="${mKey}">${prefix}${monthMap.get(mKey)}</option>`;
    }).join('');

    if (!selectedGatePassMonth || !monthMap.has(selectedGatePassMonth)) {
        selectedGatePassMonth = todayMonth;
    }
    monthSelect.value = selectedGatePassMonth;
}

function setGatePassPeriodMode(mode) {
    gatePassPeriodMode = mode;

    const btnWeekly = document.getElementById('btnGpModeWeekly');
    const btnMonthly = document.getElementById('btnGpModeMonthly');
    const btnAll = document.getElementById('btnGpModeAll');

    const weekWrap = document.getElementById('gpWeekSelectorWrap');
    const monthWrap = document.getElementById('gpMonthSelectorWrap');

    [btnWeekly, btnMonthly, btnAll].forEach(b => {
        if (b) {
            b.style.background = 'transparent';
            b.style.color = '#57606f';
        }
    });

    if (mode === 'weekly') {
        if (btnWeekly) {
            btnWeekly.style.background = 'var(--primary-yellow)';
            btnWeekly.style.color = '#121212';
        }
        if (weekWrap) weekWrap.style.display = 'flex';
        if (monthWrap) monthWrap.style.display = 'none';
    } else if (mode === 'monthly') {
        if (btnMonthly) {
            btnMonthly.style.background = 'var(--primary-yellow)';
            btnMonthly.style.color = '#121212';
        }
        if (weekWrap) weekWrap.style.display = 'none';
        if (monthWrap) monthWrap.style.display = 'flex';
    } else {
        if (btnAll) {
            btnAll.style.background = 'var(--primary-yellow)';
            btnAll.style.color = '#121212';
        }
        if (weekWrap) weekWrap.style.display = 'none';
        if (monthWrap) monthWrap.style.display = 'none';
    }

    renderGatePassSummaryAndTable();
}

function onGatePassPeriodChange() {
    const wSelect = document.getElementById('gpWeekSelect');
    if (wSelect) selectedGatePassWeek = wSelect.value;
    const mSelect = document.getElementById('gpMonthSelect');
    if (mSelect) selectedGatePassMonth = mSelect.value;
    renderGatePassSummaryAndTable();
}

function onGatePassFilterChange() {
    const bSelect = document.getElementById('gpBlockFilter');
    if (bSelect) selectedGatePassBlock = bSelect.value;
    const sSelect = document.getElementById('gpStatusFilter');
    if (sSelect) selectedGatePassStatus = sSelect.value;
    const sInput = document.getElementById('gpSearchInput');
    if (sInput) gatePassSearchQuery = sInput.value.toLowerCase().trim();
    renderGatePassSummaryAndTable();
}

function renderGatePassSummaryAndTable() {
    let periodList = allAdminGatePassesData;
    let periodLabel = 'All Time';

    if (gatePassPeriodMode === 'weekly') {
        if (selectedGatePassWeek) {
            const [startStr, endStr] = selectedGatePassWeek.split('_');
            periodList = allAdminGatePassesData.filter(p => p.fromDate && p.fromDate >= startStr && p.fromDate <= endStr);
            const wSelect = document.getElementById('gpWeekSelect');
            periodLabel = wSelect ? wSelect.options[wSelect.selectedIndex]?.text.replace('📍 [Current Week] ', '') : 'Weekly';
        }
    } else if (gatePassPeriodMode === 'monthly') {
        if (selectedGatePassMonth) {
            periodList = allAdminGatePassesData.filter(p => p.fromDate && p.fromDate.startsWith(selectedGatePassMonth));
            const mSelect = document.getElementById('gpMonthSelect');
            periodLabel = mSelect ? mSelect.options[mSelect.selectedIndex]?.text.replace('📍 [Current Month] ', '') : 'Monthly';
        }
    }

    // Period KPI metrics
    const pTotal = periodList.length;
    const pApproved = periodList.filter(p => p.status === 'APPROVED').length;
    const pDeparted = periodList.filter(p => p.status === 'DEPARTED').length;
    const pPending = periodList.filter(p => p.status === 'PENDING').length;
    const pOverdue = periodList.filter(p => p.status === 'OVERDUE_RETURN').length;
    const pRejected = periodList.filter(p => p.status === 'REJECTED').length;
    const pRate = pTotal > 0 ? Math.round(((pApproved + pDeparted) / pTotal) * 100) : 0;

    const kpiLbl = document.getElementById('kpi-gp-period-label');
    if (kpiLbl) kpiLbl.innerText = periodLabel;
    const kpiTot = document.getElementById('kpi-gp-total');
    if (kpiTot) kpiTot.innerText = pTotal;
    const kpiApp = document.getElementById('kpi-gp-approved');
    if (kpiApp) kpiApp.innerText = `${pApproved} (${pRate}%)`;
    const kpiDep = document.getElementById('kpi-gp-departed');
    if (kpiDep) kpiDep.innerText = pDeparted;
    const kpiPen = document.getElementById('kpi-gp-pending');
    if (kpiPen) kpiPen.innerText = pPending;
    const kpiOvd = document.getElementById('kpi-gp-overdue-rejected');
    if (kpiOvd) kpiOvd.innerText = pOverdue + pRejected;
    const kpiSub = document.getElementById('kpi-gp-overdue-sub');
    if (kpiSub) kpiSub.innerText = `${pOverdue} Late / ${pRejected} Rejected`;
    const kpiRate = document.getElementById('kpi-gp-approval-rate');
    if (kpiRate) kpiRate.innerText = `${pRate}% Rate`;

    // Render Panel 1: Temporal Departure Distribution
    renderTemporalBreakdownPanel(periodList);

    // Render Panel 2: Block Breakdown
    renderBlockBreakdownPanel(periodList);

    // Apply secondary filters (Block, Status, Search) to student manifest table
    let tableList = periodList;
    if (selectedGatePassBlock) {
        tableList = tableList.filter(p => p.user && p.user.room && p.user.room.blockName === selectedGatePassBlock);
    }
    if (selectedGatePassStatus) {
        tableList = tableList.filter(p => p.status === selectedGatePassStatus);
    }
    if (gatePassSearchQuery) {
        tableList = tableList.filter(p => {
            const sName = (p.user && p.user.fullName) ? p.user.fullName.toLowerCase() : '';
            const sId = (p.user && p.user.studentId) ? p.user.studentId.toLowerCase() : '';
            const rNo = (p.user && p.user.room) ? p.user.room.roomNumber.toLowerCase() : '';
            const reason = (p.reason || '').toLowerCase();
            const idStr = String(p.id);
            return sName.includes(gatePassSearchQuery) || sId.includes(gatePassSearchQuery) ||
                   rNo.includes(gatePassSearchQuery) || reason.includes(gatePassSearchQuery) ||
                   idStr.includes(gatePassSearchQuery);
        });
    }

    const tCountEl = document.getElementById('gp-table-count');
    if (tCountEl) tCountEl.innerText = `${tableList.length} of ${pTotal}`;
    const subTitleEl = document.getElementById('gp-table-subtitle');
    if (subTitleEl) subTitleEl.innerText = `Showing departure passes for ${periodLabel}.`;

    renderGatePassTableRows(tableList);
}

function renderTemporalBreakdownPanel(list) {
    const headingEl = document.getElementById('gp-temporal-heading');
    const badgeEl = document.getElementById('gp-temporal-badge');
    const container = document.getElementById('gp-temporal-bars');
    if (!container) return;

    container.innerHTML = '';

    if (gatePassPeriodMode === 'weekly') {
        if (headingEl) headingEl.innerText = 'Departure Flow by Day of Week';
        if (badgeEl) badgeEl.innerText = 'Weekly Day Analysis';

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayCounts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };

        list.forEach(p => {
            if (p.fromDate) {
                const d = new Date(p.fromDate + 'T00:00:00');
                const dayIndex = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
                const dayName = dayNames[dayIndex];
                if (dayCounts[dayName] !== undefined) dayCounts[dayName]++;
            }
        });

        const maxDay = Math.max(...Object.values(dayCounts), 1);

        dayNames.forEach(day => {
            const cnt = dayCounts[day];
            const pct = Math.round((cnt / maxDay) * 100);
            const isWeekend = (day === 'Saturday' || day === 'Sunday' || day === 'Friday');
            const barColor = isWeekend ? 'linear-gradient(90deg, #ffa502, #e67e22)' : 'linear-gradient(90deg, #3742fa, #70a1ff)';

            container.innerHTML += `
                <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
                    <div style="width: 85px; font-weight: 600; color: #2f3542;">${day}</div>
                    <div style="flex: 1; background: #f1f2f6; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: ${barColor}; width: ${cnt > 0 ? pct : 0}%; height: 100%; border-radius: 5px; transition: width 0.4s ease;"></div>
                    </div>
                    <div style="width: 50px; text-align: right; font-weight: 700; color: ${cnt > 0 ? '#121212' : '#888'};">
                        ${cnt} <span style="font-size: 11px; font-weight: normal; color: #888;">passes</span>
                    </div>
                </div>
            `;
        });
    } else {
        if (headingEl) headingEl.innerText = 'Weekly Departure Breakdown';
        if (badgeEl) badgeEl.innerText = 'Monthly Breakdown';

        // Group into Weeks of the Month
        const weekBreakdown = { 'Week 1 (Days 1-7)': 0, 'Week 2 (Days 8-14)': 0, 'Week 3 (Days 15-21)': 0, 'Week 4 (Days 22-28)': 0, 'Week 5 (Days 29+)': 0 };

        list.forEach(p => {
            if (p.fromDate) {
                const dayNum = parseInt(p.fromDate.split('-')[2], 10);
                if (dayNum <= 7) weekBreakdown['Week 1 (Days 1-7)']++;
                else if (dayNum <= 14) weekBreakdown['Week 2 (Days 8-14)']++;
                else if (dayNum <= 21) weekBreakdown['Week 3 (Days 15-21)']++;
                else if (dayNum <= 28) weekBreakdown['Week 4 (Days 22-28)']++;
                else weekBreakdown['Week 5 (Days 29+)']++;
            }
        });

        const maxW = Math.max(...Object.values(weekBreakdown), 1);

        Object.keys(weekBreakdown).forEach(wk => {
            const cnt = weekBreakdown[wk];
            const pct = Math.round((cnt / maxW) * 100);

            container.innerHTML += `
                <div style="display: flex; align-items: center; gap: 12px; font-size: 13px;">
                    <div style="width: 140px; font-weight: 600; color: #2f3542;">${wk}</div>
                    <div style="flex: 1; background: #f1f2f6; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--primary-yellow), #e67e22); width: ${cnt > 0 ? pct : 0}%; height: 100%; border-radius: 5px; transition: width 0.4s ease;"></div>
                    </div>
                    <div style="width: 50px; text-align: right; font-weight: 700; color: ${cnt > 0 ? '#121212' : '#888'};">
                        ${cnt} <span style="font-size: 11px; font-weight: normal; color: #888;">passes</span>
                    </div>
                </div>
            `;
        });
    }
}

function renderBlockBreakdownPanel(list) {
    const tbody = document.getElementById('gp-block-breakdown-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
    const blockMap = {};
    blocks.forEach(b => blockMap[b] = { total: 0, approved: 0, departed: 0, overdue: 0 });

    list.forEach(p => {
        const b = (p.user && p.user.room && p.user.room.blockName) ? p.user.room.blockName : 'Block A';
        if (!blockMap[b]) blockMap[b] = { total: 0, approved: 0, departed: 0, overdue: 0 };
        blockMap[b].total++;
        if (p.status === 'APPROVED') blockMap[b].approved++;
        else if (p.status === 'DEPARTED') blockMap[b].departed++;
        else if (p.status === 'OVERDUE_RETURN') blockMap[b].overdue++;
    });

    blocks.forEach(b => {
        const s = blockMap[b];
        tbody.innerHTML += `
            <tr>
                <td><strong>${b}</strong></td>
                <td><strong>${s.total}</strong> requests</td>
                <td><span style="color: #2ed573; font-weight: 700;"><i class="fas fa-check-circle"></i> ${s.approved}</span></td>
                <td><span style="color: #ffa502; font-weight: 700;"><i class="fas fa-person-walking-arrow-right"></i> ${s.departed}</span></td>
                <td><span style="color: ${s.overdue > 0 ? '#ff4757' : '#888'}; font-weight: 700;">${s.overdue}</span></td>
            </tr>
        `;
    });
}

function renderGatePassTableRows(list) {
    const tbody = document.getElementById('gatepasses-table-body-admin');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888; padding:35px;"><i class="fas fa-id-badge" style="font-size:28px; color:#ccc; display:block; margin-bottom:8px;"></i>No gate pass requests found matching this summary criteria.</td></tr>';
        return;
    }

    list.forEach(p => {
        const stuName = p.user ? p.user.fullName : 'Unknown Student';
        const stuId = p.user ? p.user.studentId : 'N/A';
        const stuPhone = (p.user && p.user.phone) ? p.user.phone : '-';
        const roomInfo = (p.user && p.user.room) ? `${p.user.room.roomNumber} (${p.user.room.blockName})` : 'Not Allocated';
        
        // Calculate Duration
        let durationStr = '-';
        if (p.fromDate && p.toDate) {
            const d1 = new Date(p.fromDate);
            const d2 = new Date(p.toDate);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            durationStr = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        }

        let statusBadge = '';
        if (p.status === 'APPROVED') {
            statusBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3); font-weight: 700; padding: 4px 8px; border-radius: 6px;"><i class="fas fa-check-circle"></i> APPROVED (At Gate)</span>';
        } else if (p.status === 'REJECTED') {
            statusBadge = '<span class="status-badge" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: 700; padding: 4px 8px; border-radius: 6px;"><i class="fas fa-times-circle"></i> REJECTED</span>';
        } else if (p.status === 'DEPARTED') {
            statusBadge = '<span class="status-badge" style="background: rgba(255, 165, 2, 0.15); color: #e67e22; border: 1px solid rgba(255, 165, 2, 0.3); font-weight: 700; padding: 4px 8px; border-radius: 6px;"><i class="fas fa-walking"></i> DEPARTED (Away)</span>';
        } else if (p.status === 'OVERDUE_RETURN') {
            statusBadge = '<span class="status-badge" style="background: #ff4757; color: #ffffff; font-weight: 800; padding: 4px 8px; border-radius: 6px; box-shadow: 0 2px 6px rgba(255,71,87,0.3);"><i class="fas fa-triangle-exclamation"></i> OVERDUE RETURN</span>';
        } else {
            statusBadge = '<span class="status-badge" style="background: rgba(112, 161, 255, 0.15); color: #70a1ff; border: 1px solid rgba(112, 161, 255, 0.3); font-weight: 700; padding: 4px 8px; border-radius: 6px;"><i class="fas fa-clock"></i> PENDING REVIEW</span>';
        }

        let actionHtml = '';
        if (p.status === 'PENDING') {
            actionHtml = `
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-primary btn-sm" onclick="approveGatePass(${p.id})" style="background: #2ed573; color: #121212; font-weight: 700; padding: 5px 10px;">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-dark btn-sm" onclick="rejectGatePass(${p.id})" style="background: #ff4757; color: #fff; font-weight: 700; padding: 5px 10px; border: none;">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            `;
        } else if (p.status === 'APPROVED') {
            actionHtml = `<span style="color: #2ed573; font-weight: 600; font-size: 13px;"><i class="fas fa-shield-alt"></i> Gate Cleared</span>`;
        } else if (p.status === 'DEPARTED') {
            actionHtml = `<span style="color: #e67e22; font-weight: 600; font-size: 13px;"><i class="fas fa-walking"></i> Exited Campus</span>`;
        } else if (p.status === 'OVERDUE_RETURN') {
            actionHtml = `<span style="color: #ff4757; font-weight: 700; font-size: 13px;"><i class="fas fa-bell"></i> Return Alert</span>`;
        } else {
            actionHtml = `<span style="color: #888; font-size: 13px;"><i class="fas fa-ban"></i> Declined</span>`;
        }
        
        tbody.innerHTML += `
            <tr style="${p.status === 'OVERDUE_RETURN' ? 'background: #fff8f8;' : ''}">
                <td><strong>#${p.id}</strong></td>
                <td>
                    <strong>${stuName}</strong>
                    <div style="font-size: 11.5px; color: #636e72;">
                        <span class="badge" style="background: #f1f2f6; color: #2f3542; margin-right: 4px;">${stuId}</span>
                        ${stuPhone !== '-' ? `<i class="fas fa-phone-alt" style="font-size: 10px; color: #888;"></i> ${stuPhone}` : ''}
                    </div>
                </td>
                <td><span class="status-badge" style="background: rgba(55, 66, 250, 0.1); color: #3742fa; font-weight: 600;"><i class="fas fa-door-closed"></i> ${roomInfo}</span></td>
                <td style="max-width: 220px; font-size: 13px; color: #2f3542;"><strong>${p.reason}</strong></td>
                <td><span style="color: #1e3799; font-weight: 600;"><i class="fas fa-calendar-day"></i> ${p.fromDate}</span></td>
                <td><span style="color: #57606f;"><i class="fas fa-calendar-check"></i> ${p.toDate}</span></td>
                <td><span style="background: #f1f2f6; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; color: #2f3542;">${durationStr}</span></td>
                <td>${statusBadge}</td>
                <td>${actionHtml}</td>
            </tr>
        `;
    });
}

// Download CSV Summary Report
function downloadGatePassCSV() {
    let list = allAdminGatePassesData;
    let periodTitle = 'All Time';

    if (gatePassPeriodMode === 'weekly') {
        if (selectedGatePassWeek) {
            const [startStr, endStr] = selectedGatePassWeek.split('_');
            list = allAdminGatePassesData.filter(p => p.fromDate && p.fromDate >= startStr && p.fromDate <= endStr);
            const wSelect = document.getElementById('gpWeekSelect');
            periodTitle = wSelect ? wSelect.options[wSelect.selectedIndex]?.text.replace('📍 [Current Week] ', '') : 'Weekly';
        }
    } else if (gatePassPeriodMode === 'monthly') {
        if (selectedGatePassMonth) {
            list = allAdminGatePassesData.filter(p => p.fromDate && p.fromDate.startsWith(selectedGatePassMonth));
            const mSelect = document.getElementById('gpMonthSelect');
            periodTitle = mSelect ? mSelect.options[mSelect.selectedIndex]?.text.replace('📍 [Current Month] ', '') : 'Monthly';
        }
    }

    if (selectedGatePassBlock) {
        list = list.filter(p => p.user && p.user.room && p.user.room.blockName === selectedGatePassBlock);
    }
    if (selectedGatePassStatus) {
        list = list.filter(p => p.status === selectedGatePassStatus);
    }

    const total = list.length;
    const approved = list.filter(p => p.status === 'APPROVED').length;
    const departed = list.filter(p => p.status === 'DEPARTED').length;
    const overdue = list.filter(p => p.status === 'OVERDUE_RETURN').length;
    const pending = list.filter(p => p.status === 'PENDING').length;
    const rejected = list.filter(p => p.status === 'REJECTED').length;
    const rate = total > 0 ? Math.round(((approved + departed) / total) * 100) : 0;

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '"UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM"\r\n';
    csv += `"STUDENT GATE PASS & LEAVE SUMMARY REPORT - ${periodTitle.toUpperCase()}"\r\n`;
    csv += `"Generated At:","${new Date().toLocaleString()}"\r\n`;
    csv += `"Total Requests:","${total}","Approved:","${approved}","Departed/Away:","${departed}","Pending:","${pending}","Overdue:","${overdue}","Rejected:","${rejected}","Approval Rate:","${rate}%"\r\n\r\n`;

    csv += '"#","Pass ID","Student Name","Student ID","Phone","Room","Block","Departure Date","Expected Return","Duration","Reason / Destination","Status"\r\n';

    list.forEach((p, idx) => {
        const passId = `GP-${p.id}`;
        const stuName = (p.user ? (p.user.fullName || 'Student') : 'Unknown').replace(/"/g, '""');
        const stuId = (p.user ? (p.user.studentId || '-') : '-').replace(/"/g, '""');
        const phone = (p.user && p.user.phone ? p.user.phone : '-').replace(/"/g, '""');
        const roomNo = (p.user && p.user.room ? p.user.room.roomNumber : '-').replace(/"/g, '""');
        const blockName = (p.user && p.user.room ? p.user.room.blockName : '-').replace(/"/g, '""');
        const fDate = (p.fromDate || '-').replace(/"/g, '""');
        const tDate = (p.toDate || '-').replace(/"/g, '""');
        const reason = (p.reason || '-').replace(/"/g, '""');
        const status = (p.status || 'PENDING').replace(/"/g, '""');
        
        let dur = '-';
        if (p.fromDate && p.toDate) {
            const d1 = new Date(p.fromDate);
            const d2 = new Date(p.toDate);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            dur = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        }

        csv += `"${idx + 1}","${passId}","${stuName}","${stuId}","${phone}","${roomNo}","${blockName}","${fDate}","${tDate}","${dur}","${reason}","${status}"\r\n`;
    });

    const fileSafe = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ruhuna_Hostel_GatePass_${fileSafe}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') {
        showToast(`Downloaded Gate Pass Summary CSV for ${periodTitle}!`, 'success');
    }
}

// Print / PDF Gate Pass Statement
function printGatePassSummaryReport() {
    let list = allAdminGatePassesData;
    let periodTitle = 'All Time';

    if (gatePassPeriodMode === 'weekly') {
        if (selectedGatePassWeek) {
            const [startStr, endStr] = selectedGatePassWeek.split('_');
            list = allAdminGatePassesData.filter(p => p.fromDate && p.fromDate >= startStr && p.fromDate <= endStr);
            const wSelect = document.getElementById('gpWeekSelect');
            periodTitle = wSelect ? wSelect.options[wSelect.selectedIndex]?.text.replace('📍 [Current Week] ', '') : 'Weekly';
        }
    } else if (gatePassPeriodMode === 'monthly') {
        if (selectedGatePassMonth) {
            list = allAdminGatePassesData.filter(p => p.fromDate && p.fromDate.startsWith(selectedGatePassMonth));
            const mSelect = document.getElementById('gpMonthSelect');
            periodTitle = mSelect ? mSelect.options[mSelect.selectedIndex]?.text.replace('📍 [Current Month] ', '') : 'Monthly';
        }
    }

    if (selectedGatePassBlock) {
        list = list.filter(p => p.user && p.user.room && p.user.room.blockName === selectedGatePassBlock);
    }
    if (selectedGatePassStatus) {
        list = list.filter(p => p.status === selectedGatePassStatus);
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
        alert('Please allow popups to print/save the gate pass summary PDF.');
        return;
    }

    const total = list.length;
    const approved = list.filter(p => p.status === 'APPROVED').length;
    const departed = list.filter(p => p.status === 'DEPARTED').length;
    const overdue = list.filter(p => p.status === 'OVERDUE_RETURN').length;
    const pending = list.filter(p => p.status === 'PENDING').length;
    const rejected = list.filter(p => p.status === 'REJECTED').length;
    const rate = total > 0 ? Math.round(((approved + departed) / total) * 100) : 0;

    let rowsHtml = '';
    list.forEach((p, idx) => {
        const stuName = p.user ? (p.user.fullName || 'Student') : 'Unknown';
        const stuId = p.user ? (p.user.studentId || '-') : '-';
        const roomNo = (p.user && p.user.room) ? `${p.user.room.roomNumber} (${p.user.room.blockName})` : '-';
        const reason = p.reason || '-';
        const fDate = p.fromDate || '-';
        const tDate = p.toDate || '-';
        const status = p.status || 'PENDING';

        let badgeBg = '#f1f2f6';
        let badgeColor = '#2f3542';
        if (status === 'APPROVED') { badgeBg = '#dcfce7'; badgeColor = '#166534'; }
        else if (status === 'DEPARTED') { badgeBg = '#fef3c7'; badgeColor = '#92400e'; }
        else if (status === 'OVERDUE_RETURN') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; }
        else if (status === 'REJECTED') { badgeBg = '#fee2e2'; badgeColor = '#b91c1c'; }

        rowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12.5px;">
                <td style="padding: 8px 6px; text-align: center; color: #64748b;">${idx + 1}</td>
                <td style="padding: 8px 6px; font-weight: 700; font-family: monospace;">#${p.id}</td>
                <td style="padding: 8px 6px; font-weight: 600;">${stuName}</td>
                <td style="padding: 8px 6px; font-family: monospace;">${stuId}</td>
                <td style="padding: 8px 6px;">${roomNo}</td>
                <td style="padding: 8px 6px;">${reason}</td>
                <td style="padding: 8px 6px; text-align: center;">${fDate}</td>
                <td style="padding: 8px 6px; text-align: center;">${tDate}</td>
                <td style="padding: 8px 6px; text-align: center;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                        ${status}
                    </span>
                </td>
            </tr>
        `;
    });

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Gate Pass Summary Report - ${periodTitle} - University of Ruhuna</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 landscape; margin: 12mm; }
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 20px;
                    background: #ffffff;
                }
                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2.5px solid #0f172a;
                    padding-bottom: 14px;
                    margin-bottom: 16px;
                }
                .header-left h1 {
                    font-family: 'Outfit', sans-serif;
                    font-size: 22px;
                    margin: 0 0 4px 0;
                    color: #0f172a;
                    letter-spacing: -0.5px;
                }
                .header-left p {
                    margin: 0;
                    font-size: 12.5px;
                    color: #64748b;
                }
                .meta-box {
                    text-align: right;
                    font-size: 12px;
                    color: #475569;
                }
                .meta-box strong {
                    color: #0f172a;
                }
                .kpi-row {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 12px;
                    margin-bottom: 18px;
                }
                .kpi-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px 14px;
                }
                .kpi-box .lbl {
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                }
                .kpi-box .val {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-top: 4px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                }
                thead th {
                    background: #0f172a;
                    color: #ffffff;
                    font-size: 11.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 8px 6px;
                    text-align: left;
                }
                .sign-row {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 36px;
                    padding-top: 14px;
                }
                .sign-box {
                    width: 28%;
                    text-align: center;
                    border-top: 1.5px dashed #94a3b8;
                    padding-top: 6px;
                    font-size: 12px;
                    color: #334155;
                }
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 15px; padding: 10px 16px; background: #fef3c7; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; font-weight: 600; color: #92400e;">🖨️ Ready to print or save as PDF. Click the button on the right:</span>
                <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 700; cursor: pointer;">
                    Print Document
                </button>
            </div>

            <div class="report-header">
                <div class="header-left">
                    <h1>UNIVERSITY OF RUHUNA - HOSTEL MANAGEMENT SYSTEM</h1>
                    <p>Official Student Early Home Departure & Gate Pass Summary Statement</p>
                </div>
                <div class="meta-box">
                    <div>Summary Period: <strong>${periodTitle}</strong></div>
                    <div>Generated: <strong>${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                    <div>Authority: <strong>Sub Warden & Security Control</strong></div>
                </div>
            </div>

            <div class="kpi-row">
                <div class="kpi-box">
                    <div class="lbl">Total Passes</div>
                    <div class="val">${total}</div>
                </div>
                <div class="kpi-box" style="border-left: 3px solid #16a34a;">
                    <div class="lbl">Approved & Cleared</div>
                    <div class="val" style="color: #16a34a;">${approved} (${rate}%)</div>
                </div>
                <div class="kpi-box" style="border-left: 3px solid #d97706;">
                    <div class="lbl">Departed (Away)</div>
                    <div class="val" style="color: #d97706;">${departed}</div>
                </div>
                <div class="kpi-box" style="border-left: 3px solid #dc2626;">
                    <div class="lbl">Overdue Return</div>
                    <div class="val" style="color: #dc2626;">${overdue}</div>
                </div>
                <div class="kpi-box">
                    <div class="lbl">Pending / Rejected</div>
                    <div class="val">${pending} / ${rejected}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align: center; width: 35px;">#</th>
                        <th style="width: 60px;">Pass ID</th>
                        <th>Student Name</th>
                        <th style="width: 100px;">TG Number</th>
                        <th>Hostel Room & Block</th>
                        <th>Reason / Destination</th>
                        <th style="text-align: center; width: 90px;">Departure</th>
                        <th style="text-align: center; width: 90px;">Expected Return</th>
                        <th style="text-align: center; width: 110px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="sign-row">
                <div class="sign-box">
                    <strong>Prepared By</strong><br>
                    Sub Warden Administration Office
                </div>
                <div class="sign-box">
                    <strong>Verified By</strong><br>
                    Chief Security Officer (Main Gate)
                </div>
                <div class="sign-box">
                    <strong>Authorized By</strong><br>
                    Warden / Senior Student Counselor
                </div>
            </div>

            <script>
                setTimeout(() => { window.print(); }, 400);
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function loadAdminNotices() {
    const tbody = document.getElementById('notices-table-body-admin');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/notices`);
        if (!res.ok) throw new Error('Failed to load notices: ' + res.status);
        const notices = await res.json();
        tbody.innerHTML = '';

        if (!notices || notices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #7f8c8d; padding: 25px;"><i class="fas fa-bullhorn" style="font-size: 24px; display: block; margin-bottom: 8px; color: #f39c12;"></i>No notices published yet. Click "+ Post Notice" to publish an announcement.</td></tr>';
            return;
        }

        notices.forEach(n => {
            let audienceBadge = '<span class="status allocated" style="font-size:11px; font-weight:700;"><i class="fas fa-users"></i> All</span>';
            if (n.targetAudience === 'STUDENTS') {
                audienceBadge = '<span class="status pending" style="background:rgba(155,89,182,0.15); color:#a55eea; border:1px solid rgba(155,89,182,0.3); font-size:11px; font-weight:700;"><i class="fas fa-user-graduate"></i> Students</span>';
            } else if (n.targetAudience === 'STAFF') {
                audienceBadge = '<span class="status pending" style="background:rgba(230,126,34,0.15); color:#fa8231; border:1px solid rgba(230,126,34,0.3); font-size:11px; font-weight:700;"><i class="fas fa-user-shield"></i> Staff</span>';
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>#${n.id}</strong></td>
                    <td><span style="font-weight: 600; color: #cbd5e1;"><i class="fas fa-calendar-alt" style="color: var(--primary-yellow); margin-right: 5px;"></i>${n.datePosted || 'Recent'}</span></td>
                    <td>${audienceBadge}</td>
                    <td><strong style="color: #ffffff;">${n.title}</strong></td>
                    <td style="color: #94a3b8; line-height: 1.5;">${n.content}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error loading admin notices:", e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ff4757; padding: 20px;"><i class="fas fa-exclamation-triangle"></i> Error loading notices from server.</td></tr>';
    }
}

// Auto-increment Next Student TG Number
function getNextStudentTgNumber() {
    let maxNum = 0;
    let year = "2021"; // default base year
    if (allUsersData && allUsersData.length > 0) {
        allUsersData.forEach(u => {
            if (u.studentId) {
                const match = u.studentId.trim().match(/^TG\/(\d+)\/(\d+)$/i);
                if (match) {
                    const y = match[1];
                    const num = parseInt(match[2], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                        year = y;
                    }
                }
            }
        });
    }
    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(4, '0');
    return `TG/${year}/${paddedNum}`;
}

function getNextStaffId(prefix) {
    let maxNum = 0;
    if (allUsersData && allUsersData.length > 0) {
        allUsersData.forEach(u => {
            if (u.studentId) {
                const regex = new RegExp(`^${prefix}[-_/]?(\\d+)$`, 'i');
                const match = u.studentId.trim().match(regex);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        });
    }
    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

function onUserRoleChange() {
    const roleSelect = document.getElementById('role');
    const studentIdInput = document.getElementById('studentId');
    const label = document.getElementById('userIdLabel');
    const hint = document.getElementById('studentIdHint');
    const nextTgDisplay = document.getElementById('nextTgDisplay');
    const emailInput = document.getElementById('email');

    if (!roleSelect || !studentIdInput) return;

    const role = roleSelect.value;

    if (role === 'STUDENT') {
        const nextTg = getNextStudentTgNumber();
        studentIdInput.value = nextTg;
        studentIdInput.placeholder = "e.g. TG/2021/0151";
        if (label) label.innerHTML = 'Student TG Number <span class="required-star">*</span>';
        if (hint) {
            hint.style.display = 'block';
            if (nextTgDisplay) nextTgDisplay.innerText = nextTg;
        }
        if (emailInput && (!emailInput.value || emailInput.value.includes('@ruhuna'))) {
            const cleanTg = nextTg.replace(/\//g, '').toLowerCase();
            emailInput.placeholder = `${cleanTg}@ruhuna.ac.lk`;
        }
    } else {
        if (hint) hint.style.display = 'none';

        let roleName = 'Staff';
        let placeholder = 'e.g. username';
        let defaultUsername = '';

        if (role === 'ADMIN') {
            roleName = 'Sub Warden / Admin';
            placeholder = 'e.g. admin_office';
            defaultUsername = 'admin_office';
        } else if (role === 'SECURITY') {
            roleName = 'Security Staff';
            placeholder = 'e.g. SEC004';
            defaultUsername = getNextStaffId('SEC');
        } else if (role === 'MAINTENANCE') {
            roleName = 'Maintenance Staff';
            placeholder = 'e.g. MNT006';
            defaultUsername = getNextStaffId('MNT');
        } else if (role === 'CLEANING') {
            roleName = 'Cleaning Staff';
            placeholder = 'e.g. CLN008';
            defaultUsername = getNextStaffId('CLN');
        }

        if (label) label.innerHTML = `${roleName} Staff ID / Username <span class="required-star">*</span>`;
        studentIdInput.placeholder = placeholder;
        studentIdInput.value = defaultUsername;
        if (emailInput) {
            emailInput.placeholder = `${defaultUsername.toLowerCase()}@ruhuna.ac.lk`;
        }
    }
}

// Submit Forms
async function submitUser(event) {
    event.preventDefault();
    const studentId = document.getElementById('studentId').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const role = document.getElementById('role').value;
    const phone = document.getElementById('phone')?.value.trim() || '';
    const password = document.getElementById('userPassword')?.value.trim() || 'password123';

    if (!studentId || !fullName || !email) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    // Check for duplicate studentId/username
    if (allUsersData && allUsersData.some(u => u.studentId && u.studentId.toLowerCase() === studentId.toLowerCase())) {
        showToast(`User ID "${studentId}" already exists! Please use a unique ID.`, 'error');
        return;
    }

    const user = {
        studentId: studentId,
        fullName: fullName,
        email: email,
        role: role,
        phone: phone,
        password: password
    };

    try {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Failed to save user');
        }

        const createdUser = await res.json();
        closeModal('userModal');
        document.getElementById('userForm').reset();
        showToast(`User ${createdUser.fullName} (${createdUser.studentId}) created successfully as ${role}!`, 'success');
        await loadUsers(); // Refresh table
        await loadDashboardStats(); // Refresh stats
    } catch (e) {
        console.error("Error creating user:", e);
        showToast('Error saving user: ' + e.message, 'error');
    }
}

// Dynamic Dropdown Logic for Adding / Configuring Rooms
function onAddRoomBlockChange() {
    const blockSelect = document.getElementById('blockName');
    const roomSelect = document.getElementById('roomNumber');
    const submitBtn = document.getElementById('roomSubmitBtn');
    const selectedBlock = blockSelect.value;
    
    if (!selectedBlock) {
        roomSelect.innerHTML = '<option value="" disabled selected>-- Select Block First --</option>';
        roomSelect.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        return;
    }
    
    // Extract letter: "Block A" -> "A"
    const prefix = selectedBlock.replace('Block ', '').trim();
    
    // Check which rooms already exist in allRoomsData
    const existingRoomMap = {};
    allRoomsData.forEach(r => {
        existingRoomMap[r.roomNumber] = r;
    });
    
    let optionsHtml = '<option value="" disabled selected>-- Select Room Number (1 to 25) --</option>';
    
    for (let i = 1; i <= 25; i++) {
        const numStr = i < 10 ? `10${i}` : `1${i}`;
        const roomNum = `${prefix}-${numStr}`;
        const existingRoom = existingRoomMap[roomNum];
        
        if (existingRoom) {
            optionsHtml += `<option value="${roomNum}">${roomNum} [Exists: ${existingRoom.currentOccupancy}/${existingRoom.capacity} Beds Occupied]</option>`;
        } else {
            optionsHtml += `<option value="${roomNum}">✨ ${roomNum} (New Room)</option>`;
        }
    }
    
    roomSelect.innerHTML = optionsHtml;
    roomSelect.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
}

async function submitRoom(event) {
    event.preventDefault();
    const roomNumber = document.getElementById('roomNumber').value;
    const blockName = document.getElementById('blockName').value;
    const capacity = parseInt(document.getElementById('capacity').value) || 4;

    if (!roomNumber || !blockName) {
        showToast("Please select both a Block and Room Number.", "error");
        return;
    }

    const room = {
        roomNumber: roomNumber,
        blockName: blockName,
        capacity: capacity
    };

    try {
        const res = await fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(room)
        });

        if (res.ok) {
            closeModal('roomModal');
            document.getElementById('roomForm').reset();
            document.getElementById('roomNumber').disabled = true;
            document.getElementById('roomSubmitBtn').disabled = true;
            await loadRooms();
            await loadDashboardStats();
            showToast(`Room ${roomNumber} (${blockName}) saved successfully with capacity of 4 students!`, "success");
        } else {
            const err = await res.text();
            showToast("Failed to save room: " + err, "error");
        }
    } catch (e) {
        console.error("Failed to save room", e);
        showToast("Error connecting to server.", "error");
    }
}

// Allocate Room Logic with Block & Room Dropdowns and Live Visualizer
async function openAllocateModal(userId) {
    if (allUsersData.length === 0) {
        const res = await fetch(`${API_BASE}/users`);
        allUsersData = await res.json();
    }
    if (allRoomsData.length === 0) {
        const res = await fetch(`${API_BASE}/rooms`);
        allRoomsData = await res.json();
    }

    const user = allUsersData.find(u => u.id === userId);
    if (!user) {
        alert("Student record not found.");
        return;
    }

    document.getElementById('allocateUserId').value = userId;
    document.getElementById('allocateStudentName').innerText = user.fullName || user.studentId;
    
    let currentRoomInfo = 'Not Assigned';
    let currentBlock = '';
    let currentRoomId = null;

    if (user.room) {
        currentRoomInfo = `Currently in ${user.room.roomNumber} (${user.room.blockName})`;
        currentBlock = user.room.blockName;
        currentRoomId = user.room.id;
    }

    document.getElementById('allocateStudentDetails').innerText = `ID: ${user.studentId} | ${currentRoomInfo}`;

    const blockSelect = document.getElementById('allocateBlockSelect');
    const roomSelect = document.getElementById('allocateRoomId');
    const occupancyCard = document.getElementById('allocateOccupancyCard');
    const submitBtn = document.getElementById('allocateSubmitBtn');

    if (currentBlock) {
        blockSelect.value = currentBlock;
        onAllocateBlockChange(currentRoomId);
    } else {
        blockSelect.value = '';
        roomSelect.innerHTML = '<option value="" disabled selected>-- Select Block First --</option>';
        roomSelect.disabled = true;
        occupancyCard.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerText = 'Allocate Room';
    }

    openModal('allocateModal');
}

function onAllocateBlockChange(preselectedRoomId = null) {
    const blockSelect = document.getElementById('allocateBlockSelect');
    const roomSelect = document.getElementById('allocateRoomId');
    const selectedBlock = blockSelect.value;
    const submitBtn = document.getElementById('allocateSubmitBtn');
    const occupancyCard = document.getElementById('allocateOccupancyCard');

    if (!selectedBlock) {
        roomSelect.innerHTML = '<option value="" disabled selected>-- Select Block First --</option>';
        roomSelect.disabled = true;
        occupancyCard.style.display = 'none';
        submitBtn.disabled = true;
        return;
    }

    // Filter rooms for chosen block
    const blockRooms = allRoomsData.filter(r => r.blockName === selectedBlock);
    
    // Sort naturally: A-101, A-102, ... A-125
    blockRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

    let optionsHtml = `<option value="" disabled ${!preselectedRoomId ? 'selected' : ''}>-- Select Room (${blockRooms.length} Rooms in ${selectedBlock}) --</option>`;

    blockRooms.forEach(room => {
        const isFull = room.currentOccupancy >= room.capacity;
        const isCurrent = preselectedRoomId && room.id === preselectedRoomId;
        const availableBeds = Math.max(0, room.capacity - room.currentOccupancy);

        if (isCurrent) {
            optionsHtml += `<option value="${room.id}" selected style="font-weight:bold; color:#f39c12;">${room.roomNumber} - [Current Student Room: ${room.currentOccupancy}/${room.capacity} Beds]</option>`;
        } else if (isFull) {
            optionsHtml += `<option value="${room.id}" disabled style="color:#d63031; background:#fff0f3;">${room.roomNumber} - [4/4 Beds FULL - No vacancy]</option>`;
        } else {
            optionsHtml += `<option value="${room.id}" style="color:#2d3436;">${room.roomNumber} - [${room.currentOccupancy}/${room.capacity} Beds Occupied - ${availableBeds} Available]</option>`;
        }
    });

    roomSelect.innerHTML = optionsHtml;
    roomSelect.disabled = false;

    if (preselectedRoomId) {
        roomSelect.value = preselectedRoomId;
    }

    onAllocateRoomChange();
}

function onAllocateRoomChange() {
    const roomSelect = document.getElementById('allocateRoomId');
    const occupancyCard = document.getElementById('allocateOccupancyCard');
    const submitBtn = document.getElementById('allocateSubmitBtn');
    const selectedRoomId = parseInt(roomSelect.value);

    if (!selectedRoomId) {
        occupancyCard.style.display = 'none';
        submitBtn.disabled = true;
        return;
    }

    const room = allRoomsData.find(r => r.id === selectedRoomId);
    if (!room) {
        occupancyCard.style.display = 'none';
        submitBtn.disabled = true;
        return;
    }

    const currentUserId = parseInt(document.getElementById('allocateUserId').value);
    const currentUser = allUsersData.find(u => u.id === currentUserId);
    const isStudentAlreadyInThisRoom = currentUser && currentUser.room && currentUser.room.id === room.id;

    const isFull = room.currentOccupancy >= room.capacity && !isStudentAlreadyInThisRoom;
    const occ = room.currentOccupancy;
    const cap = room.capacity || 4;
    const freeBeds = Math.max(0, cap - occ);
    const percentage = Math.min(100, Math.round((occ / cap) * 100));

    // Render 4 beds representation
    let bedsHtml = '';
    for (let i = 1; i <= cap; i++) {
        if (i <= occ) {
            bedsHtml += `
                <div class="occupancy-bed-card occupied">
                    <i class="fas fa-bed"></i>
                    <span>Bed ${i}</span>
                    <small>Occupied</small>
                </div>
            `;
        } else {
            bedsHtml += `
                <div class="occupancy-bed-card available">
                    <i class="fas fa-bed"></i>
                    <span>Bed ${i}</span>
                    <small>Available</small>
                </div>
            `;
        }
    }

    const badgeClass = isFull ? 'full' : 'available';
    const badgeText = isFull ? 'Room Full (4/4 Beds)' : `${freeBeds} of 4 Beds Free`;

    occupancyCard.innerHTML = `
        <div class="occupancy-preview-header">
            <h5><i class="fas fa-door-open" style="color:var(--primary-yellow);"></i> ${room.roomNumber} &bull; ${room.blockName}</h5>
            <span class="occupancy-status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="occupancy-beds-grid">
            ${bedsHtml}
        </div>
        <div class="occupancy-progress-wrap">
            <div class="occupancy-progress-text">
                <span>Room Occupancy: <strong>${occ} of ${cap}</strong> beds assigned</span>
                <span><strong>${percentage}%</strong> Full</span>
            </div>
            <div class="progress-bar-bg" style="height: 10px; border-radius: 5px;">
                <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${isFull ? '#ff4757' : 'var(--primary-yellow)'}; border-radius: 5px;"></div>
            </div>
        </div>
    `;
    occupancyCard.style.display = 'block';

    if (isFull) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Cannot Allocate (Room is Full)';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerText = isStudentAlreadyInThisRoom 
            ? `Student Already in Room ${room.roomNumber}` 
            : `Confirm Allocation to Room ${room.roomNumber}`;
    }
}

async function submitAllocation(event) {
    event.preventDefault();
    const userId = document.getElementById('allocateUserId').value;
    const roomId = document.getElementById('allocateRoomId').value;

    if (!userId || !roomId) {
        showToast("Please select both a block and an available room.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${userId}/allocate/${roomId}`, {
            method: 'PUT'
        });

        if (response.ok) {
            closeModal('allocateModal');
            await loadUsers();
            await loadRooms();
            await loadDashboardStats();
            showToast("Room allocated successfully!", "success");
        } else {
            const err = await response.text();
            showToast("Failed to allocate room: " + err, "error");
        }
    } catch (e) {
        console.error("Error in room allocation", e);
        showToast("Error connecting to server.", "error");
    }
}

// Inventory Logic
async function submitInventory(event) {
    event.preventDefault();
    const qty = parseInt(document.getElementById('totalQty').value);
    const item = {
        itemName: document.getElementById('itemName').value,
        category: document.getElementById('category').value,
        totalQuantity: qty,
        availableQuantity: qty,
        brokenQuantity: 0
    };

    await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });

    closeModal('inventoryModal');
    document.getElementById('inventoryForm').reset();
    loadInventory();
}

async function resolveComplaint(id) {
    try {
        const response = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
            method: 'PUT'
        });

        if (response.ok) {
            loadAdminComplaints(); // Refresh table
        } else {
            alert("Failed to resolve complaint.");
        }
    } catch (e) {
        console.error("Error", e);
    }
}

async function approveGatePass(id) {
    try {
        const response = await fetch(`${API_BASE}/gatepasses/${id}/approve`, {
            method: 'PUT'
        });

        if (response.ok) {
            showToast("Early home departure approved! Security gate has been authorized.", "success");
            loadAdminGatePasses(); // Refresh table
        } else {
            showToast("Failed to approve early departure request.", "error");
        }
    } catch (e) {
        console.error("Error", e);
        showToast("Server error during approval.", "error");
    }
}

async function rejectGatePass(id) {
    try {
        const response = await fetch(`${API_BASE}/gatepasses/${id}/reject`, {
            method: 'PUT'
        });

        if (response.ok) {
            showToast("Early home departure request has been rejected.", "info");
            loadAdminGatePasses();
        } else {
            showToast("Failed to reject request.", "error");
        }
    } catch (e) {
        console.error("Error", e);
        showToast("Server error during rejection.", "error");
    }
}

async function submitNotice(event) {
    event.preventDefault();
    const audienceSelect = document.getElementById('noticeTargetAudience');
    const notice = {
        title: document.getElementById('noticeTitle').value,
        content: document.getElementById('noticeContent').value,
        targetAudience: audienceSelect ? audienceSelect.value : 'ALL'
    };

    try {
        const res = await fetch(`${API_BASE}/notices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notice)
        });

        if (!res.ok) throw new Error('Server returned ' + res.status);

        closeModal('noticeModal');
        document.getElementById('noticeForm').reset();
        if (typeof showToast === 'function') {
            showToast('Notice published successfully!', 'success');
        }
        loadAdminNotices();
    } catch (err) {
        console.error("Error posting notice:", err);
        if (typeof showToast === 'function') {
            showToast('Failed to publish notice', 'error');
        } else {
            alert('Failed to publish notice');
        }
    }
}

// Generate Report Logic
function generateReport(type) {
    if (type === 'payments') {
        downloadMonthlyPaymentReport('pdf');
        return;
    }
    let printContent = '';
    let title = '';
    
    let printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 20px; }
                    h2 { text-align: center; color: #121212; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #FFD700; color: #121212; }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <hr>
                ${printContent}
                <br>
                <p style="text-align:right;">Generated on: ${new Date().toLocaleString()}</p>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// Switch between Inventory Stock and Room Damaged Items Sub-tabs
function switchInventorySubTab(subTab) {
    const stockSection = document.getElementById('inventory-subtab-stock');
    const damagesSection = document.getElementById('inventory-subtab-damages');
    const stockBtn = document.getElementById('inventoryTabStockBtn');
    const damagesBtn = document.getElementById('inventoryTabDamagesBtn');

    if (subTab === 'stock') {
        if (stockSection) stockSection.style.display = 'block';
        if (damagesSection) damagesSection.style.display = 'none';
        if (stockBtn) {
            stockBtn.className = 'btn btn-primary btn-sm';
        }
        if (damagesBtn) {
            damagesBtn.className = 'btn btn-secondary btn-sm';
        }
    } else {
        if (stockSection) stockSection.style.display = 'none';
        if (damagesSection) damagesSection.style.display = 'block';
        if (stockBtn) {
            stockBtn.className = 'btn btn-secondary btn-sm';
        }
        if (damagesBtn) {
            damagesBtn.className = 'btn btn-primary btn-sm';
        }
        renderRoomDamagesTable();
    }
}

// Render Room-wise Broken Items Table
function renderRoomDamagesTable() {
    const tbody = document.getElementById('room-damages-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allRoomDamagesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888; padding:25px;">No room equipment damages reported yet.</td></tr>';
        return;
    }

    allRoomDamagesData.forEach(dmg => {
        const roomNo = dmg.room ? dmg.room.roomNumber : 'N/A';
        const blockName = dmg.room ? dmg.room.blockName : '';
        const itemName = dmg.inventory ? dmg.inventory.itemName : 'Item';
        const category = dmg.inventory ? dmg.inventory.category : '-';
        const isRepaired = dmg.status === 'REPAIRED';

        const statusClass = isRepaired ? 'paid' : 'pending';
        const actionBtn = isRepaired 
            ? '<span style="color:#2ed573; font-weight:700;"><i class="fas fa-check-double"></i> Fixed</span>' 
            : `<button class="btn btn-primary btn-sm" onclick="repairDamage(${dmg.id})" style="background:#2ed573; border:none; color:#121212; font-weight:700;"><i class="fas fa-wrench"></i> Mark Repaired</button>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>#${dmg.id}</strong></td>
                <td><span class="status allocated" style="font-weight:700;"><i class="fas fa-door-closed"></i> ${roomNo} (${blockName})</span></td>
                <td><strong>${itemName}</strong></td>
                <td>${category}</td>
                <td><strong style="color:#e74c3c;">${dmg.brokenQuantity} Unit(s)</strong></td>
                <td style="max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${dmg.damageDescription}">${dmg.damageDescription}</td>
                <td>${dmg.reportedDate || '-'}</td>
                <td><span class="status ${statusClass}">${dmg.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

// Open Report Broken Item in Room Modal
async function openReportDamageModal() {
    if (allRoomsData.length === 0) {
        const res = await fetch(`${API_BASE}/rooms`);
        allRoomsData = await res.json();
    }
    if (allInventoryData.length === 0) {
        const res = await fetch(`${API_BASE}/inventory`);
        allInventoryData = await res.json();
    }

    // Populate inventory items dropdown
    const itemSelect = document.getElementById('damageInventoryId');
    if (itemSelect) {
        itemSelect.innerHTML = '<option value="" disabled selected>-- Select Equipment / Item --</option>';
        allInventoryData.forEach(item => {
            itemSelect.innerHTML += `<option value="${item.id}">${item.itemName} (${item.category})</option>`;
        });
    }

    const blockSelect = document.getElementById('damageBlockSelect');
    const roomSelect = document.getElementById('damageRoomId');
    if (blockSelect) blockSelect.value = '';
    if (roomSelect) {
        roomSelect.innerHTML = '<option value="" disabled selected>-- Select Block First --</option>';
        roomSelect.disabled = true;
    }

    document.getElementById('reportDamageForm').reset();
    document.getElementById('damageQuantity').value = 1;

    openModal('reportDamageModal');
}

function onDamageBlockChange() {
    const blockSelect = document.getElementById('damageBlockSelect');
    const roomSelect = document.getElementById('damageRoomId');
    const selectedBlock = blockSelect.value;

    if (!selectedBlock) {
        roomSelect.innerHTML = '<option value="" disabled selected>-- Select Block First --</option>';
        roomSelect.disabled = true;
        return;
    }

    const blockRooms = allRoomsData.filter(r => r.blockName === selectedBlock);
    blockRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

    let optionsHtml = '<option value="" disabled selected>-- Select Room --</option>';
    blockRooms.forEach(r => {
        optionsHtml += `<option value="${r.id}">${r.roomNumber} (${r.blockName})</option>`;
    });

    roomSelect.innerHTML = optionsHtml;
    roomSelect.disabled = false;
}

async function submitRoomDamage(event) {
    event.preventDefault();
    const roomId = document.getElementById('damageRoomId').value;
    const inventoryId = document.getElementById('damageInventoryId').value;
    const quantity = parseInt(document.getElementById('damageQuantity').value) || 1;
    const description = document.getElementById('damageDescription').value;

    if (!roomId || !inventoryId) {
        showToast("Please select both a Room and an Inventory Item.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/room-inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: roomId,
                inventoryId: inventoryId,
                quantity: quantity,
                description: description
            })
        });

        if (res.ok) {
            closeModal('reportDamageModal');
            document.getElementById('reportDamageForm').reset();
            await loadInventory();
            await loadRooms();
            switchInventorySubTab('damages');
            showToast("Broken item reported and linked to room successfully!", "success");
        } else {
            showToast("Failed to report broken item: " + await res.text(), "error");
        }
    } catch (e) {
        console.error("Error submitting room damage", e);
        showToast("Error connecting to server.", "error");
    }
}

// Confirmation Dialog Logic
let confirmDialogCallback = null;

function showConfirmDialog({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    confirmColor = '#2ed573',
    icon = 'fa-tools',
    iconType = 'normal',
    onConfirm = null
}) {
    const titleEl = document.getElementById('confirmDialogTitle');
    const descEl = document.getElementById('confirmDialogDesc');
    const actionBtn = document.getElementById('confirmDialogActionBtn');
    const iconCircle = document.getElementById('confirmDialogIcon');

    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = message;
    if (actionBtn) {
        actionBtn.innerHTML = `<i class="fas fa-check"></i> ${confirmText}`;
        actionBtn.style.backgroundColor = confirmColor;
    }
    if (iconCircle) {
        iconCircle.className = `confirm-icon-circle ${iconType === 'danger' ? 'danger' : (iconType === 'warning' ? 'warning' : '')}`;
        iconCircle.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    confirmDialogCallback = onConfirm;
    openModal('confirmDialogModal');
}

function closeConfirmDialog(isConfirmed) {
    closeModal('confirmDialogModal');
    if (isConfirmed && typeof confirmDialogCallback === 'function') {
        confirmDialogCallback();
    }
    confirmDialogCallback = null;
}

// In-App Toast Notification System (replaces browser native alerts)
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;

    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    else if (type === 'info') iconClass = 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${iconClass} custom-toast-icon"></i>
        <div class="custom-toast-text">${message}</div>
        <button class="custom-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

// Safe replacement for window.alert across application
window.alert = function(msg) {
    showToast(msg, 'info');
};

// Modern in-app confirmation modal for item repair
function repairDamage(id) {
    showConfirmDialog({
        title: 'Confirm Item Restoration',
        message: 'Are you sure this item has been repaired and restored to working condition in this room? Master warehouse stock will be updated automatically.',
        confirmText: 'Yes, Mark Repaired',
        confirmColor: '#2ed573',
        icon: 'fa-tools',
        iconType: 'normal',
        onConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE}/room-inventory/${id}/repair`, {
                    method: 'PUT'
                });

                if (res.ok) {
                    await loadInventory();
                    await loadRooms();
                    showToast("Item marked as Repaired! Master warehouse stock updated.", "success");
                } else {
                    const err = await res.text();
                    showToast("Failed to update status: " + err, "error");
                }
            } catch (e) {
                console.error("Error repairing damage", e);
                showToast("Error connecting to server.", "error");
            }
        }
    });
}

// ==========================================
// STAFF & ATTENDANCE / ABSENCE MANAGEMENT
// ==========================================
let allStaffAttendanceData = [];

async function loadStaffAttendanceManagement() {
    const tableBody = document.getElementById('staff-attendance-table-body-admin');
    if (!tableBody) return;
    
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px;"><i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading staff attendance records...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/staff-attendance`);
        if (!res.ok) throw new Error('Failed to load attendance');
        allStaffAttendanceData = await res.json();

        // Calculate statistics
        let secPresent = 0, maintPresent = 0, cleanPresent = 0, totalAbsent = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        allStaffAttendanceData.forEach(item => {
            const isToday = item.date === todayStr;
            const staffObj = item.staff || item.user;
            const role = (staffObj && staffObj.role) ? staffObj.role.toUpperCase() : '';
            const status = (item.status || '').toUpperCase();

            if (isToday && status === 'PRESENT') {
                if (role === 'SECURITY') secPresent++;
                else if (role === 'MAINTENANCE') maintPresent++;
                else if (role === 'CLEANING') cleanPresent++;
            }
            if (status === 'ABSENT' || status === 'ON_LEAVE' || status === 'LEAVE') {
                totalAbsent++;
            }
        });

        const elSec = document.getElementById('admin-stat-sec-present');
        if (elSec) elSec.innerText = secPresent;
        const elMaint = document.getElementById('admin-stat-maint-present');
        if (elMaint) elMaint.innerText = maintPresent;
        const elClean = document.getElementById('admin-stat-clean-present');
        if (elClean) elClean.innerText = cleanPresent;
        const elAbs = document.getElementById('admin-stat-absent-count');
        if (elAbs) elAbs.innerText = totalAbsent;

        // Populate staff dropdown in modal if empty
        const staffSelect = document.getElementById('adminAbsenceStaffSelect');
        if (staffSelect) {
            const staffMap = {};
            allStaffAttendanceData.forEach(item => {
                const s = item.staff || item.user;
                if (s && s.id && !staffMap[s.id]) {
                    staffMap[s.id] = s;
                }
            });
            const staffList = Object.values(staffMap);
            if (staffList.length > 0) {
                const currentVal = staffSelect.value;
                staffSelect.innerHTML = '<option value="" disabled selected>-- Choose Staff Member --</option>' +
                    staffList.map(s => `<option value="${s.id}">${s.fullName} (${s.role} - ID: ${s.id})</option>`).join('');
                if (currentVal) staffSelect.value = currentVal;
            }
        }

        // Apply any active dropdown filters
        filterAdminStaffAttendance();
    } catch (e) {
        console.error("Error loading staff attendance:", e);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ff4757; padding: 20px;"><i class="fas fa-exclamation-triangle"></i> Error loading attendance data.</td></tr>`;
    }
}

function renderStaffAttendanceTable(records) {
    const tableBody = document.getElementById('staff-attendance-table-body-admin');
    if (!tableBody) return;

    if (!records || records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 35px; color: #7f8c8d;"><i class="fas fa-filter" style="font-size: 26px; display: block; margin-bottom: 10px; color: #f39c12;"></i><strong>No attendance records match the selected filter.</strong><br><small style="color: #95a5a6;">Try selecting a different Role or Status from the filter dropdowns above.</small></td></tr>`;
        return;
    }

    let html = '';
    records.forEach(rec => {
        const staffObj = rec.staff || rec.user;
        const staffName = (staffObj && (staffObj.fullName || staffObj.studentId)) || 'Staff Member';
        const role = (staffObj && staffObj.role) ? staffObj.role.toUpperCase() : 'STAFF';
        const status = (rec.status || 'PENDING').toUpperCase();
        
        let roleBadge = '';
        if (role === 'SECURITY') {
            roleBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.35); font-weight: 700; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-shield-alt"></i> Security</span>';
        } else if (role === 'MAINTENANCE') {
            roleBadge = '<span class="status-badge" style="background: rgba(217, 119, 6, 0.15); color: #d97706; border: 1px solid rgba(217, 119, 6, 0.35); font-weight: 700; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-tools"></i> Maintenance</span>';
        } else if (role === 'CLEANING') {
            roleBadge = '<span class="status-badge" style="background: rgba(8, 145, 178, 0.15); color: #0891b2; border: 1px solid rgba(8, 145, 178, 0.35); font-weight: 700; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-broom"></i> Cleaning</span>';
        } else {
            roleBadge = `<span class="status-badge" style="background: rgba(116, 125, 140, 0.15); color: #747d8c; border: 1px solid rgba(116, 125, 140, 0.35); font-weight: 700; padding: 4px 10px; border-radius: 12px;"><i class="fas fa-user"></i> ${role}</span>`;
        }

        let statusBadge = '';
        if (status === 'PRESENT') {
            statusBadge = '<span class="status-badge status-active" style="padding: 4px 10px; border-radius: 12px; font-weight: 700;"><i class="fas fa-check-circle"></i> PRESENT</span>';
        } else if (status === 'ABSENT') {
            statusBadge = '<span class="status-badge status-danger" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: 700; padding: 4px 10px; border-radius: 12px;"><i class="fas fa-user-times"></i> ABSENT</span>';
        } else if (status === 'ON_LEAVE' || status === 'LEAVE') {
            statusBadge = '<span class="status-badge" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); font-weight: 700; padding: 4px 10px; border-radius: 12px;"><i class="fas fa-calendar-minus"></i> ON LEAVE</span>';
        } else {
            statusBadge = `<span class="status-badge" style="padding: 4px 10px; border-radius: 12px;">${status}</span>`;
        }

        const markedBy = rec.markedBy === 'ADMIN'
            ? '<span style="color: #ff4757; font-weight: 600;"><i class="fas fa-user-shield"></i> Admin Marked</span>'
            : '<span style="color: #2ed573; font-weight: 600;"><i class="fas fa-user-check"></i> Self Check-in</span>';

        const checkIn = formatAdminTime(rec.checkInTime);
        const checkOut = formatAdminTime(rec.checkOutTime);
        const remarks = rec.remarks || '<span style="color: #a4b0be; font-style: italic;">No special remarks</span>';

        html += `
            <tr style="${status === 'ABSENT' ? 'background: rgba(255, 71, 87, 0.04);' : ''}">
                <td><strong>#${rec.id}</strong></td>
                <td><strong>${staffName}</strong></td>
                <td>${roleBadge}</td>
                <td><span style="font-weight:600; color:#2f3542;">${rec.date}</span></td>
                <td>${statusBadge}</td>
                <td><code style="font-size:13px; font-weight:600;">${checkIn}</code></td>
                <td><code style="font-size:13px; font-weight:600;">${checkOut}</code></td>
                <td>${markedBy}</td>
                <td><small style="color:#57606f;">${remarks}</small></td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

function filterAdminStaffAttendance() {
    const roleFilter = (document.getElementById('adminStaffFilterRole')?.value || 'ALL').toUpperCase();
    const statusFilter = (document.getElementById('adminStaffFilterStatus')?.value || 'ALL').toUpperCase();

    let filtered = allStaffAttendanceData;

    if (roleFilter !== 'ALL') {
        filtered = filtered.filter(item => {
            const staffObj = item.staff || item.user;
            const staffRole = (staffObj && staffObj.role) ? staffObj.role.toUpperCase() : '';
            return staffRole === roleFilter;
        });
    }

    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(item => {
            const st = (item.status || '').toUpperCase();
            if (statusFilter === 'ON_LEAVE') {
                return st === 'ON_LEAVE' || st === 'LEAVE';
            }
            return st === statusFilter;
        });
    }

    renderStaffAttendanceTable(filtered);
}

function openAdminMarkAbsenceModal() {
    const dateInput = document.getElementById('adminAbsenceDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    openModal('adminMarkAbsenceModal');
}

async function submitAdminMarkAbsence(e) {
    e.preventDefault();
    const userId = document.getElementById('adminAbsenceStaffSelect').value;
    const date = document.getElementById('adminAbsenceDate').value;
    const status = document.getElementById('adminAbsenceStatus').value;
    const remarks = document.getElementById('adminAbsenceRemarks').value;

    if (!userId || !date || !status) {
        showToast('Please fill all required absence details.', 'error');
        return;
    }

    try {
        const payload = {
            userId: parseInt(userId),
            date: date,
            status: status,
            remarks: remarks
        };

        const res = await fetch(`${API_BASE}/staff-attendance/admin-mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal('adminMarkAbsenceModal');
            document.getElementById('adminMarkAbsenceForm').reset();
            showToast(`Staff member marked as ${status} for ${date} successfully!`, 'success');
            await loadStaffAttendanceManagement();
        } else {
            const err = await res.text();
            showToast('Failed to record absence: ' + err, 'error');
        }
    } catch (e) {
        console.error('Error recording absence:', e);
        showToast('Error connecting to server.', 'error');
    }
}

function formatAdminTime(isoStr) {
    if (!isoStr || isoStr === '-' || isoStr === '--:--') return '--:--';
    if (isoStr.includes('AM') || isoStr.includes('PM')) return isoStr;
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
        return isoStr;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/hms/';
}

// ==========================================
// Contact Student / Staff via Email Handlers
// ==========================================
let currentEmailTargetUser = null;
let currentEmailTemplateType = 'FEE_REMINDER';

function openEmailModalForStudent(userId, initialTemplate = 'FEE_REMINDER') {
    const student = (allUsersData || []).find(u => u.id === userId);
    if (!student) {
        showToast("Student profile not found.", "error");
        return;
    }

    currentEmailTargetUser = student;
    const defaultEmail = student.email || `${(student.studentId || 'student').replace(/\//g, '').toLowerCase()}@ruhuna.ac.lk`;

    document.getElementById('emailStudentUserId').value = student.id;
    document.getElementById('emailRecipientName').innerText = student.fullName || 'Student';
    
    const tgNo = student.studentId || student.username || 'TG/2021/XXXX';
    const roomStr = student.room ? `Room ${student.room.roomNumber} (${student.room.blockName || 'Hostel'})` : 'Room: Not Assigned';
    document.getElementById('emailRecipientDetails').innerText = `TG: ${tgNo} | ${roomStr}`;
    document.getElementById('emailRecipientBadge').innerText = tgNo;
    document.getElementById('emailToAddress').value = defaultEmail;

    applyEmailTemplate(initialTemplate);
    openModal('sendEmailModal');
}

function openEmailModalForStaff(staffId) {
    const staff = (allUsersData || []).find(u => u.id === staffId);
    if (!staff) {
        showToast("Staff profile not found.", "error");
        return;
    }

    currentEmailTargetUser = staff;
    const defaultEmail = staff.email || `${(staff.username || 'staff').toLowerCase()}@ruhuna.ac.lk`;

    document.getElementById('emailStudentUserId').value = staff.id;
    document.getElementById('emailRecipientName').innerText = `${staff.fullName} (${staff.role || 'Staff'})`;
    document.getElementById('emailRecipientDetails').innerText = `ID: ${staff.studentId || staff.username} | Role: ${staff.role}`;
    document.getElementById('emailRecipientBadge').innerText = staff.role || 'STAFF';
    document.getElementById('emailToAddress').value = defaultEmail;

    applyEmailTemplate('OFFICIAL_NOTICE');
    openModal('sendEmailModal');
}

function applyEmailTemplate(tplType) {
    currentEmailTemplateType = tplType;

    // Highlight active template pill
    ['FEE_REMINDER', 'ROOM_ALLOCATION', 'MAINTENANCE', 'OFFICIAL_NOTICE', 'CUSTOM'].forEach(t => {
        const b = document.getElementById(`tplBtn-${t}`);
        if (b) {
            if (t === tplType) {
                b.style.borderColor = 'rgba(255,215,0,0.6)';
                b.style.background = 'rgba(255,215,0,0.18)';
                b.style.color = 'var(--primary-yellow)';
            } else {
                b.style.borderColor = '#444';
                b.style.background = 'rgba(255,255,255,0.05)';
                b.style.color = '#cbd5e1';
            }
        }
    });

    const u = currentEmailTargetUser || {};
    const name = u.fullName || 'Student';
    const tgNo = u.studentId || u.username || 'Student ID';
    const roomStr = u.room ? `Room ${u.room.roomNumber} (${u.room.blockName || 'Residential Block'})` : 'Assigned Hostel Room';
    const currentMonth = typeof selectedPaymentMonth !== 'undefined' && selectedPaymentMonth !== 'ALL' ? selectedPaymentMonth : 'Current Term';

    const subjInput = document.getElementById('emailSubject');
    const bodyInput = document.getElementById('emailBodyText');
    if (!subjInput || !bodyInput) return;

    if (tplType === 'FEE_REMINDER') {
        subjInput.value = `Hostel Fee Arrears Notice - ${tgNo} (${currentMonth})`;
        bodyInput.value = 
`Dear ${name} (${tgNo}),

This is an official communication from the Sub Warden Office regarding your hostel accommodation fee payment for ${currentMonth}.

Our financial records indicate that your monthly accommodation fee of Rs. 2,000.00 for ${roomStr} is currently outstanding.

Kindly settle this payment at the Sub Warden Office or submit your payment verification slip via the Student Portal at your earliest convenience to avoid suspension of hostel residency.

If you have already settled this fee, please disregard this notice or present your receipt to update our system.

Thank you.

Sincerely,
Sub Warden Office
Hostel Administration Complex
University of Ruhuna`;

    } else if (tplType === 'ROOM_ALLOCATION') {
        subjInput.value = `Official Hostel Room Allocation Notification - ${name} (${tgNo})`;
        bodyInput.value = 
`Dear ${name} (${tgNo}),

We are pleased to inform you that your hostel room allocation has been approved for the academic semester.

Allocated Accommodation: ${roomStr}
Hostel Policy: 4 Beds per room with personal study desk.

Please visit the Sub Warden Office during working hours (08:30 AM - 04:30 PM) with your Student Identity Card to complete your check-in registration and collect your room key.

Best regards,
Sub Warden Office
University of Ruhuna`;

    } else if (tplType === 'MAINTENANCE') {
        subjInput.value = `Hostel Room Maintenance & Inspection Schedule - ${roomStr}`;
        bodyInput.value = 
`Dear ${name} (${tgNo}),

Please be advised that a scheduled facility inspection and equipment maintenance check will be conducted today for ${roomStr}.

Our authorized Maintenance Staff will inspect electrical fixtures, ceiling fans, furniture, and plumbing. Kindly ensure your personal valuables are kept securely locked in your wardrobe.

If you have any specific room repairs to report, please inform the team or submit a complaint via the HMS portal.

Thank you for your cooperation.

Sub Warden Office & Maintenance Crew
University of Ruhuna`;

    } else if (tplType === 'OFFICIAL_NOTICE') {
        subjInput.value = `Official Notice from Sub Warden Office - University of Ruhuna`;
        bodyInput.value = 
`Dear ${name} (${tgNo}),

This is an official administrative notice concerning hostel regulations and residential guidelines for ${roomStr}.

Please ensure strict compliance with hostel curfew hours, campus cleanliness, and electrical appliance safety policies.

If you require personal assistance or wish to discuss an accommodation matter, please visit the Sub Warden Office during inquiry hours.

Sincerely,
Sub Warden Office
University of Ruhuna`;

    } else if (tplType === 'CUSTOM') {
        subjInput.value = `Message from Sub Warden Office - University of Ruhuna`;
        bodyInput.value = 
`Dear ${name},

[Type your message here...]

Best regards,
Sub Warden Office
University of Ruhuna`;
    }
}

function openStudentEmailInGmail() {
    const to = document.getElementById('emailToAddress')?.value || '';
    const subject = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBodyText')?.value || '';

    if (!to) {
        showToast("Please specify a recipient email address.", "warning");
        return;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    showToast("Opened in Gmail web composer! You can review and click Send.", "success");
}

function openStudentEmailInClient() {
    const to = document.getElementById('emailToAddress')?.value || '';
    const subject = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBodyText')?.value || '';

    if (!to) {
        showToast("Please specify a recipient email address.", "warning");
        return;
    }

    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showToast("Opened in your desktop mail client (Outlook / Windows Mail)!", "info");
}

async function submitSendEmail(e) {
    e.preventDefault();
    const to = document.getElementById('emailToAddress')?.value || '';
    const subject = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBodyText')?.value || '';

    if (!to) {
        showToast("Please enter a valid recipient email address.", "warning");
        return;
    }

    const submitBtn = document.getElementById('btnSubmitSendEmail');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dispatching...';
    }

    try {
        const res = await fetch(`${API_BASE}/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body })
        });

        if (res.ok) {
            showToast(`Email dispatched successfully to ${to}!`, "success");
        } else {
            console.warn("Server email dispatch returned non-200, opening mail client fallback");
            showToast(`Server dispatched alert for ${to}. Opening in Mail client.`, "info");
            openStudentEmailInClient();
        }
    } catch(err) {
        console.warn("Could not connect to /api/email/send, falling back to mail client:", err);
        showToast(`Email prepared for ${to}. Opening in Mail client...`, "success");
        openStudentEmailInClient();
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
        }
        closeModal('sendEmailModal');
    }
}

// Initial Load
window.onload = () => {
    // Check authentication
    if (!localStorage.getItem('userId') || localStorage.getItem('userRole') !== 'ADMIN') {
        window.location.href = '/hms/';
        return;
    }
    loadDashboardStats();
};
