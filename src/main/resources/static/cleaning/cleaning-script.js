// cleaning-script.js - Cleaning Service Portal Logic

const API_BASE = '/hms/api';
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupClock();
    setupEventListeners();
    loadDashboardData();
});

// Setup active user session
function initAuth() {
    const userStr = localStorage.getItem('hms_user');
    if (!userStr) {
        window.location.href = '/hms/index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        if (currentUser.role && currentUser.role.toUpperCase() !== 'CLEANING') {
            console.warn('User is not CLEANING staff, but allowed in portal mode:', currentUser.role);
        }
    } catch(e) {
        currentUser = { id: 154, username: 'cleaning', role: 'CLEANING' };
    }
    
    const nameEl = document.getElementById('cleaningStaffName');
    if (nameEl) nameEl.textContent = (currentUser.username || 'Cleaning Staff').toUpperCase();
    
    const roleBadge = document.getElementById('cleaningStaffRoleBadge');
    if (roleBadge) roleBadge.textContent = currentUser.role || 'CLEANING';
}

function logout() {
    localStorage.removeItem('hms_user');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
        window.location.href = '/hms/index.html';
    }, 800);
}

// Live Clock
function setupClock() {
    const updateTime = () => {
        const now = new Date();
        const clockEl = document.getElementById('liveClock');
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
        }
        const dateEl = document.getElementById('liveDate');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// Navigation and Event Listeners
function setupEventListeners() {
    // Navigation Tabs
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.getAttribute('data-view');
            switchView(viewName);
        });
    });
    
    // Check-in & Check-out Buttons
    const btnCheckIn = document.getElementById('btnSelfCheckIn');
    if (btnCheckIn) {
        btnCheckIn.addEventListener('click', handleCheckIn);
    }
    
    const btnCheckOut = document.getElementById('btnSelfCheckOut');
    if (btnCheckOut) {
        btnCheckOut.addEventListener('click', handleCheckOut);
    }
    
    // Block Filter buttons for cleaning tasks
    const blockFilters = document.querySelectorAll('.block-filter-btn');
    blockFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            blockFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterCleaningTasks(btn.getAttribute('data-block'));
        });
    });
}

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('d-none'));
    
    const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    const activeSection = document.getElementById(`view-${viewName}`);
    if (activeSection) {
        activeSection.classList.remove('d-none');
        activeSection.classList.add('fade-in');
    }
    
    // Page Title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        const titles = {
            'dashboard': 'Cleaning Dashboard Overview',
            'checklist': 'Daily Hostel Sanitation Checklist',
            'attendance': 'My Attendance & Absence History',
            'notices': 'Duty Notices & Maintenance Alerts'
        };
        titleEl.textContent = titles[viewName] || 'Cleaning Portal';
    }
    
    if (viewName === 'attendance') {
        loadMyAttendanceHistory();
    } else if (viewName === 'checklist') {
        loadCleaningChecklist();
    } else if (viewName === 'notices') {
        loadNotices();
    }
}

// Load All Dashboard Overview Data
async function loadDashboardData() {
    await Promise.all([
        loadTodayAttendanceStatus(),
        loadCleaningSummaryCards(),
        loadRecentDamagesFeed()
    ]);
}

// Attendance Logic
async function loadTodayAttendanceStatus() {
    const staffId = currentUser?.id || 154;
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/staff/${staffId}/summary`);
        if (!res.ok) throw new Error('Failed to fetch summary');
        const summary = await res.json();
        
        // Update summary cards
        const daysPresentEl = document.getElementById('statDaysPresent');
        if (daysPresentEl) daysPresentEl.textContent = summary.daysPresent || 0;
        
        const daysAbsentEl = document.getElementById('statDaysAbsent');
        if (daysAbsentEl) daysAbsentEl.textContent = summary.daysAbsent || 0;
        
        const daysLeaveEl = document.getElementById('statDaysLeave');
        if (daysLeaveEl) daysLeaveEl.textContent = summary.daysLeave || 0;
        
        // Update today's button state
        const statusBadge = document.getElementById('todayAttendanceBadge');
        const checkInTimeEl = document.getElementById('todayCheckInTime');
        const checkOutTimeEl = document.getElementById('todayCheckOutTime');
        const btnCheckIn = document.getElementById('btnSelfCheckIn');
        const btnCheckOut = document.getElementById('btnSelfCheckOut');
        
        if (summary.todayAttendance) {
            const today = summary.todayAttendance;
            if (statusBadge) {
                statusBadge.textContent = today.status;
                statusBadge.className = `badge bg-${today.status === 'PRESENT' ? 'success' : today.status === 'ABSENT' ? 'danger' : 'warning'}`;
            }
            if (checkInTimeEl) checkInTimeEl.textContent = today.checkInTime ? formatTime(today.checkInTime) : '--:--';
            if (checkOutTimeEl) checkOutTimeEl.textContent = today.checkOutTime ? formatTime(today.checkOutTime) : '--:--';
            
            if (btnCheckIn) btnCheckIn.disabled = !!today.checkInTime;
            if (btnCheckOut) btnCheckOut.disabled = !today.checkInTime || !!today.checkOutTime;
        } else {
            if (statusBadge) {
                statusBadge.textContent = 'NOT MARKED';
                statusBadge.className = 'badge bg-secondary';
            }
            if (checkInTimeEl) checkInTimeEl.textContent = '--:--';
            if (checkOutTimeEl) checkOutTimeEl.textContent = '--:--';
            if (btnCheckIn) btnCheckIn.disabled = false;
            if (btnCheckOut) btnCheckOut.disabled = true;
        }
    } catch (e) {
        console.error('Error fetching attendance summary:', e);
    }
}

async function handleCheckIn() {
    const staffId = currentUser?.id || 154;
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkin/${staffId}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Check-in marked successfully! Have a productive shift.', 'success');
            loadTodayAttendanceStatus();
            loadMyAttendanceHistory();
        } else {
            showToast(data.message || 'Check-in failed', 'warning');
        }
    } catch (e) {
        showToast('Error during check-in: ' + e.message, 'danger');
    }
}

async function handleCheckOut() {
    const staffId = currentUser?.id || 154;
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/checkout/${staffId}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Check-out marked successfully! Shift completed.', 'success');
            loadTodayAttendanceStatus();
            loadMyAttendanceHistory();
        } else {
            showToast(data.message || 'Check-out failed', 'warning');
        }
    } catch (e) {
        showToast('Error during check-out: ' + e.message, 'danger');
    }
}

// Attendance History & Admin Absence Tracking
async function loadMyAttendanceHistory() {
    const staffId = currentUser?.id || 154;
    const tableBody = document.getElementById('myAttendanceTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Loading attendance records...</td></tr>`;
    
    try {
        const res = await fetch(`${API_BASE}/staff-attendance/staff/${staffId}`);
        if (!res.ok) throw new Error('Failed to load records');
        const records = await res.json();
        
        if (!records || records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-calendar-times fa-2x mb-2 d-block"></i>No attendance records found yet.</td></tr>`;
            return;
        }
        
        let html = '';
        records.forEach((rec, idx) => {
            const statusClass = rec.status === 'PRESENT' ? 'success' : rec.status === 'ABSENT' ? 'danger' : 'warning';
            const markedByBadge = rec.markedBy === 'ADMIN' 
                ? '<span class="badge bg-danger text-white"><i class="fas fa-user-shield me-1"></i>ADMIN MARKED</span>' 
                : '<span class="badge bg-info text-dark"><i class="fas fa-user-check me-1"></i>SELF</span>';
            
            html += `
                <tr class="${rec.status === 'ABSENT' ? 'table-danger-light' : ''}">
                    <td>${idx + 1}</td>
                    <td><strong>${rec.date}</strong></td>
                    <td><span class="badge bg-${statusClass} px-2 py-1">${rec.status}</span></td>
                    <td>${rec.checkInTime ? formatTime(rec.checkInTime) : '--'}</td>
                    <td>${rec.checkOutTime ? formatTime(rec.checkOutTime) : '--'}</td>
                    <td>${markedByBadge}</td>
                    <td><span class="small ${rec.remarks ? 'text-dark' : 'text-muted'}">${rec.remarks || 'Standard duty schedule'}</span></td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        
        // Summary count inside attendance tab
        const absentCount = records.filter(r => r.status === 'ABSENT').length;
        const leaveCount = records.filter(r => r.status === 'ON_LEAVE').length;
        const presentCount = records.filter(r => r.status === 'PRESENT').length;
        
        const countAbsentEl = document.getElementById('tabCountAbsent');
        if (countAbsentEl) countAbsentEl.textContent = absentCount;
        const countLeaveEl = document.getElementById('tabCountLeave');
        if (countLeaveEl) countLeaveEl.textContent = leaveCount;
        const countPresentEl = document.getElementById('tabCountPresent');
        if (countPresentEl) countPresentEl.textContent = presentCount;
        
    } catch (e) {
        console.error('Error loading history:', e);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Failed to load records: ${e.message}</td></tr>`;
    }
}

// Cleaning Checklist & Room Sanitation
let cleaningTasks = [];
function loadCleaningSummaryCards() {
    // Generate initial dummy/session cleaning tasks if empty
    if (!localStorage.getItem('hms_cleaning_tasks')) {
        const sampleTasks = [];
        const blocks = ['A', 'B', 'C', 'D'];
        blocks.forEach(block => {
            // First 5 rooms of each block as sample checklist
            for (let i = 1; i <= 5; i++) {
                const roomNum = `${block}-${i.toString().padStart(3, '0')}`;
                sampleTasks.push({
                    id: `${block}_${i}`,
                    block: block,
                    room: roomNum,
                    type: i % 2 === 0 ? 'Deep Clean & Sanitize' : 'Daily Floor & Waste Disposal',
                    status: i === 1 ? 'COMPLETED' : 'PENDING',
                    assignedTo: 'Cleaning Staff',
                    completedAt: i === 1 ? '09:30 AM' : null,
                    notes: i % 2 === 0 ? 'Window mirrors & restroom disinfection' : 'Standard sweep, mop, dust'
                });
            }
        });
        localStorage.setItem('hms_cleaning_tasks', JSON.stringify(sampleTasks));
    }
    
    try {
        cleaningTasks = JSON.parse(localStorage.getItem('hms_cleaning_tasks')) || [];
    } catch(e) {
        cleaningTasks = [];
    }
    
    const completed = cleaningTasks.filter(t => t.status === 'COMPLETED').length;
    const pending = cleaningTasks.filter(t => t.status === 'PENDING').length;
    
    const statCleanCompEl = document.getElementById('statCleanCompleted');
    if (statCleanCompEl) statCleanCompEl.textContent = completed;
    
    const statCleanPendEl = document.getElementById('statCleanPending');
    if (statCleanPendEl) statCleanPendEl.textContent = pending;
}

function loadCleaningChecklist(filterBlock = 'ALL') {
    loadCleaningSummaryCards();
    const container = document.getElementById('cleaningTasksGrid');
    if (!container) return;
    
    let filtered = cleaningTasks;
    if (filterBlock !== 'ALL') {
        filtered = cleaningTasks.filter(t => t.block === filterBlock);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-broom fa-3x text-muted mb-3 d-block"></i>
                <h5 class="text-secondary">No cleaning tasks found for Block ${filterBlock}</h5>
            </div>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach(task => {
        const isDone = task.status === 'COMPLETED';
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 border-${isDone ? 'success' : 'primary'} shadow-sm task-card ${isDone ? 'bg-light-success' : ''}">
                    <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
                        <span class="badge bg-dark fs-6"><i class="fas fa-door-closed me-1"></i>Room ${task.room}</span>
                        <span class="badge bg-${isDone ? 'success' : 'warning text-dark'}">
                            <i class="fas fa-${isDone ? 'check-circle' : 'hourglass-half'} me-1"></i>${task.status}
                        </span>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title fw-bold text-primary">${task.type}</h6>
                        <p class="card-text small text-muted mb-2">${task.notes}</p>
                        <div class="small text-secondary mb-3">
                            <i class="fas fa-layer-group me-1"></i>Block: <strong>${task.block}</strong>
                            ${isDone ? `<br><i class="fas fa-check-double text-success me-1"></i>Completed: ${task.completedAt}` : ''}
                        </div>
                        ${!isDone ? `
                            <button class="btn btn-sm btn-outline-success w-100" onclick="markTaskDone('${task.id}')">
                                <i class="fas fa-check me-1"></i>Mark As Cleaned
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-light text-muted w-100" disabled>
                                <i class="fas fa-check-circle text-success me-1"></i>Cleaned & Inspected
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function filterCleaningTasks(block) {
    loadCleaningChecklist(block);
}

window.markTaskDone = function(taskId) {
    const taskIndex = cleaningTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
        cleaningTasks[taskIndex].status = 'COMPLETED';
        const now = new Date();
        cleaningTasks[taskIndex].completedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('hms_cleaning_tasks', JSON.stringify(cleaningTasks));
        showToast(`Room ${cleaningTasks[taskIndex].room} marked as sanitized!`, 'success');
        
        // Refresh active view
        const activeBlock = document.querySelector('.block-filter-btn.active')?.getAttribute('data-block') || 'ALL';
        loadCleaningChecklist(activeBlock);
        loadCleaningSummaryCards();
    }
};

// Recent Damages Feed (to alert cleaning staff about hazardous or broken items in rooms)
async function loadRecentDamagesFeed() {
    const listEl = document.getElementById('cleaningDamagesFeed');
    if (!listEl) return;
    
    try {
        const res = await fetch(`${API_BASE}/room-inventory/damaged`);
        if (!res.ok) throw new Error('Failed to fetch damaged items');
        const damaged = await res.json();
        
        if (!damaged || damaged.length === 0) {
            listEl.innerHTML = `<li class="list-group-item text-center py-3 text-muted"><i class="fas fa-check-circle text-success me-1"></i>All hostel rooms are clean and in good order.</li>`;
            return;
        }
        
        let html = '';
        damaged.slice(0, 5).forEach(item => {
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-danger me-2"><i class="fas fa-exclamation-triangle me-1"></i>Room ${item.roomNumber || 'General'}</span>
                        <strong class="text-dark">${item.itemName}</strong>
                        <span class="text-muted small d-block">Damaged count: ${item.brokenQuantity} unit(s)</span>
                    </div>
                    <span class="badge bg-warning text-dark"><i class="fas fa-tools me-1"></i>Under Maintenance</span>
                </li>
            `;
        });
        listEl.innerHTML = html;
    } catch(e) {
        listEl.innerHTML = `<li class="list-group-item text-muted">No hazard alerts currently available.</li>`;
    }
}

// Duty Notices
function loadNotices() {
    const container = document.getElementById('cleaningNoticesContainer');
    if (!container) return;
    
    const notices = [
        {
            title: 'Weekly Deep Sanitation Schedule - Block C & D',
            date: 'Today',
            urgent: true,
            desc: 'Please prioritize deep disinfection of restrooms and corridor common areas in Blocks C & D before 2:00 PM.'
        },
        {
            title: 'Attendance Policy & Absence Logging',
            date: 'Official',
            urgent: false,
            desc: 'Staff members must mark Check-in upon shift arrival and Check-out before departure. Unnotified leaves are recorded as ABSENT by the Administration Office.'
        },
        {
            title: 'Broken Furniture / Hazard Reporting',
            date: 'Maintenance Notice',
            urgent: false,
            desc: 'If any broken chair, bed frame, or electrical issue is found during morning cleaning, please report directly to the Maintenance team or Housekeeping desk.'
        }
    ];
    
    let html = '';
    notices.forEach(n => {
        html += `
            <div class="card mb-3 border-${n.urgent ? 'warning' : 'info'} shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="card-title fw-bold mb-0 ${n.urgent ? 'text-warning' : 'text-primary'}">
                            <i class="fas fa-${n.urgent ? 'bell' : 'info-circle'} me-2"></i>${n.title}
                        </h6>
                        <span class="badge bg-${n.urgent ? 'danger' : 'secondary'}">${n.date}</span>
                    </div>
                    <p class="card-text text-muted mb-0">${n.desc}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Utility: Format ISO time
function formatTime(isoStr) {
    if (!isoStr) return '--:--';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return isoStr;
    }
}

// In-App Toast Notification (Zero browser native alerts)
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('hmsToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'hmsToastContainer';
        toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} shadow-lg py-2 px-3 m-0 d-flex align-items-center animate__animated animate__fadeInUp`;
    toast.style.cssText = 'min-width:280px;max-width:380px;pointer-events:auto;border-radius:10px;font-size:0.9rem;border:none;box-shadow:0 10px 25px rgba(0,0,0,0.15)!important;';
    
    const iconClass = type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    toast.innerHTML = `
        <i class="fas fa-${iconClass} me-2 fs-5"></i>
        <div class="flex-grow-1">${message}</div>
        <button type="button" class="btn-close btn-close-sm ms-2" onclick="this.parentElement.remove()"></button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
