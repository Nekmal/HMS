// Security Portal Frontend Controller
// Manages Sub Warden approved gate passes, resident directory verification, and security duty attendance.

const API_BASE = '/hms/api';

let allGatePasses = [];
let allStudents = [];
let myAttendanceRecords = [];

// Tab switching
function switchSecurityTab(tabId) {
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('pop-up-animation');
    });

    const target = document.getElementById('view-' + tabId);
    if (target) {
        target.style.display = 'block';
        void target.offsetWidth;
        target.classList.add('pop-up-animation');
    }

    document.querySelectorAll('.sidebar-menu li').forEach(li => {
        if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(`'${tabId}'`)) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });

    if (tabId === 'gatepasses') {
        document.getElementById('page-title').innerText = 'Gate Permissions & Campus Security';
        loadGatePasses();
    } else if (tabId === 'students') {
        document.getElementById('page-title').innerText = 'Student & Hostel Room Directory';
        loadStudentsDirectory();
    } else if (tabId === 'attendance') {
        document.getElementById('page-title').innerText = 'My Attendance & Duty Log';
        loadMyAttendance();
    } else if (tabId === 'notices') {
        document.getElementById('page-title').innerText = 'Campus Notice Board';
        loadNotices();
    }
}

// Toast notification
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

let currentGatePassFilter = 'APPROVED'; // default to showing Sub Warden approved departures
let pendingConfirmCallback = null;

// 1. Gate Passes
async function loadGatePasses() {
    try {
        const res = await fetch(`${API_BASE}/gatepasses`);
        allGatePasses = await res.json();
        
        const approvedCount = allGatePasses.filter(p => p.status === 'APPROVED').length;
        const departedCount = allGatePasses.filter(p => p.status === 'DEPARTED').length;
        const pendingCount = allGatePasses.filter(p => p.status === 'PENDING').length;

        const countAppEl = document.getElementById('count-approved-passes');
        if (countAppEl) countAppEl.innerText = approvedCount;
        const countAllEl = document.getElementById('count-all-passes');
        if (countAllEl) countAllEl.innerText = allGatePasses.length;
        const countDepEl = document.getElementById('count-departed-passes');
        if (countDepEl) countDepEl.innerText = departedCount;
        const countPenEl = document.getElementById('count-pending-passes');
        if (countPenEl) countPenEl.innerText = pendingCount;

        const activeEl = document.getElementById('stat-active-gatepasses');
        if (activeEl) activeEl.innerText = approvedCount;

        filterAndRenderGatePasses();
    } catch (e) {
        console.error("Failed to load gate passes", e);
    }
}

function setGatePassFilter(filter, btn) {
    currentGatePassFilter = filter;
    document.querySelectorAll('.gp-filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#6c757d';
        b.style.color = '#fff';
    });
    if (btn) {
        btn.classList.add('active');
        btn.style.background = '#2ed573';
        btn.style.color = '#121212';
    }
    filterAndRenderGatePasses();
}

function filterAndRenderGatePasses() {
    const query = (document.getElementById('gatePassSearch')?.value || '').toLowerCase();
    
    let filtered = allGatePasses;
    if (currentGatePassFilter !== 'ALL') {
        filtered = filtered.filter(p => p.status === currentGatePassFilter);
    }

    if (query) {
        filtered = filtered.filter(p => {
            const sId = (p.user ? p.user.studentId : '').toLowerCase();
            const sName = (p.user ? p.user.fullName : '').toLowerCase();
            const reason = (p.reason || '').toLowerCase();
            const room = (p.user && p.user.room ? p.user.room.roomNumber : '').toLowerCase();
            return sId.includes(query) || sName.includes(query) || reason.includes(query) || room.includes(query);
        });
    }

    renderGatePassesTable(filtered);
}

function filterGatePasses() {
    filterAndRenderGatePasses();
}

function renderGatePassesTable(list) {
    const tbody = document.getElementById('security-gatepasses-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888; padding:25px;"><i class="fas fa-id-card" style="font-size:24px; display:block; margin-bottom:8px;"></i>No student early departure passes found for this filter.</td></tr>';
        return;
    }

    list.forEach(p => {
        const studentId = p.user ? p.user.studentId : 'N/A';
        const studentName = p.user ? p.user.fullName : 'Unknown Student';
        const roomInfo = (p.user && p.user.room) ? `${p.user.room.roomNumber} (${p.user.room.blockName})` : 'Not Allocated';
        
        let statusBadge = '';
        let actionBtn = '';

        if (p.status === 'APPROVED') {
            statusBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3); font-weight: 700;"><i class="fas fa-check-circle"></i> APPROVED by Sub Warden</span>';
            actionBtn = `<button class="btn btn-primary btn-sm" onclick="promptMarkGateExit(${p.id}, '${escapeQuote(studentName)}', '${escapeQuote(roomInfo)}', '${escapeQuote(p.reason)}')" style="background:#2ed573; color:#121212; font-weight:700; padding:6px 14px; border-radius:6px;"><i class="fas fa-walking"></i> Verify & Allow Exit</button>`;
        } else if (p.status === 'DEPARTED') {
            statusBadge = '<span class="status-badge" style="background: rgba(47, 53, 66, 0.15); color: #2f3542; border: 1px solid rgba(47, 53, 66, 0.3); font-weight: 700;"><i class="fas fa-walking"></i> DEPARTED (Checked Out)</span>';
            actionBtn = '<span style="color:#2ed573; font-weight:600; font-size:13px;"><i class="fas fa-check-double"></i> Exit Completed</span>';
        } else if (p.status === 'REJECTED') {
            statusBadge = '<span class="status-badge" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: 700;"><i class="fas fa-times-circle"></i> REJECTED BY SUB WARDEN</span>';
            actionBtn = '<span style="color:#ff4757; font-size:12.5px;"><i class="fas fa-ban"></i> Exit Not Permitted</span>';
        } else {
            statusBadge = '<span class="status-badge" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); font-weight: 700;"><i class="fas fa-clock"></i> PENDING SUB WARDEN</span>';
            actionBtn = '<span style="color:#ffa502; font-size:12.5px;"><i class="fas fa-lock"></i> Gate Locked (Awaiting Approval)</span>';
        }

        tbody.innerHTML += `
            <tr style="${p.status === 'APPROVED' ? 'background: rgba(46, 213, 115, 0.03);' : ''}">
                <td><strong>#${p.id}</strong></td>
                <td><strong>${studentId}</strong></td>
                <td><strong>${studentName}</strong></td>
                <td><span class="status-badge" style="background: rgba(55, 66, 250, 0.1); color: #3742fa;"><i class="fas fa-door-closed"></i> ${roomInfo}</span></td>
                <td>${p.reason}</td>
                <td><span style="color: #1e3799; font-weight: 600;"><i class="fas fa-calendar-day"></i> ${p.fromDate}</span></td>
                <td><span style="color: #57606f;"><i class="fas fa-calendar-check"></i> ${p.toDate}</span></td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

function escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'");
}

function promptMarkGateExit(id, name, room, reason) {
    const modal = document.getElementById('securityConfirmModal');
    const title = document.getElementById('securityConfirmTitle');
    const desc = document.getElementById('securityConfirmDesc');
    
    if (title) title.innerText = 'Verify & Clear Student Gate Exit';
    if (desc) {
        desc.innerHTML = `Confirm exit for <strong>${name}</strong> (${room})?<br><span style="font-size:13px; color:#57606f;">Reason: ${reason}<br>Official Approval: <strong>Sub Warden Approved</strong></span>`;
    }

    pendingConfirmCallback = async () => {
        try {
            const res = await fetch(`${API_BASE}/gatepasses/${id}/depart`, { method: 'PUT' });
            if (res.ok) {
                showToast(`Gate clearance granted! ${name} marked as Departed.`, "success");
                await loadGatePasses();
            } else {
                showToast("Failed to record gate exit.", "error");
            }
        } catch(e) {
            console.error("Error clearing gate exit", e);
            showToast("Error connecting to server.", "error");
        }
    };

    if (modal) modal.style.display = 'flex';
}

function closeSecurityConfirm(confirmed) {
    const modal = document.getElementById('securityConfirmModal');
    if (modal) modal.style.display = 'none';
    if (confirmed && typeof pendingConfirmCallback === 'function') {
        pendingConfirmCallback();
    }
    pendingConfirmCallback = null;
}

// 2. Student & Room Directory
async function loadStudentsDirectory() {
    try {
        const res = await fetch(`${API_BASE}/users`);
        const users = await res.json();
        allStudents = users.filter(u => u.role === 'STUDENT');
        renderStudentsTable(allStudents);
    } catch (e) {
        console.error("Failed to load students", e);
    }
}

function renderStudentsTable(list) {
    const tbody = document.getElementById('security-students-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:25px;">No students found matching search.</td></tr>';
        return;
    }

    list.forEach(s => {
        const roomNo = s.room ? s.room.roomNumber : '<span class="status pending">Not Assigned</span>';
        const blockName = s.room ? `<span class="status allocated" style="font-weight:700;">${s.room.blockName}</span>` : '-';
        const cap = s.room ? `${s.room.capacity} Beds` : '-';

        tbody.innerHTML += `
            <tr>
                <td><strong>${s.studentId}</strong></td>
                <td>${s.fullName}</td>
                <td><strong style="color: #2f3542; font-size:15px;">${roomNo}</strong></td>
                <td>${blockName}</td>
                <td>${cap}</td>
                <td>${s.email || '-'}</td>
                <td><span class="status ${s.room ? 'paid' : 'pending'}">${s.room ? 'Boarding' : 'Pending Allocation'}</span></td>
            </tr>
        `;
    });
}

function filterStudentsDirectory() {
    const blockFilter = document.getElementById('studentBlockFilter').value;
    const query = document.getElementById('studentSearch').value.toLowerCase();

    const filtered = allStudents.filter(s => {
        const matchesBlock = !blockFilter || (s.room && s.room.blockName === blockFilter);
        const nameMatch = s.fullName.toLowerCase().includes(query);
        const idMatch = s.studentId.toLowerCase().includes(query);
        const roomMatch = s.room && s.room.roomNumber.toLowerCase().includes(query);
        return matchesBlock && (nameMatch || idMatch || roomMatch);
    });

    renderStudentsTable(filtered);
}

// 3. My Attendance & Duty Log
async function loadMyAttendance() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const [attRes, sumRes] = await Promise.all([
            fetch(`${API_BASE}/staff-attendance/staff/${userId}`),
            fetch(`${API_BASE}/staff-attendance/staff/${userId}/summary`)
        ]);

        myAttendanceRecords = await attRes.json();
        const summary = await sumRes.json();

        // Update KPI counts
        document.getElementById('att-present-count').innerText = summary.presentCount || 0;
        document.getElementById('att-absent-count').innerText = summary.absentCount || 0;
        document.getElementById('att-leave-count').innerText = summary.leaveCount || 0;

        // Today's record
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRecord = myAttendanceRecords.find(r => r.date === todayStr);

        const statusBadge = document.getElementById('todayDutyStatusBadge');
        const btnIn = document.getElementById('btnCheckIn');
        const btnOut = document.getElementById('btnCheckOut');

        if (todayRecord) {
            if (todayRecord.status === 'ABSENT') {
                statusBadge.innerHTML = `<span style="color:#d63031;"><i class="fas fa-exclamation-triangle"></i> <strong>Admin Marked Absence:</strong> ${todayRecord.remarks}</span>`;
                btnIn.disabled = true;
            } else if (todayRecord.status === 'ON_LEAVE') {
                statusBadge.innerHTML = `<span style="color:#e67e22;"><i class="fas fa-calendar-minus"></i> <strong>Admin Marked Leave:</strong> ${todayRecord.remarks}</span>`;
                btnIn.disabled = true;
            } else {
                statusBadge.innerHTML = `<span style="color:#2ed573;"><i class="fas fa-check-circle"></i> Checked In Today at <strong>${todayRecord.checkInTime || '-'}</strong>${todayRecord.checkOutTime ? ' &bull; Checked Out at <strong>' + todayRecord.checkOutTime + '</strong>' : ' (Currently On Duty)'}</span>`;
                if (todayRecord.checkOutTime) {
                    btnOut.disabled = true;
                }
            }
        } else {
            statusBadge.innerHTML = `<span style="color:#636e72;"><i class="fas fa-info-circle"></i> You have not marked duty attendance for today yet.</span>`;
        }

        renderAttendanceTable(myAttendanceRecords);
    } catch (e) {
        console.error("Failed to load attendance", e);
    }
}

function renderAttendanceTable(list) {
    const tbody = document.getElementById('security-attendance-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888; padding:25px;">No attendance records found.</td></tr>';
        return;
    }

    list.forEach(a => {
        let statusBadge = `<span class="status paid"><i class="fas fa-check"></i> PRESENT</span>`;
        let rowStyle = '';

        if (a.status === 'ABSENT') {
            statusBadge = `<span class="status pending" style="background:#ff4757; color:#fff; font-weight:700;"><i class="fas fa-times-circle"></i> ABSENT</span>`;
            rowStyle = 'background: #fff0f3;';
        } else if (a.status === 'ON_LEAVE') {
            statusBadge = `<span class="status pending" style="background:#ffa502; color:#fff; font-weight:700;"><i class="fas fa-calendar-minus"></i> ON LEAVE</span>`;
            rowStyle = 'background: #fff8e7;';
        }

        const markedByBadge = a.markedBy === 'ADMIN'
            ? `<span style="color:#d63031; font-weight:700;"><i class="fas fa-user-shield"></i> Administrator</span>`
            : `<span style="color:#2f3542; font-weight:600;"><i class="fas fa-user-check"></i> Self Marked</span>`;

        tbody.innerHTML += `
            <tr style="${rowStyle}">
                <td><strong>${a.date}</strong></td>
                <td>${statusBadge}</td>
                <td><strong>${a.checkInTime || '-'}</strong></td>
                <td>${a.checkOutTime || '-'}</td>
                <td>${markedByBadge}</td>
                <td>${a.remarks || '-'}</td>
            </tr>
        `;
    });
}

async function markMyCheckIn() {
    const userId = localStorage.getItem('userId');
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkin/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks: 'Security Gate Post: Main Entrance' })
        });
        if (res.ok) {
            showToast("Duty Check-In marked successfully! Have a safe shift.", "success");
            loadMyAttendance();
        } else {
            showToast("Failed to mark check-in.", "error");
        }
    } catch (e) {
        showToast("Error connecting to server.", "error");
    }
}

async function markMyCheckOut() {
    const userId = localStorage.getItem('userId');
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkout/${userId}`, {
            method: 'POST'
        });
        if (res.ok) {
            showToast("Duty Check-Out marked successfully! Shift completed.", "success");
            loadMyAttendance();
        } else {
            showToast("Failed to mark check-out.", "error");
        }
    } catch (e) {
        showToast("Error connecting to server.", "error");
    }
}

// 4. Notices
async function loadNotices() {
    try {
        const res = await fetch(`${API_BASE}/notices`);
        const notices = await res.json();
        const tbody = document.getElementById('security-notices-tbody');
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
    } catch (e) {
        console.error("Failed to load notices", e);
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/hms/';
}

// Initial Load
window.onload = () => {
    if (!localStorage.getItem('userId') || localStorage.getItem('userRole') !== 'SECURITY') {
        window.location.href = '/hms/';
        return;
    }

    const userName = localStorage.getItem('userName') || 'Security Officer';
    document.getElementById('header-user-name').innerText = userName;
    const heroName = document.getElementById('hero-officer-name');
    if (heroName) heroName.innerText = userName;

    const todayDateEl = document.getElementById('today-date-str');
    if (todayDateEl) todayDateEl.innerText = 'Date: ' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    loadGatePasses();
};
