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
        document.getElementById('page-title').innerText = 'Admin Dashboard';
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
    }
}

// Modal Logic
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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

        // 1. KPI Cards
        const students = users.filter(u => u.role === 'STUDENT');
        const studentCount = students.length || users.length;
        document.getElementById('stat-users').innerText = studentCount;
        const heroStudentEl = document.getElementById('hero-students-count');
        if (heroStudentEl) heroStudentEl.innerText = studentCount;

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
    const res = await fetch(`${API_BASE}/users`);
    const users = await res.json();
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    users.forEach(user => {
        let roomText = user.room ? user.room.roomNumber : '<span class="status pending">Not Assigned</span>';
        let actionBtn = user.room ? '-' : `<button class="btn btn-primary" onclick="openAllocateModal(${user.id})">Allocate</button>`;
        
        tbody.innerHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.studentId}</td>
                <td>${user.fullName}</td>
                <td><span class="status allocated">${user.role}</span></td>
                <td>${roomText}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

async function loadRooms() {
    const res = await fetch(`${API_BASE}/rooms`);
    const rooms = await res.json();
    const tbody = document.getElementById('rooms-table-body');
    tbody.innerHTML = '';
    rooms.forEach(room => {
        tbody.innerHTML += `
            <tr>
                <td>${room.id}</td>
                <td>${room.roomNumber}</td>
                <td>${room.blockName}</td>
                <td>${room.currentOccupancy} / ${room.capacity}</td>
            </tr>
        `;
    });
}

async function loadInventory() {
    const res = await fetch(`${API_BASE}/inventory`);
    const items = await res.json();
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    items.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${item.itemName}</td>
                <td>${item.category}</td>
                <td>${item.totalQuantity}</td>
                <td><span class="status allocated">${item.availableQuantity}</span></td>
                <td><span class="status pending">${item.brokenQuantity}</span></td>
            </tr>
        `;
    });
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
    const res = await fetch(`${API_BASE}/gatepasses`);
    const passes = await res.json();
    const tbody = document.getElementById('gatepasses-table-body-admin');
    if (!tbody) return;
    tbody.innerHTML = '';
    passes.forEach(p => {
        let stuName = p.user ? p.user.fullName : 'Unknown';
        let statusClass = p.status === 'APPROVED' ? 'paid' : 'pending';
        let actionBtn = p.status === 'APPROVED' ? '-' : `<button class="btn btn-primary" onclick="approveGatePass(${p.id})"><i class="fas fa-check"></i> Approve</button>`;
        
        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>${stuName}</td>
                <td>${p.reason}</td>
                <td>${p.fromDate}</td>
                <td>${p.toDate}</td>
                <td><span class="status ${statusClass}">${p.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
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

async function submitRoom(event) {
    event.preventDefault();
    const room = {
        roomNumber: document.getElementById('roomNumber').value,
        blockName: document.getElementById('blockName').value,
        capacity: parseInt(document.getElementById('capacity').value)
    };

    await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
    });

    closeModal('roomModal');
    document.getElementById('roomForm').reset();
    loadRooms(); // Refresh table
}

// Allocate Logic
async function openAllocateModal(userId) {
    document.getElementById('allocateUserId').value = userId;
    
    // Fetch available rooms
    const res = await fetch(`${API_BASE}/rooms`);
    const rooms = await res.json();
    const select = document.getElementById('allocateRoomId');
    select.innerHTML = '';
    
    rooms.forEach(room => {
        if (room.currentOccupancy < room.capacity) {
            select.innerHTML += `<option value="${room.id}">${room.roomNumber} (${room.blockName}) - Available: ${room.capacity - room.currentOccupancy}</option>`;
        }
    });

    openModal('allocateModal');
}

async function submitAllocation(event) {
    event.preventDefault();
    const userId = document.getElementById('allocateUserId').value;
    const roomId = document.getElementById('allocateRoomId').value;

    try {
        const response = await fetch(`${API_BASE}/users/${userId}/allocate/${roomId}`, {
            method: 'PUT'
        });

        if (response.ok) {
            closeModal('allocateModal');
            loadUsers();
            loadRooms();
            loadDashboardStats();
        } else {
            alert("Failed to allocate room: " + await response.text());
        }
    } catch (e) {
        console.error("Error", e);
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
            loadAdminGatePasses(); // Refresh table
        } else {
            alert("Failed to approve gate pass.");
        }
    } catch (e) {
        console.error("Error", e);
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
