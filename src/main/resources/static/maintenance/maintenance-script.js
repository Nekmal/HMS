// Maintenance Portal Frontend Controller
// Handles room damages, repairs, student maintenance complaints, and staff self-attendance.

const API_BASE = '/hms/api';

let allDamages = [];
let allComplaints = [];

function switchMaintenanceTab(tabId) {
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

    if (tabId === 'repairs') {
        document.getElementById('page-title').innerText = 'Room Equipment Damages & Repairs';
        loadRoomDamages();
    } else if (tabId === 'complaints') {
        document.getElementById('page-title').innerText = 'Student Maintenance Complaints';
        loadComplaints();
    } else if (tabId === 'attendance') {
        document.getElementById('page-title').innerText = 'My Attendance & Duty Log';
        loadMyAttendance();
    } else if (tabId === 'notices') {
        document.getElementById('page-title').innerText = 'Campus Notice Board';
        loadNotices();
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
    onConfirm = null
}) {
    document.getElementById('confirmDialogTitle').innerText = title;
    document.getElementById('confirmDialogDesc').innerText = message;
    
    const actionBtn = document.getElementById('confirmDialogActionBtn');
    actionBtn.innerHTML = `<i class="fas fa-check"></i> ${confirmText}`;
    actionBtn.style.backgroundColor = confirmColor;

    confirmDialogCallback = onConfirm;
    document.getElementById('confirmDialogModal').style.display = 'block';
}

function closeConfirmDialog(isConfirmed) {
    document.getElementById('confirmDialogModal').style.display = 'none';
    if (isConfirmed && typeof confirmDialogCallback === 'function') {
        confirmDialogCallback();
    }
    confirmDialogCallback = null;
}

// In-App Toast
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

// 1. Room Damages & Repairs
async function loadRoomDamages() {
    try {
        const [damRes, compRes] = await Promise.all([
            fetch(`${API_BASE}/room-inventory`),
            fetch(`${API_BASE}/complaints`).catch(() => ({ json: () => [] }))
        ]);
        allDamages = await damRes.json();
        const complaints = await (compRes.json ? compRes.json() : []);

        const pending = allDamages.filter(d => d.status !== 'REPAIRED').length;
        const completed = allDamages.filter(d => d.status === 'REPAIRED').length;
        const openComplaints = complaints.filter(c => c.status !== 'RESOLVED').length;

        const pEl = document.getElementById('stat-active-repairs');
        const cEl = document.getElementById('stat-completed-repairs');
        if (pEl) pEl.innerText = pending;
        if (cEl) cEl.innerText = completed;

        // KPI Summary Cards
        const kpiPend = document.getElementById('kpi-pending-repairs');
        if (kpiPend) kpiPend.innerText = pending;
        const kpiComp = document.getElementById('kpi-completed-repairs');
        if (kpiComp) kpiComp.innerText = completed;
        const kpiOpen = document.getElementById('kpi-open-complaints');
        if (kpiOpen) kpiOpen.innerText = openComplaints;
        const kpiHlt = document.getElementById('kpi-facility-health');
        const healthPercent = allDamages.length > 0 ? Math.round((completed / allDamages.length) * 100) : 100;
        if (kpiHlt) kpiHlt.innerText = `${healthPercent}%`;

        // Block-wise and Category-wise calculations
        const blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
        const blockMap = {};
        blocks.forEach(b => blockMap[b] = { total: 0, pending: 0, fixed: 0 });

        const catMap = {};

        allDamages.forEach(d => {
            const b = (d.room && d.room.blockName) ? d.room.blockName : 'Block A';
            if (!blockMap[b]) blockMap[b] = { total: 0, pending: 0, fixed: 0 };
            blockMap[b].total += (d.brokenQuantity || 1);
            if (d.status === 'REPAIRED') {
                blockMap[b].fixed += (d.brokenQuantity || 1);
            } else {
                blockMap[b].pending += (d.brokenQuantity || 1);
            }

            const cat = (d.inventory && d.inventory.category) ? d.inventory.category : 'General Equipment';
            if (!catMap[cat]) catMap[cat] = { total: 0, pending: 0, fixed: 0 };
            catMap[cat].total += (d.brokenQuantity || 1);
            if (d.status === 'REPAIRED') catMap[cat].fixed += (d.brokenQuantity || 1);
            else catMap[cat].pending += (d.brokenQuantity || 1);
        });

        // Populate #maintenance-block-summary-tbody
        const bTbody = document.getElementById('maintenance-block-summary-tbody');
        if (bTbody) {
            bTbody.innerHTML = '';
            blocks.forEach(b => {
                const s = blockMap[b] || { total: 0, pending: 0, fixed: 0 };
                const healthPct = s.total > 0 ? Math.round((s.fixed / s.total) * 100) : 100;
                bTbody.innerHTML += `
                    <tr>
                        <td><strong>${b}</strong></td>
                        <td>${s.total} items</td>
                        <td><strong style="color:${s.pending > 0 ? '#d63031' : '#2ed573'};">${s.pending}</strong></td>
                        <td><strong style="color:#2ed573;">${s.fixed}</strong></td>
                        <td style="min-width:120px;">
                            <div style="font-size:11px; font-weight:700; margin-bottom:2px; display:flex; justify-content:space-between;">
                                <span>${healthPct}%</span>
                                <span style="color:#888;">${s.pending} bad</span>
                            </div>
                            <div style="background:#eee; height:6px; border-radius:3px; overflow:hidden;">
                                <div style="background:#e67e22; width:${healthPct}%; height:100%;"></div>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Populate #maintenance-category-summary-tbody
        const cTbody = document.getElementById('maintenance-category-summary-tbody');
        if (cTbody) {
            cTbody.innerHTML = '';
            const cats = Object.keys(catMap);
            if (cats.length === 0) {
                cTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No asset damage reported. All good!</td></tr>';
            } else {
                cats.forEach(c => {
                    const s = catMap[c];
                    const rate = s.total > 0 ? Math.round((s.fixed / s.total) * 100) : 100;
                    cTbody.innerHTML += `
                        <tr>
                            <td><strong>${c}</strong></td>
                            <td>${s.total} units</td>
                            <td><strong style="color:${s.pending > 0 ? '#d63031' : '#2ed573'};">${s.pending} pending</strong></td>
                            <td><span class="status ${s.pending === 0 ? 'paid' : 'pending'}">${rate}% Restored</span></td>
                        </tr>
                    `;
                });
            }
        }

        renderRepairsTable(allDamages);
    } catch (e) {
        console.error("Failed to load repairs", e);
    }
}

function renderRepairsTable(list) {
    const tbody = document.getElementById('maintenance-repairs-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888; padding:25px;">No equipment damage records found.</td></tr>';
        return;
    }

    list.forEach(d => {
        const roomNo = d.room ? d.room.roomNumber : 'N/A';
        const blockName = d.room ? d.room.blockName : '';
        const itemName = d.inventory ? d.inventory.itemName : 'Item';
        const category = d.inventory ? d.inventory.category : '-';
        const isDone = d.status === 'REPAIRED';

        const statusClass = isDone ? 'paid' : 'pending';
        const actionBtn = isDone
            ? '<span style="color:#2ed573; font-weight:700;"><i class="fas fa-check-circle"></i> Maintenance Done</span>'
            : `<button class="btn btn-primary btn-sm" onclick="completeRepair(${d.id})" style="background:#2ed573; color:#121212; font-weight:700;"><i class="fas fa-check"></i> Complete Maintenance</button>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>#${d.id}</strong></td>
                <td><span class="status allocated" style="font-weight:700; font-size:13.5px;"><i class="fas fa-door-closed"></i> ${roomNo} (${blockName})</span></td>
                <td><strong style="color:#2f3542;">${itemName}</strong></td>
                <td>${category}</td>
                <td><strong style="color:#d63031;">${d.brokenQuantity} Unit(s)</strong></td>
                <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${d.damageDescription}">${d.damageDescription}</td>
                <td>${d.reportedDate || '-'}</td>
                <td><span class="status ${statusClass}">${d.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

function filterRepairsTable() {
    const block = document.getElementById('repairBlockFilter').value;
    const filtered = !block ? allDamages : allDamages.filter(d => d.room && d.room.blockName === block);
    renderRepairsTable(filtered);
}

function completeRepair(id) {
    showConfirmDialog({
        title: 'Complete Maintenance Task',
        message: 'Confirm that this room equipment item has been repaired and verified in working order. Master stock will be automatically updated.',
        confirmText: 'Yes, Maintenance Done',
        confirmColor: '#2ed573',
        onConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE}/room-inventory/${id}/repair`, { method: 'PUT' });
                if (res.ok) {
                    showToast("Maintenance task completed and restored to working condition!", "success");
                    loadRoomDamages();
                } else {
                    showToast("Failed to update maintenance task.", "error");
                }
            } catch (e) {
                showToast("Error connecting to server.", "error");
            }
        }
    });
}

// 2. Student Complaints
async function loadComplaints() {
    try {
        const res = await fetch(`${API_BASE}/complaints`);
        allComplaints = await res.json();
        renderComplaintsTable(allComplaints);
    } catch (e) {
        console.error("Failed to load complaints", e);
    }
}

function renderComplaintsTable(list) {
    const tbody = document.getElementById('maintenance-complaints-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:25px;">No complaints filed.</td></tr>';
        return;
    }

    list.forEach(c => {
        const sName = c.user ? c.user.fullName : 'Student';
        const rNo = (c.user && c.user.room) ? `${c.user.room.roomNumber} (${c.user.room.blockName})` : '-';
        const isResolved = c.status === 'RESOLVED';
        const statusClass = isResolved ? 'paid' : 'pending';

        const actionBtn = isResolved
            ? '<span style="color:#2ed573; font-weight:700;"><i class="fas fa-check-double"></i> Resolved</span>'
            : `<button class="btn btn-primary btn-sm" onclick="resolveComplaint(${c.id})" style="background:#2ed573; color:#121212; font-weight:700;"><i class="fas fa-wrench"></i> Mark Resolved</button>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>#${c.id}</strong></td>
                <td>${c.createdAt || '-'}</td>
                <td>${sName}</td>
                <td><span class="status allocated">${rNo}</span></td>
                <td>${c.description}</td>
                <td><span class="status ${statusClass}">${c.status}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

function resolveComplaint(id) {
    showConfirmDialog({
        title: 'Resolve Student Complaint',
        message: 'Confirm that this student complaint has been attended to and resolved by the maintenance crew.',
        confirmText: 'Yes, Complaint Resolved',
        confirmColor: '#2ed573',
        onConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE}/complaints/${id}/resolve`, { method: 'PUT' });
                if (res.ok) {
                    showToast("Complaint marked as resolved!", "success");
                    loadComplaints();
                } else {
                    showToast("Failed to resolve complaint.", "error");
                }
            } catch (e) {
                showToast("Error connecting to server.", "error");
            }
        }
    });
}

// 3. Attendance
async function loadMyAttendance() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const res = await fetch(`${API_BASE}/staff-attendance/staff/${userId}`);
        const records = await res.json();

        const todayStr = new Date().toISOString().split('T')[0];
        const todayRecord = records.find(r => r.date === todayStr);

        const badge = document.getElementById('todayDutyStatusBadge');
        const btnIn = document.getElementById('btnCheckIn');
        const btnOut = document.getElementById('btnCheckOut');

        if (todayRecord) {
            if (todayRecord.status === 'ABSENT') {
                badge.innerHTML = `<span style="color:#d63031;"><i class="fas fa-exclamation-triangle"></i> <strong>Admin Marked Absence:</strong> ${todayRecord.remarks}</span>`;
                btnIn.disabled = true;
            } else if (todayRecord.status === 'ON_LEAVE') {
                badge.innerHTML = `<span style="color:#e67e22;"><i class="fas fa-calendar-minus"></i> <strong>Admin Marked Leave:</strong> ${todayRecord.remarks}</span>`;
                btnIn.disabled = true;
            } else {
                badge.innerHTML = `<span style="color:#2ed573;"><i class="fas fa-check-circle"></i> Checked In Today at <strong>${todayRecord.checkInTime || '-'}</strong>${todayRecord.checkOutTime ? ' &bull; Checked Out at <strong>' + todayRecord.checkOutTime + '</strong>' : ' (On Duty)'}</span>`;
                if (todayRecord.checkOutTime) btnOut.disabled = true;
            }
        } else {
            badge.innerHTML = `<span style="color:#636e72;"><i class="fas fa-info-circle"></i> Attendance not marked for today yet.</span>`;
        }

        const tbody = document.getElementById('maintenance-attendance-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888; padding:25px;">No attendance records found.</td></tr>';
            return;
        }

        records.forEach(a => {
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
    } catch (e) {
        console.error("Failed to load attendance", e);
    }
}

async function markMyCheckIn() {
    const userId = localStorage.getItem('userId');
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkin/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks: 'Maintenance Team: Electrical & Facility Inspections' })
        });
        if (res.ok) {
            showToast("Duty Check-In marked successfully! Ready for facility maintenance.", "success");
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
        const res = await fetch(`${API_BASE}/staff-attendance/checkout/${userId}`, { method: 'POST' });
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
        const tbody = document.getElementById('maintenance-notices-tbody');
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

window.onload = () => {
    if (!localStorage.getItem('userId') || localStorage.getItem('userRole') !== 'MAINTENANCE') {
        window.location.href = '/hms/';
        return;
    }

    const userName = localStorage.getItem('userName') || 'Maintenance Specialist';
    document.getElementById('header-user-name').innerText = userName;

    const todayDateEl = document.getElementById('today-date-str');
    if (todayDateEl) todayDateEl.innerText = 'Date: ' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    loadRoomDamages();
};
