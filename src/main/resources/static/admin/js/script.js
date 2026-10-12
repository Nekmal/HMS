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

// Global state cache
let allRoomsData = [];
let allUsersData = [];

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
        const res = await fetch(`${API_BASE}/rooms`);
        allRoomsData = await res.json();
        const tbody = document.getElementById('rooms-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        allRoomsData.forEach(room => {
            const isFull = room.currentOccupancy >= room.capacity;
            const statusBadge = isFull 
                ? `<span class="status pending" style="background:#ff4757; color:#fff; font-weight:700;">FULL (4/4)</span>` 
                : `<span class="status paid">${room.capacity - room.currentOccupancy} Beds Available</span>`;
            
            tbody.innerHTML += `
                <tr>
                    <td>${room.id}</td>
                    <td><strong>${room.roomNumber}</strong></td>
                    <td><span class="status allocated">${room.blockName}</span></td>
                    <td><strong>${room.currentOccupancy}</strong> / ${room.capacity} Students</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Failed to load rooms", e);
    }
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
        alert("Please select both a Block and Room Number.");
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
            alert(`Room ${roomNumber} (${blockName}) saved successfully with capacity of 4 students!`);
        } else {
            const err = await res.text();
            alert("Failed to save room: " + err);
        }
    } catch (e) {
        console.error("Failed to save room", e);
        alert("Error connecting to server.");
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
        alert("Please select both a block and an available room.");
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
            alert("Room allocated successfully!");
        } else {
            const err = await response.text();
            alert("Failed to allocate room: " + err);
        }
    } catch (e) {
        console.error("Error in room allocation", e);
        alert("Error connecting to server.");
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
