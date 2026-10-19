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

    if (tabId === 'dashboard') {
        document.getElementById('page-title').innerText = 'Maintenance Operations Dashboard';
        loadDashboardData();
    } else if (tabId === 'repairs') {
        document.getElementById('page-title').innerText = 'Room Equipment Damages & Maintenance Tracker';
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

async function loadDashboardData() {
    await loadRoomDamages();
    await loadComplaints();
    await loadMyAttendance();
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
        const pendingComplaints = complaints.filter(c => c.status !== 'RESOLVED');
        const openComplaints = pendingComplaints.length;
        const overdueComplaints = pendingComplaints.filter(c => c.overdue).length;

        const pEl = document.getElementById('stat-active-repairs');
        const cEl = document.getElementById('stat-completed-repairs');
        if (pEl) pEl.innerText = pending;
        if (cEl) cEl.innerText = completed;

        const tabPEl = document.getElementById('repairs-tab-active-cnt');
        const tabCEl = document.getElementById('repairs-tab-fixed-cnt');
        if (tabPEl) tabPEl.innerText = pending;
        if (tabCEl) tabCEl.innerText = completed;

        // KPI Summary Cards
        const kpiPend = document.getElementById('kpi-pending-repairs');
        if (kpiPend) kpiPend.innerText = pending;
        const kpiComp = document.getElementById('kpi-completed-repairs');
        if (kpiComp) kpiComp.innerText = completed;
        const kpiOpen = document.getElementById('kpi-open-complaints');
        if (kpiOpen) {
            if (overdueComplaints > 0) {
                kpiOpen.innerHTML = `${openComplaints} <span style="font-size:13px; color:#ff4757; font-weight:700;">(${overdueComplaints} Overdue!)</span>`;
            } else {
                kpiOpen.innerText = openComplaints;
            }
        }
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
    const block = document.getElementById('repairBlockFilter')?.value || '';
    const query = (document.getElementById('repairSearchInput')?.value || '').toLowerCase();
    let filtered = allDamages;
    if (block) {
        filtered = filtered.filter(d => d.room && d.room.blockName === block);
    }
    if (query) {
        filtered = filtered.filter(d => {
            const rNo = (d.room ? d.room.roomNumber : '').toLowerCase();
            const bName = (d.room ? d.room.blockName : '').toLowerCase();
            const item = (d.inventory ? d.inventory.itemName : '').toLowerCase();
            const cat = (d.inventory ? d.inventory.category : '').toLowerCase();
            const desc = (d.damageDescription || '').toLowerCase();
            return rNo.includes(query) || bName.includes(query) || item.includes(query) || cat.includes(query) || desc.includes(query);
        });
    }
    renderRepairsTable(filtered);
}

function quickSearchRoomDamages() {
    const input = document.getElementById('quickMaintSearchInput');
    const resultBox = document.getElementById('quickMaintResultBox');
    if (!input || !resultBox) return;

    const val = input.value.trim().toLowerCase();
    if (!val) {
        showToast("Please enter a room number or equipment name to inspect.", "info");
        return;
    }

    resultBox.style.display = 'block';

    const matches = allDamages.filter(d => {
        const rNo = (d.room ? d.room.roomNumber : '').toLowerCase();
        const bName = (d.room ? d.room.blockName : '').toLowerCase();
        const item = (d.inventory ? d.inventory.itemName : '').toLowerCase();
        return rNo.includes(val) || bName.includes(val) || item.includes(val);
    });

    if (matches.length === 0) {
        resultBox.innerHTML = `
            <div style="background:#e8f8f0; border:1.5px solid #2ed573; border-radius:12px; padding:16px 20px; display:flex; align-items:center; gap:14px;">
                <i class="fas fa-check-circle" style="color:#2ed573; font-size:26px;"></i>
                <div>
                    <h4 style="margin:0; color:#155724; font-size:16px;">All Clear - No Reported Damages!</h4>
                    <p style="margin:4px 0 0 0; font-size:13.5px; color:#636e72;">No broken equipment records found for "<strong>${escapeQuote(val)}</strong>". All items in this room appear functional.</p>
                </div>
            </div>
        `;
        return;
    }

    let itemsHtml = matches.map(d => {
        const isDone = d.status === 'REPAIRED';
        const stBadge = isDone
            ? '<span class="status paid"><i class="fas fa-check"></i> Fixed</span>'
            : '<span class="status pending" style="background:#ff4757; color:#fff;"><i class="fas fa-wrench"></i> Needs Repair</span>';
        const actBtn = isDone
            ? ''
            : `<button class="btn btn-primary btn-sm" onclick="completeRepair(${d.id})" style="background:#2ed573; color:#121212; font-weight:700; padding:4px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-check"></i> Mark Fixed</button>`;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong><i class="fas fa-box" style="color:#e67e22; margin-right:6px;"></i> ${d.inventory ? d.inventory.itemName : 'Item'}</strong>
                    <span style="font-size:12px; color:#747d8c; margin-left:8px;">Room: <strong>${d.room ? d.room.roomNumber + ' (' + d.room.blockName + ')' : '-'}</strong> | Qty: <strong>${d.brokenQuantity}</strong></span>
                    <div style="font-size:12px; color:#636e72; margin-top:2px;">${d.damageDescription || 'No description'}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${stBadge}
                    ${actBtn}
                </div>
            </div>
        `;
    }).join('');

    resultBox.innerHTML = `
        <div style="background:#fff8e7; border:1.5px solid #ffa502; border-radius:14px; padding:18px 22px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
                <h4 style="margin:0; font-size:16px; color:#856404;"><i class="fas fa-wrench"></i> Found ${matches.length} Record(s) for "${escapeQuote(val)}"</h4>
                <button class="btn btn-dark btn-sm" onclick="switchMaintenanceTab('repairs')" style="padding:4px 12px; border-radius:6px; cursor:pointer;">
                    <i class="fas fa-external-link-alt"></i> View All in Repairs
                </button>
            </div>
            ${itemsHtml}
        </div>
    `;
}

function clearQuickMaintSearch() {
    const input = document.getElementById('quickMaintSearchInput');
    const resultBox = document.getElementById('quickMaintResultBox');
    if (input) input.value = '';
    if (resultBox) {
        resultBox.innerHTML = '';
        resultBox.style.display = 'none';
    }
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
let currentMaintFilter = 'all';
let currentMaintSearch = '';

async function loadComplaints() {
    try {
        const res = await fetch(`${API_BASE}/complaints`);
        allComplaints = await res.json();
        
        // Calculate counts
        const total = allComplaints.length;
        const notified = allComplaints.filter(c => c.notifiedAt && c.status !== 'RESOLVED').length;
        const overdue = allComplaints.filter(c => c.overdue && c.status !== 'RESOLVED').length;
        const inProgress = allComplaints.filter(c => c.status === 'IN_PROGRESS' || (c.notifiedAt && c.status !== 'RESOLVED')).length;
        const resolved = allComplaints.filter(c => c.status === 'RESOLVED').length;
        
        // Update hero banner pill stats
        const nEl = document.getElementById('maint-stat-notified');
        if (nEl) nEl.innerText = notified;
        const oEl = document.getElementById('maint-stat-overdue');
        if (oEl) oEl.innerText = overdue;
        const pEl = document.getElementById('maint-stat-pending');
        if (pEl) pEl.innerText = inProgress;
        const rEl = document.getElementById('maint-stat-resolved');
        if (rEl) rEl.innerText = resolved;

        // Update tab pill counts
        const tAll = document.getElementById('maint-tab-cnt-all');
        if (tAll) tAll.innerText = total;
        const tNot = document.getElementById('maint-tab-cnt-notified');
        if (tNot) tNot.innerText = notified;
        const tOvd = document.getElementById('maint-tab-cnt-overdue');
        if (tOvd) tOvd.innerText = overdue;
        const tRes = document.getElementById('maint-tab-cnt-resolved');
        if (tRes) tRes.innerText = resolved;

        // Overdue Alert Banner
        const ovdBanner = document.getElementById('maintOverdueBanner');
        const ovdCountEl = document.getElementById('maintOverdueCount');
        if (ovdBanner && ovdCountEl) {
            if (overdue > 0) {
                ovdBanner.style.display = 'flex';
                ovdCountEl.innerText = overdue;
            } else {
                ovdBanner.style.display = 'none';
            }
        }

        applyMaintComplaintsFilter();
    } catch (e) {
        console.error("Failed to load complaints", e);
    }
}

function filterMaintComplaints(type) {
    currentMaintFilter = type;
    document.querySelectorAll('.maint-filter-tab').forEach(tab => {
        const isActive = tab.getAttribute('data-filter') === type;
        if (isActive) {
            tab.classList.add('active');
            tab.style.background = (type === 'overdue' ? '#ff4757' : (type === 'resolved' ? '#2ed573' : '#e67e22'));
            tab.style.borderColor = tab.style.background;
            tab.style.color = '#fff';
        } else {
            tab.classList.remove('active');
            tab.style.background = '#fff';
            tab.style.borderColor = (tab.getAttribute('data-filter') === 'overdue' ? '#ff4757' : '#ddd');
            tab.style.color = (tab.getAttribute('data-filter') === 'overdue' ? '#ff4757' : '#2f3542');
        }
    });
    applyMaintComplaintsFilter();
}

function searchMaintComplaints() {
    const input = document.getElementById('maintComplaintSearch');
    currentMaintSearch = input ? input.value.toLowerCase().trim() : '';
    applyMaintComplaintsFilter();
}

function applyMaintComplaintsFilter() {
    let filtered = allComplaints;

    // Filter by type
    if (currentMaintFilter === 'notified') {
        filtered = filtered.filter(c => c.notifiedAt && c.status !== 'RESOLVED');
    } else if (currentMaintFilter === 'overdue') {
        filtered = filtered.filter(c => c.overdue && c.status !== 'RESOLVED');
    } else if (currentMaintFilter === 'resolved') {
        filtered = filtered.filter(c => c.status === 'RESOLVED');
    }

    // Filter by search keyword
    if (currentMaintSearch) {
        filtered = filtered.filter(c => {
            const sName = (c.user && c.user.fullName) ? c.user.fullName.toLowerCase() : '';
            const rNo = (c.roomNumber || ((c.user && c.user.room) ? c.user.room.roomNumber : '')).toString().toLowerCase();
            const bName = (c.user && c.user.room && c.user.room.blockName) ? c.user.room.blockName.toLowerCase() : '';
            const item = (c.item || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            const idStr = (c.id || '').toString();
            const notes = (c.adminNotes || '').toLowerCase();
            return idStr.includes(currentMaintSearch) || 
                   sName.includes(currentMaintSearch) || 
                   rNo.includes(currentMaintSearch) || 
                   bName.includes(currentMaintSearch) || 
                   item.includes(currentMaintSearch) || 
                   desc.includes(currentMaintSearch) || 
                   notes.includes(currentMaintSearch);
        });
    }

    renderComplaintsTable(filtered);
}

function renderComplaintsTable(list) {
    const tbody = document.getElementById('maintenance-complaints-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888; padding:30px;"><i class="fas fa-inbox" style="font-size:24px; color:#ccc; display:block; margin-bottom:8px;"></i>No complaints found matching this criteria.</td></tr>';
        return;
    }

    list.forEach(c => {
        const sName = c.user ? c.user.fullName : 'Student';
        const rNo = c.roomNumber || ((c.user && c.user.room) ? `${c.user.room.roomNumber} (${c.user.room.blockName})` : '-');
        const itemBadge = c.item 
            ? `<span style="background:rgba(211,84,0,0.12); color:#e67e22; padding:3px 8px; border-radius:4px; font-weight:700; font-size:12px;"><i class="fas fa-tools"></i> ${c.item}</span>` 
            : '<span style="color:#888;">General Repair</span>';
        const isResolved = c.status === 'RESOLVED';
        const statusClass = isResolved ? 'paid' : (c.status === 'IN_PROGRESS' ? 'allocated' : 'pending');

        // Priority badge
        let priorityBadge = '';
        if (c.priority === 'URGENT' || c.priority === 'HIGH') {
            priorityBadge = `<span style="background:#ff4757; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:800; display:inline-block;"><i class="fas fa-fire"></i> ${c.priority}</span>`;
        } else if (c.priority === 'LOW') {
            priorityBadge = `<span style="background:#a4b0be; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">LOW</span>`;
        } else {
            priorityBadge = `<span style="background:#70a1ff; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block;">NORMAL</span>`;
        }

        // Sub Warden dispatch info
        let dispatchHtml = '';
        if (c.notifiedAt) {
            dispatchHtml = `
                <div>
                    ${priorityBadge}
                    <div style="margin-top:4px; font-size:12px; font-weight:600; color:#2f3542;">
                        <i class="fas fa-user-check" style="color:#2ed573;"></i> ${c.assignedTo || 'Maintenance Specialist'}
                    </div>
                    <div style="font-size:11px; color:#747d8c;">
                        <i class="fas fa-bell"></i> Dispatched: ${c.notifiedAt}
                    </div>
                    ${c.adminNotes ? `<div style="margin-top:4px; font-size:11.5px; background:#f1f2f6; border-left:3px solid #e67e22; padding:4px 6px; border-radius:3px; color:#2f3542; max-width:220px;"><strong>Note:</strong> ${c.adminNotes}</div>` : ''}
                </div>
            `;
        } else {
            dispatchHtml = `
                <div>
                    ${priorityBadge}
                    <div style="margin-top:4px; font-size:11.5px; color:#a4b0be;">
                        <i class="fas fa-clock"></i> Pending Warden Action
                    </div>
                </div>
            `;
        }

        // Delay / Overdue status
        let delayHtml = '';
        if (isResolved) {
            delayHtml = `<span style="background:#e8f8f0; color:#2ed573; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700;"><i class="fas fa-check-circle"></i> Resolved</span>`;
        } else if (c.overdue) {
            delayHtml = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="background:#ff4757; color:#ffffff; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:800; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(255,71,87,0.3);">
                        <i class="fas fa-hourglass-end"></i> ${c.daysLate || 1} DAYS DELAYED
                    </span>
                    ${c.escalationCount > 0 ? `
                        <span style="background:#ffeaa7; color:#d63031; border:1px solid #fdcb6e; padding:3px 6px; border-radius:4px; font-size:11px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                            <i class="fas fa-bell"></i> ${c.escalationCount} Escalation Warning(s)!
                        </span>
                    ` : ''}
                    ${c.dueDate ? `<span style="font-size:11px; color:#ff4757; font-weight:600;">Due: ${c.dueDate}</span>` : ''}
                </div>
            `;
        } else {
            delayHtml = `
                <div>
                    <span style="background:#e8f8f0; color:#2ed573; padding:4px 8px; border-radius:6px; font-size:11.5px; font-weight:700;">
                        <i class="fas fa-calendar-check"></i> On Track
                    </span>
                    ${c.dueDate ? `<div style="font-size:11px; color:#747d8c; margin-top:3px;">Due: ${c.dueDate}</div>` : ''}
                </div>
            `;
        }

        const actionBtn = isResolved
            ? '<span style="color:#2ed573; font-weight:700; font-size:13px;"><i class="fas fa-check-double"></i> Resolved</span>'
            : `<button class="btn btn-primary btn-sm" onclick="resolveComplaint(${c.id})" style="background:#2ed573; color:#121212; font-weight:700; white-space:nowrap; padding:6px 12px;"><i class="fas fa-wrench"></i> Mark Resolved</button>`;

        tbody.innerHTML += `
            <tr style="${!isResolved && c.overdue ? 'background: #fff8f8;' : ''}">
                <td><strong>#${c.id}</strong></td>
                <td>${c.createdAt || '-'}</td>
                <td>
                    <strong>${sName}</strong>
                    <div><span class="status allocated" style="margin-top:3px; display:inline-block;"><i class="fas fa-door-closed"></i> ${rNo}</span></div>
                </td>
                <td style="max-width:240px;">
                    <div style="margin-bottom:4px;">${itemBadge}</div>
                    <div style="font-size:13px; color:#2f3542; word-break:break-word;">${c.description}</div>
                </td>
                <td>${dispatchHtml}</td>
                <td>${delayHtml}</td>
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
        const dashDuty = document.getElementById('dash-duty-status-text');
        const btnIn = document.getElementById('btnCheckIn');
        const btnOut = document.getElementById('btnCheckOut');

        if (todayRecord) {
            if (todayRecord.status === 'ABSENT') {
                badge.innerHTML = `<span style="color:#d63031;"><i class="fas fa-exclamation-triangle"></i> <strong>Admin Marked Absence:</strong> ${todayRecord.remarks}</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#d63031; font-weight:700;"><i class="fas fa-exclamation-triangle"></i> Status: ABSENT (${todayRecord.remarks || ''})</span>`;
                btnIn.disabled = true;
            } else if (todayRecord.status === 'ON_LEAVE') {
                badge.innerHTML = `<span style="color:#e67e22;"><i class="fas fa-calendar-minus"></i> <strong>Admin Marked Leave:</strong> ${todayRecord.remarks}</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#e67e22; font-weight:700;"><i class="fas fa-calendar-minus"></i> Status: ON LEAVE (${todayRecord.remarks || ''})</span>`;
                btnIn.disabled = true;
            } else {
                badge.innerHTML = `<span style="color:#2ed573;"><i class="fas fa-check-circle"></i> Checked In Today at <strong>${todayRecord.checkInTime || '-'}</strong>${todayRecord.checkOutTime ? ' &bull; Checked Out at <strong>' + todayRecord.checkOutTime + '</strong>' : ' (On Duty)'}</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#2ed573; font-weight:700;"><i class="fas fa-check-circle"></i> Checked In: ${todayRecord.checkInTime || '-'} ${todayRecord.checkOutTime ? '(Checked Out: ' + todayRecord.checkOutTime + ')' : '(Active Shift)'}</span>`;
                if (todayRecord.checkOutTime) btnOut.disabled = true;
            }
        } else {
            badge.innerHTML = `<span style="color:#636e72;"><i class="fas fa-info-circle"></i> Attendance not marked for today yet.</span>`;
            if (dashDuty) dashDuty.innerHTML = `<span style="color:#636e72;"><i class="fas fa-clock"></i> Not checked in yet today. Ready for duty.</span>`;
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
        const rawNotices = await res.json();
        const notices = rawNotices.filter(n => n.targetAudience === 'STAFF' || n.targetAudience === 'ALL' || !n.targetAudience);
        const tbody = document.getElementById('maintenance-notices-tbody');
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

    const todayDateFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayDateEl = document.getElementById('today-date-str');
    if (todayDateEl) todayDateEl.innerText = 'Date: ' + todayDateFormatted;
    const dashDuty = document.getElementById('dash-duty-status-text');
    if (dashDuty) dashDuty.innerText = 'Date: ' + todayDateFormatted + ' | Checking duty status...';

    switchMaintenanceTab('dashboard');
};
