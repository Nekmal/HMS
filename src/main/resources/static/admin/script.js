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
        const blockSelect = document.getElementById('blockName');
        const roomSelect = document.getElementById('roomNumber');
        const submitBtn = document.getElementById('roomSubmitBtn');
        if (blockSelect) blockSelect.value = '';
        if (roomSelect) {
            roomSelect.innerHTML = '<option value="" disabled selected>-- Select Block First --</option>';
            roomSelect.disabled = true;
        }
        if (submitBtn) submitBtn.disabled = true;
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

async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE}/users`);
        allUsersData = await res.json();
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        allUsersData.forEach(user => {
            let roomBadge = user.room 
                ? `<span class="status allocated"><i class="fas fa-bed"></i> ${user.room.roomNumber} (${user.room.blockName})</span>` 
                : `<span class="status pending"><i class="fas fa-times-circle"></i> Not Assigned</span>`;
            
            let actionBtn = user.role === 'ADMIN' ? '-' : (
                user.room 
                    ? `<button class="btn btn-secondary btn-sm" onclick="openAllocateModal(${user.id})" title="Change Room Allocation"><i class="fas fa-exchange-alt"></i> Change Room</button>`
                    : `<button class="btn btn-primary btn-sm" onclick="openAllocateModal(${user.id})" title="Allocate Room to Student"><i class="fas fa-door-open"></i> Allocate Room</button>`
            );
            
            tbody.innerHTML += `
                <tr>
                    <td>${user.id}</td>
                    <td><strong>${user.studentId}</strong></td>
                    <td>${user.fullName}</td>
                    <td><span class="status allocated">${user.role}</span></td>
                    <td>${roomBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Failed to load users", e);
    }
}

async function loadRooms() {
    try {
        const [roomsRes, dmgRes] = await Promise.all([
            fetch(`${API_BASE}/rooms`),
            fetch(`${API_BASE}/room-inventory`)
        ]);
        allRoomsData = await roomsRes.json();
        allRoomDamagesData = await dmgRes.json();

        const tbody = document.getElementById('rooms-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        allRoomsData.forEach(room => {
            const isFull = room.currentOccupancy >= room.capacity;
            const statusBadge = isFull 
                ? `<span class="status pending" style="background:#ff4757; color:#fff; font-weight:700;">FULL (4/4)</span>` 
                : `<span class="status paid">${room.capacity - room.currentOccupancy} Beds Available</span>`;
            
            // Check if this room has broken equipment
            const activeDamages = allRoomDamagesData.filter(d => d.room && d.room.id === room.id && d.status !== 'REPAIRED');
            let damageBadge = '';
            if (activeDamages.length > 0) {
                const itemSummary = activeDamages.map(d => `${d.brokenQuantity}x ${d.inventory ? d.inventory.itemName : 'Item'}`).join(', ');
                damageBadge = `<div style="margin-top:4px;"><span class="status pending" style="background:#fff0f3; color:#d63031; border:1px solid #ff7675; font-size:11.5px; padding:3px 8px;" title="${itemSummary}"><i class="fas fa-tools"></i> <strong>${activeDamages.length} Damaged:</strong> ${itemSummary}</span></div>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${room.id}</td>
                    <td><strong>${room.roomNumber}</strong></td>
                    <td><span class="status allocated">${room.blockName}</span></td>
                    <td><strong>${room.currentOccupancy}</strong> / ${room.capacity} Students</td>
                    <td>
                        ${statusBadge}
                        ${damageBadge}
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Failed to load rooms", e);
    }
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

async function loadAdminPayments() {
    const res = await fetch(`${API_BASE}/payments`);
    const payments = await res.json();
    const tbody = document.getElementById('payments-table-body-admin');
    if (!tbody) return;
    tbody.innerHTML = '';
    payments.forEach(p => {
        let stuName = p.user ? p.user.fullName : 'Unknown';
        let amt = p.amount ? p.amount.toFixed(2) : '0.00';
        let pDate = p.paymentDate ? p.paymentDate : 'N/A';
        
        tbody.innerHTML += `
            <tr>
                <td>${p.invoiceNo}</td>
                <td>${stuName}</td>
                <td>${p.month}</td>
                <td>Rs. ${amt}</td>
                <td>${pDate}</td>
                <td><span class="status paid">${p.status}</span></td>
            </tr>
        `;
    });
}

async function loadAdminComplaints() {
    const res = await fetch(`${API_BASE}/complaints`);
    const complaints = await res.json();
    const tbody = document.getElementById('complaints-table-body-admin');
    if (!tbody) return;
    tbody.innerHTML = '';
    complaints.forEach(c => {
        let stuName = c.user ? c.user.fullName : 'Unknown';
        let roomNo = (c.user && c.user.room) ? c.user.room.roomNumber : '-';
        let statusClass = c.status === 'RESOLVED' ? 'paid' : 'pending';
        let actionBtn = c.status === 'RESOLVED' ? '-' : `<button class="btn btn-primary" onclick="resolveComplaint(${c.id})"><i class="fas fa-check"></i> Resolve</button>`;
        
        tbody.innerHTML += `
            <tr>
                <td>${c.id}</td>
                <td>${c.createdAt}</td>
                <td>${stuName}</td>
                <td>${roomNo}</td>
                <td>${c.description}</td>
                <td><span class="status ${statusClass}">${c.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

async function loadAdminGatePasses() {
    try {
        const res = await fetch(`${API_BASE}/gatepasses`);
        const passes = await res.json();
        const tbody = document.getElementById('gatepasses-table-body-admin');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (passes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888; padding:25px;">No student early departure or gate pass requests found.</td></tr>';
            return;
        }
        passes.forEach(p => {
            const stuName = p.user ? p.user.fullName : 'Unknown Student';
            const stuId = p.user ? p.user.studentId : 'N/A';
            const roomInfo = (p.user && p.user.room) ? `${p.user.room.roomNumber} (${p.user.room.blockName})` : 'Not Allocated';
            
            let statusBadge = '';
            if (p.status === 'APPROVED') {
                statusBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3); font-weight: 700;"><i class="fas fa-check-circle"></i> APPROVED (Sent to Security)</span>';
            } else if (p.status === 'REJECTED') {
                statusBadge = '<span class="status-badge" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: 700;"><i class="fas fa-times-circle"></i> REJECTED</span>';
            } else if (p.status === 'DEPARTED') {
                statusBadge = '<span class="status-badge" style="background: rgba(47, 53, 66, 0.15); color: #2f3542; border: 1px solid rgba(47, 53, 66, 0.3); font-weight: 700;"><i class="fas fa-walking"></i> DEPARTED (At Gate)</span>';
            } else {
                statusBadge = '<span class="status-badge" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); font-weight: 700;"><i class="fas fa-clock"></i> PENDING SUB WARDEN REVIEW</span>';
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
                actionHtml = `<span style="color: #2ed573; font-weight: 600; font-size: 13px;"><i class="fas fa-shield-alt"></i> Available for Security Clearance</span>`;
            } else if (p.status === 'DEPARTED') {
                actionHtml = `<span style="color: #57606f; font-weight: 600; font-size: 13px;"><i class="fas fa-check-double"></i> Verified at Gate</span>`;
            } else {
                actionHtml = `<span style="color: #ff4757; font-size: 13px;"><i class="fas fa-ban"></i> Request Declined</span>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td><strong>${stuName}</strong></td>
                    <td><span class="badge" style="background: #f1f2f6; color: #2f3542;">${stuId}</span></td>
                    <td><span class="status-badge" style="background: rgba(55, 66, 250, 0.1); color: #3742fa;"><i class="fas fa-door-closed"></i> ${roomInfo}</span></td>
                    <td><strong>${p.reason}</strong></td>
                    <td><span style="color: #1e3799; font-weight: 600;"><i class="fas fa-calendar-day"></i> ${p.fromDate}</span></td>
                    <td><span style="color: #57606f;"><i class="fas fa-calendar-check"></i> ${p.toDate}</span></td>
                    <td>${statusBadge}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
    } catch(e) {
        console.error("Error loading gate passes", e);
    }
}

async function loadAdminNotices() {
    const res = await fetch(`${API_BASE}/notices`);
    const notices = await res.json();
    const tbody = document.getElementById('notices-table-body-admin');
    if (!tbody) return;
    tbody.innerHTML = '';
    notices.forEach(n => {
        tbody.innerHTML += `
            <tr>
                <td>${n.id}</td>
                <td>${n.datePosted}</td>
                <td><strong>${n.title}</strong></td>
                <td>${n.content}</td>
            </tr>
        `;
    });
}

// Submit Forms
async function submitUser(event) {
    event.preventDefault();
    const user = {
        studentId: document.getElementById('studentId').value,
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
        password: 'defaultPassword123'
    };

    await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });

    closeModal('userModal');
    document.getElementById('userForm').reset();
    loadUsers(); // Refresh table
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
    const notice = {
        title: document.getElementById('noticeTitle').value,
        content: document.getElementById('noticeContent').value
    };

    await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notice)
    });

    closeModal('noticeModal');
    document.getElementById('noticeForm').reset();
    loadAdminNotices();
}

// Generate Report Logic
function generateReport(type) {
    let printContent = '';
    let title = '';
    if (type === 'payments') {
        printContent = document.getElementById('paymentsTableToPrint').outerHTML;
        title = "Payments Report - Ruhuna HMS";
    }
    
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
            const role = (item.user && item.user.role) || '';
            const status = item.status;

            if (isToday && status === 'PRESENT') {
                if (role === 'SECURITY') secPresent++;
                else if (role === 'MAINTENANCE') maintPresent++;
                else if (role === 'CLEANING') cleanPresent++;
            }
            if (status === 'ABSENT' || status === 'ON_LEAVE') {
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

        renderStaffAttendanceTable(allStaffAttendanceData);
    } catch (e) {
        console.error("Error loading staff attendance:", e);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ff4757; padding: 20px;"><i class="fas fa-exclamation-triangle"></i> Error loading attendance data.</td></tr>`;
    }
}

function renderStaffAttendanceTable(records) {
    const tableBody = document.getElementById('staff-attendance-table-body-admin');
    if (!tableBody) return;

    if (!records || records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #7f8c8d;"><i class="fas fa-calendar-times" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>No staff attendance records found.</td></tr>`;
        return;
    }

    let html = '';
    records.forEach(rec => {
        const staffName = (rec.user && rec.user.fullName) || 'Staff Member';
        const role = (rec.user && rec.user.role) || 'N/A';
        const status = rec.status || 'PENDING';
        
        let roleBadge = '';
        if (role === 'SECURITY') {
            roleBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3);"><i class="fas fa-shield-alt"></i> SECURITY</span>';
        } else if (role === 'MAINTENANCE') {
            roleBadge = '<span class="status-badge" style="background: rgba(55, 66, 250, 0.15); color: #3742fa; border: 1px solid rgba(55, 66, 250, 0.3);"><i class="fas fa-tools"></i> MAINTENANCE</span>';
        } else if (role === 'CLEANING') {
            roleBadge = '<span class="status-badge" style="background: rgba(0, 206, 201, 0.15); color: #00cec9; border: 1px solid rgba(0, 206, 201, 0.3);"><i class="fas fa-broom"></i> CLEANING</span>';
        } else {
            roleBadge = `<span class="status-badge">${role}</span>`;
        }

        let statusBadge = '';
        if (status === 'PRESENT') {
            statusBadge = '<span class="status-badge status-active"><i class="fas fa-check-circle"></i> PRESENT</span>';
        } else if (status === 'ABSENT') {
            statusBadge = '<span class="status-badge status-danger" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: 700;"><i class="fas fa-user-times"></i> ABSENT</span>';
        } else if (status === 'ON_LEAVE') {
            statusBadge = '<span class="status-badge" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); font-weight: 700;"><i class="fas fa-calendar-minus"></i> ON LEAVE</span>';
        } else {
            statusBadge = `<span class="status-badge">${status}</span>`;
        }

        const markedBy = rec.markedBy === 'ADMIN'
            ? '<span style="color: #ff4757; font-weight: 600;"><i class="fas fa-user-shield"></i> Admin Marked</span>'
            : '<span style="color: #2ed573; font-weight: 600;"><i class="fas fa-user-check"></i> Self Check-in</span>';

        const checkIn = rec.checkInTime ? formatAdminTime(rec.checkInTime) : '--:--';
        const checkOut = rec.checkOutTime ? formatAdminTime(rec.checkOutTime) : '--:--';
        const remarks = rec.remarks || '<span style="color: #a4b0be; font-style: italic;">No special remarks</span>';

        html += `
            <tr style="${status === 'ABSENT' ? 'background: rgba(255, 71, 87, 0.04);' : ''}">
                <td><strong>#${rec.id}</strong></td>
                <td><strong>${staffName}</strong></td>
                <td>${roleBadge}</td>
                <td>${rec.date}</td>
                <td>${statusBadge}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${markedBy}</td>
                <td><small>${remarks}</small></td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

function filterAdminStaffAttendance() {
    const roleFilter = document.getElementById('adminStaffFilterRole')?.value || 'ALL';
    const statusFilter = document.getElementById('adminStaffFilterStatus')?.value || 'ALL';

    let filtered = allStaffAttendanceData;

    if (roleFilter !== 'ALL') {
        filtered = filtered.filter(item => item.user && item.user.role === roleFilter);
    }

    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(item => item.status === statusFilter);
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
    if (!isoStr) return '--:--';
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

// Initial Load
window.onload = () => {
    // Check authentication
    if (!localStorage.getItem('userId') || localStorage.getItem('userRole') !== 'ADMIN') {
        window.location.href = '/hms/';
        return;
    }
    loadDashboardStats();
};
