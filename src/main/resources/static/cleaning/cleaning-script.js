// Cleaning Service Portal Controller
// Manages daily room sanitation checklists, shift duty check-in/out, and block sanitation progress summaries.

const API_BASE = '/hms/api';

let currentStaffId = localStorage.getItem('userId') || 154;
let cleaningDataStore = JSON.parse(localStorage.getItem('hms_cleaning_status') || '{}');

document.addEventListener('DOMContentLoaded', () => {
    initCleaningPortal();
});

async function initCleaningPortal() {
    setupDateTime();
    loadCleaningSummary();
    loadAttendanceRecords();
    renderCleaningChecklist();
    loadNotices();
    switchCleaningTab('dashboard');
}

function setupDateTime() {
    const today = new Date();
    const formatted = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dateStrEl = document.getElementById('today-date-str');
    if (dateStrEl) {
        dateStrEl.innerText = `Date: ${formatted}`;
    }
    const dashDuty = document.getElementById('dash-duty-status-text');
    if (dashDuty) {
        dashDuty.innerText = `Date: ${formatted} | Checking shift attendance...`;
    }
}

// Tab Switching
function switchCleaningTab(tabId) {
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('pop-up-animation');
    });

    let targetId = 'view-' + tabId;
    if (tabId === 'schedule') targetId = 'view-schedule';
    
    const target = document.getElementById(targetId);
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

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        if (tabId === 'dashboard') pageTitle.innerText = 'Housekeeping & Sanitation Dashboard';
        else if (tabId === 'attendance') pageTitle.innerText = 'Cleaning Duty Attendance & Absence Tracker';
        else if (tabId === 'schedule') pageTitle.innerText = 'Daily Hostel Room Sanitation Checklist';
        else if (tabId === 'notices') pageTitle.innerText = 'Campus Housekeeping Notices';
    }
}

// 1. Cleaning Summary & Block Progress
async function loadCleaningSummary() {
    let rooms = [];
    try {
        const res = await fetch(`${API_BASE}/rooms`);
        if (res.ok) rooms = await res.json();
    } catch(e) {
        console.warn("Could not fetch rooms from server", e);
    }

    const blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
    const blockStats = {};

    blocks.forEach(b => {
        blockStats[b] = { total: 25, cleaned: 0 };
    });

    // Check localStorage status for all 100 rooms
    blocks.forEach((block, bIdx) => {
        const letter = block.split(' ')[1];
        for (let i = 1; i <= 25; i++) {
            const rNum = `${letter}-${100 + i}`;
            const isCleaned = cleaningDataStore[rNum] !== undefined ? cleaningDataStore[rNum] : (i <= 20); // default realistic demo
            if (isCleaned) blockStats[block].cleaned++;
        }
    });

    let grandTotal = 100;
    let grandCleaned = 0;
    blocks.forEach(b => grandCleaned += blockStats[b].cleaned);
    let grandPending = grandTotal - grandCleaned;
    let compRate = Math.round((grandCleaned / grandTotal) * 100);

    const statTot = document.getElementById('stat-total-rooms');
    if (statTot) statTot.innerText = grandTotal;
    const statCln = document.getElementById('stat-cleaned-rooms');
    if (statCln) statCln.innerText = grandCleaned;
    const statPnd = document.getElementById('stat-pending-rooms');
    if (statPnd) statPnd.innerText = grandPending;
    const statRate = document.getElementById('stat-sanitation-rate');
    if (statRate) statRate.innerText = `${compRate}%`;

    const heroCleaned = document.getElementById('hero-sanitized-count');
    if (heroCleaned) heroCleaned.innerText = grandCleaned;
    const heroPending = document.getElementById('hero-pending-count');
    if (heroPending) heroPending.innerText = grandPending;

    const schedCleaned = document.getElementById('schedule-cleaned-cnt');
    if (schedCleaned) schedCleaned.innerText = grandCleaned;
    const schedPending = document.getElementById('schedule-pending-cnt');
    if (schedPending) schedPending.innerText = grandPending;

    // Render Block Sanitation Summary Table
    const tbody = document.getElementById('cleaning-block-summary-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        blocks.forEach(b => {
            const s = blockStats[b];
            const pct = Math.round((s.cleaned / s.total) * 100);
            tbody.innerHTML += `
                <tr>
                    <td><strong>${b}</strong></td>
                    <td>${s.total} Rooms</td>
                    <td><strong style="color:#10ac84;">${s.cleaned}</strong> / ${s.total}</td>
                    <td style="min-width: 140px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; margin-bottom:2px;">
                            <span>${pct}% Done</span>
                            <span style="color:#888;">${s.total - s.cleaned} left</span>
                        </div>
                        <div class="progress-bar-bg" style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                            <div class="progress-bar-fill" style="width: ${pct}%; background:#10ac84; height:100%; border-radius:4px;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
}

// 2. Attendance & Check-in/out
async function loadAttendanceRecords() {
    const tbody = document.getElementById('cleaning-attendance-tbody');
    const badge = document.getElementById('todayDutyStatusBadge');
    const dashDuty = document.getElementById('dash-duty-status-text');
    const btnIn = document.getElementById('btnCheckIn');
    const btnOut = document.getElementById('btnCheckOut');

    try {
        const res = await fetch(`${API_BASE}/staff-attendance/staff/${currentStaffId}`);
        if (!res.ok) throw new Error("Could not fetch attendance");
        const list = await res.json();

        let presentDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let todayLog = null;
        const todayStr = new Date().toISOString().split('T')[0];

        if (tbody) tbody.innerHTML = '';

        if (!list || list.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No attendance records found. Mark your first check-in above!</td></tr>';
        } else {
            list.forEach(a => {
                if (a.status === 'PRESENT') presentDays++;
                else if (a.status === 'ABSENT') absentDays++;
                else if (a.status === 'LEAVE') leaveDays++;

                if (a.date === todayStr) {
                    todayLog = a;
                }

                let stClass = a.status === 'PRESENT' ? 'paid' : (a.status === 'ABSENT' ? 'maintenance' : 'pending');
                let markedByBadge = a.markedBy === 'ADMIN' 
                    ? '<span style="font-size:11px; background:#fff0f3; color:#d63031; border:1px solid #ff7675; padding:2px 6px; border-radius:4px; font-weight:700;"><i class="fas fa-user-shield"></i> Sub Warden</span>'
                    : '<span style="font-size:11px; background:#f1f2f6; color:#2f3542; padding:2px 6px; border-radius:4px; font-weight:600;"><i class="fas fa-fingerprint"></i> Self</span>';

                if (tbody) {
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${a.date}</strong></td>
                            <td><span class="status ${stClass}">${a.status}</span></td>
                            <td>${a.checkInTime ? a.checkInTime.substring(11, 16) : '-'}</td>
                            <td>${a.checkOutTime ? a.checkOutTime.substring(11, 16) : '-'}</td>
                            <td>${markedByBadge}</td>
                            <td>${a.remarks || '-'}</td>
                        </tr>
                    `;
                }
            });
        }

        // Hero pills
        const elPres = document.getElementById('kpi-present-count');
        if (elPres) elPres.innerText = presentDays;
        const elAbs = document.getElementById('kpi-absent-count');
        if (elAbs) elAbs.innerText = absentDays;
        const elLeave = document.getElementById('kpi-leave-count');
        if (elLeave) elLeave.innerText = leaveDays;

        // Today's status badge & dashboard status text
        if (todayLog) {
            if (todayLog.checkOutTime) {
                if (badge) badge.innerHTML = `<span style="color:#10ac84;"><i class="fas fa-check-double"></i> Shift Completed: Checked in at ${todayLog.checkInTime.substring(11, 16)}, Checked out at ${todayLog.checkOutTime.substring(11, 16)}.</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#10ac84;"><i class="fas fa-check-double"></i> Shift Completed today (In: ${todayLog.checkInTime.substring(11, 16)} | Out: ${todayLog.checkOutTime.substring(11, 16)})</span>`;
                if (btnIn) btnIn.disabled = true;
                if (btnOut) btnOut.disabled = true;
            } else {
                if (badge) badge.innerHTML = `<span style="color:#2ed573;"><i class="fas fa-circle-check"></i> On Duty: Checked in at ${todayLog.checkInTime ? todayLog.checkInTime.substring(11, 16) : 'Shift Start'}. Active cleaning shift.</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#2ed573;"><i class="fas fa-circle-check"></i> Currently ON DUTY (Checked in at ${todayLog.checkInTime ? todayLog.checkInTime.substring(11, 16) : 'Shift Start'})</span>`;
                if (btnIn) btnIn.disabled = true;
                if (btnOut) btnOut.disabled = false;
            }
        } else {
            if (badge) badge.innerHTML = `<span><i class="fas fa-clock"></i> Not Checked-In Yet for Today's Shift. Click 'Mark Check-In' to log duty start.</span>`;
            if (dashDuty) dashDuty.innerHTML = `<span style="color:#e67e22;"><i class="fas fa-clock"></i> Not Checked In Yet for Today's Shift</span>`;
            if (btnIn) btnIn.disabled = false;
            if (btnOut) btnOut.disabled = true;
        }

    } catch(e) {
        console.error("Error loading cleaning attendance", e);
    }
}

async function markMyCheckIn() {
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkin/${currentStaffId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks: 'Cleaning Team: Daily Hostel Sanitation Shift' })
        });
        if (res.ok) {
            showToast("Duty Check-In recorded successfully! Have a great shift.", "success");
            loadAttendanceRecords();
        } else {
            showToast("Failed to record check-in.", "error");
        }
    } catch(e) {
        showToast("Error connecting to server.", "error");
    }
}

async function markMyCheckOut() {
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkout/${currentStaffId}`, { method: 'POST' });
        if (res.ok) {
            showToast("Duty Check-Out recorded successfully! Shift concluded.", "success");
            loadAttendanceRecords();
        } else {
            showToast("Failed to record check-out.", "error");
        }
    } catch(e) {
        showToast("Error connecting to server.", "error");
    }
}

// 3. Room Sanitation Checklist
function renderCleaningChecklist() {
    const sel = document.getElementById('cleaningBlockSelect');
    const block = sel ? sel.value : 'Block A';
    const letter = block.split(' ')[1] || 'A';
    const searchQuery = (document.getElementById('cleaningRoomSearchInput')?.value || '').trim().toLowerCase();
    const tbody = document.getElementById('cleaning-checklist-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    let renderedCount = 0;
    for (let i = 1; i <= 25; i++) {
        const rNum = `${letter}-${100 + i}`;
        if (searchQuery && !rNum.toLowerCase().includes(searchQuery)) {
            continue;
        }
        renderedCount++;
        const isCleaned = cleaningDataStore[rNum] !== undefined ? cleaningDataStore[rNum] : (i <= 20);

        tbody.innerHTML += `
            <tr>
                <td><strong>${rNum}</strong></td>
                <td><span style="font-weight:600;">${block}</span></td>
                <td><i class="fas fa-check" style="color:${isCleaned ? '#2ed573' : '#a4b0be'};"></i> ${isCleaned ? 'Swept & Mopped' : 'Pending'}</td>
                <td><i class="fas fa-check" style="color:${isCleaned ? '#2ed573' : '#a4b0be'};"></i> ${isCleaned ? 'Bins Cleared' : 'Pending'}</td>
                <td>
                    <span class="status ${isCleaned ? 'paid' : 'pending'}">${isCleaned ? 'Sanitized' : 'Pending'}</span>
                </td>
                <td>
                    <button class="btn ${isCleaned ? 'btn-dark' : 'btn-primary'} btn-sm" onclick="toggleSanitation('${rNum}')">
                        <i class="fas ${isCleaned ? 'fa-rotate-left' : 'fa-check'}"></i> ${isCleaned ? 'Reset' : 'Mark Done'}
                    </button>
                </td>
            </tr>
        `;
    }
    if (renderedCount === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">No rooms found matching "${searchQuery}" in ${block}.</td></tr>`;
    }
}

function toggleSanitation(roomNum) {
    const current = cleaningDataStore[roomNum] !== undefined ? cleaningDataStore[roomNum] : true;
    cleaningDataStore[roomNum] = !current;
    localStorage.setItem('hms_cleaning_status', JSON.stringify(cleaningDataStore));
    showToast(`Room ${roomNum} status updated!`, 'success');
    renderCleaningChecklist();
    loadCleaningSummary();
}

function quickSearchRoomSanitation() {
    const input = document.getElementById('quickCleanSearchInput');
    const resultBox = document.getElementById('quickCleanResultBox');
    if (!input || !resultBox) return;

    const val = input.value.trim().toUpperCase();
    if (!val) {
        showToast("Please enter a room number to inspect.", "info");
        return;
    }

    resultBox.style.display = 'block';

    // Normalize input: e.g. "A-101", "101", "B105", "B-105"
    let targetRoom = val;
    let targetBlock = 'Block A';

    if (/^[A-D]-\d{3}$/.test(val)) {
        targetRoom = val;
        targetBlock = `Block ${val.charAt(0)}`;
    } else if (/^[A-D]\d{3}$/.test(val)) {
        targetRoom = `${val.charAt(0)}-${val.substring(1)}`;
        targetBlock = `Block ${val.charAt(0)}`;
    } else if (/^\d{3}$/.test(val)) {
        const sel = document.getElementById('cleaningBlockSelect')?.value || 'Block A';
        const letter = sel.split(' ')[1] || 'A';
        targetRoom = `${letter}-${val}`;
        targetBlock = sel;
    }

    const isCleaned = cleaningDataStore[targetRoom] !== undefined ? cleaningDataStore[targetRoom] : true;

    if (isCleaned) {
        resultBox.innerHTML = `
            <div style="background:#e8f8f0; border:1.5px solid #2ed573; border-radius:12px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <i class="fas fa-check-circle" style="color:#2ed573; font-size:26px;"></i>
                    <div>
                        <div style="font-weight:700; color:#121212; font-size:15px;">Room ${targetRoom} (${targetBlock}) is <span style="color:#2ed573;">Cleaned & Sanitized</span> today!</div>
                        <div style="color:#636e72; font-size:12.5px; margin-top:2px;">Swept, mopped, and waste bins cleared. Optimal hygiene verified.</div>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary btn-sm" onclick="toggleSanitation('${targetRoom}'); quickSearchRoomSanitation();">
                        <i class="fas fa-rotate-left"></i> Mark Pending
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="selectAndOpenBlockChecklist('${targetBlock}')" style="background:#10ac84; border:none; color:#fff;">
                        <i class="fas fa-arrow-right"></i> Open Checklist
                    </button>
                </div>
            </div>
        `;
    } else {
        resultBox.innerHTML = `
            <div style="background:#fff8e7; border:1.5px solid #ffa502; border-radius:12px; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <i class="fas fa-exclamation-triangle" style="color:#ffa502; font-size:26px;"></i>
                    <div>
                        <div style="font-weight:700; color:#121212; font-size:15px;">Room ${targetRoom} (${targetBlock}) is <span style="color:#e67e22;">Pending Cleaning</span>!</div>
                        <div style="color:#636e72; font-size:12.5px; margin-top:2px;">Requires daily sweeping, mopping, and waste disposal.</div>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="toggleSanitation('${targetRoom}'); quickSearchRoomSanitation();" style="background:#2ed573; border:none; color:#121212; font-weight:700;">
                        <i class="fas fa-check"></i> Mark Cleaned Now
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="selectAndOpenBlockChecklist('${targetBlock}')">
                        <i class="fas fa-arrow-right"></i> Open Checklist
                    </button>
                </div>
            </div>
        `;
    }
}

function selectAndOpenBlockChecklist(blockName) {
    const sel = document.getElementById('cleaningBlockSelect');
    if (sel) sel.value = blockName;
    switchCleaningTab('schedule');
    renderCleaningChecklist();
}

function clearQuickCleanSearch() {
    const input = document.getElementById('quickCleanSearchInput');
    const resultBox = document.getElementById('quickCleanResultBox');
    if (input) input.value = '';
    if (resultBox) {
        resultBox.innerHTML = '';
        resultBox.style.display = 'none';
    }
}

// 4. Campus Notices
async function loadNotices() {
    try {
        const res = await fetch(`${API_BASE}/notices`);
        if (!res.ok) return;
        const rawNotices = await res.json();
        const notices = rawNotices.filter(n => n.targetAudience === 'STAFF' || n.targetAudience === 'ALL' || !n.targetAudience);
        const tbody = document.getElementById('cleaning-notices-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        notices.forEach(n => {
            const badge = n.targetAudience === 'STAFF'
                ? '<span style="background:rgba(230,126,34,0.15); color:#e67e22; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700; margin-right:6px;"><i class="fas fa-user-shield"></i> Staff</span>'
                : '<span style="background:rgba(52,152,219,0.15); color:#3498db; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700; margin-right:6px;"><i class="fas fa-users"></i> All</span>';
            tbody.innerHTML += `
                <tr>
                    <td>${n.id}</td>
                    <td>${n.datePosted}</td>
                    <td>${badge}<strong>${n.title}</strong></td>
                    <td>${n.content}</td>
                </tr>
            `;
        });
    } catch(e) {
        console.error("Error loading notices", e);
    }
}

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
    let iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';

    toast.innerHTML = `
        <i class="fas ${iconClass} custom-toast-icon"></i>
        <div class="custom-toast-text">${message}</div>
        <button class="custom-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

function logout() {
    localStorage.clear();
    window.location.href = '/hms/';
}
