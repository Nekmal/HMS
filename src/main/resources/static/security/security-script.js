// Security Portal Frontend Controller
// Manages Sub Warden approved gate passes, resident directory verification, and security duty attendance.

const API_BASE = '/hms/api';

let allGatePasses = [];
let allStudents = [];
let myAttendanceRecords = [];

// Gate Pass Period Summary Mode ('weekly' | 'monthly' | 'all')
let securityGpPeriodMode = 'weekly';
let selectedSecurityGpPeriod = '';
let currentGatePassFilter = 'APPROVED'; // default to showing Sub Warden approved departures
let pendingConfirmCallback = null;

// Helper to compute Week start (Monday) and end (Sunday)
function getWeekRangeForDate(dStr) {
    if (!dStr) return null;
    const d = new Date(dStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    
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
        label: `Week of ${dateRangeLabel}`
    };
}

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

    if (tabId === 'dashboard') {
        document.getElementById('page-title').innerText = 'Security Command Dashboard';
        loadDashboardData();
    } else if (tabId === 'gatepasses') {
        document.getElementById('page-title').innerText = 'Student Gate Passes & Early Home Departures';
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

function openGatePassesFiltered(filter) {
    switchSecurityTab('gatepasses');
    setGatePassFilter(filter);
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

// Dashboard Data Loading
async function loadDashboardData() {
    await loadGatePasses();
    await loadMyAttendance();
}

// 1. Gate Passes & Overview Data
async function loadGatePasses() {
    try {
        const [gpRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/gatepasses`),
            fetch(`${API_BASE}/users`).catch(() => ({ json: () => [] }))
        ]);
        allGatePasses = await gpRes.json();
        const users = await (usersRes.json ? usersRes.json() : []);
        allStudents = users.filter(u => u.role === 'STUDENT');

        const approvedCount = allGatePasses.filter(p => p.status === 'APPROVED').length;
        const departedCount = allGatePasses.filter(p => p.status === 'DEPARTED').length;
        const pendingCount = allGatePasses.filter(p => p.status === 'PENDING').length;

        // Gate Pass Tab Count Badges
        const countAppEl = document.getElementById('count-approved-passes');
        if (countAppEl) countAppEl.innerText = approvedCount;
        const countAllEl = document.getElementById('count-all-passes');
        if (countAllEl) countAllEl.innerText = allGatePasses.length;
        const countDepEl = document.getElementById('count-departed-passes');
        if (countDepEl) countDepEl.innerText = departedCount;
        const countPenEl = document.getElementById('count-pending-passes');
        if (countPenEl) countPenEl.innerText = pendingCount;

        // Gate Pass Dedicated Hero Stats
        const gpHeroApp = document.getElementById('gp-hero-approved');
        if (gpHeroApp) gpHeroApp.innerText = approvedCount;
        const gpHeroDep = document.getElementById('gp-hero-departed');
        if (gpHeroDep) gpHeroDep.innerText = departedCount;
        const gpHeroPen = document.getElementById('gp-hero-pending');
        if (gpHeroPen) gpHeroPen.innerText = pendingCount;

        // Dashboard Hero Stat
        const activeEl = document.getElementById('stat-active-gatepasses');
        if (activeEl) activeEl.innerText = approvedCount;

        // Dashboard KPI Summary Cards
        const kpiTot = document.getElementById('kpi-total-gatepasses');
        if (kpiTot) kpiTot.innerText = allGatePasses.length;
        const kpiApp = document.getElementById('kpi-approved-gatepasses');
        if (kpiApp) kpiApp.innerText = approvedCount;
        const kpiDep = document.getElementById('kpi-departed-gatepasses');
        if (kpiDep) kpiDep.innerText = departedCount;
        const kpiOnc = document.getElementById('kpi-oncampus-students');
        const onCampus = Math.max(0, allStudents.length - departedCount);
        if (kpiOnc) kpiOnc.innerText = `${onCampus} / ${allStudents.length}`;

        // Summary Table 1: Recent Gate Exit Clearances
        const clrTbody = document.getElementById('security-clearance-summary-tbody');
        if (clrTbody) {
            clrTbody.innerHTML = '';
            const recentGP = allGatePasses.slice(-5).reverse();
            if (recentGP.length === 0) {
                clrTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No student leaves recorded today.</td></tr>';
            } else {
                recentGP.forEach(p => {
                    const sName = p.user ? (p.user.fullName || p.user.studentId) : 'Student';
                    const rNum = p.user && p.user.room ? p.user.room.roomNumber : '-';
                    let stBadge = p.status === 'DEPARTED' ? 'paid' : (p.status === 'APPROVED' ? 'allocated' : 'pending');
                    clrTbody.innerHTML += `
                        <tr>
                            <td><strong>${sName}</strong></td>
                            <td><span style="font-weight:600;">${rNum}</span></td>
                            <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.reason || ''}">${p.reason || 'Leave'}</td>
                            <td>${p.fromDate || '-'}</td>
                            <td><span class="status ${stBadge}">${p.status}</span></td>
                        </tr>
                    `;
                });
            }
        }

        // Summary Table 2: Block-Wise Resident Presence Summary
        const blkTbody = document.getElementById('security-block-resident-summary-tbody');
        if (blkTbody) {
            blkTbody.innerHTML = '';
            const blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
            const blockStats = {};
            blocks.forEach(b => blockStats[b] = { total: 0, away: 0 });

            allStudents.forEach(s => {
                const b = s.room ? s.room.blockName : 'Block A';
                if (!blockStats[b]) blockStats[b] = { total: 0, away: 0 };
                blockStats[b].total++;
            });

            allGatePasses.filter(p => p.status === 'DEPARTED').forEach(p => {
                const b = p.user && p.user.room ? p.user.room.blockName : 'Block A';
                if (blockStats[b]) blockStats[b].away++;
            });

            blocks.forEach(b => {
                const s = blockStats[b];
                const onCampusCount = Math.max(0, s.total - s.away);
                const rate = s.total > 0 ? Math.round((onCampusCount / s.total) * 100) : 100;
                blkTbody.innerHTML += `
                    <tr>
                        <td><strong>${b}</strong></td>
                        <td>${s.total} students</td>
                        <td><strong style="color:#2ed573;">${onCampusCount}</strong></td>
                        <td><strong style="color:${s.away > 0 ? '#3742fa' : '#888'};">${s.away}</strong></td>
                        <td style="min-width:110px;">
                            <div style="font-size:11px; font-weight:700; margin-bottom:2px; display:flex; justify-content:space-between;">
                                <span>${rate}%</span>
                                <span style="color:#888;">${s.away} out</span>
                            </div>
                            <div style="background:#eee; height:6px; border-radius:3px; overflow:hidden;">
                                <div style="background:#1e3799; width:${rate}%; height:100%;"></div>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Populate weekly/monthly dropdown and render gate passes
        populateSecurityGatePassPeriodDropdown();
        filterAndRenderGatePasses();
    } catch (e) {
        console.error("Failed to load gate passes", e);
    }
}

// Period Summary Mode Switching
function setSecurityGatePassPeriodMode(mode) {
    securityGpPeriodMode = mode;
    const btnWeekly = document.getElementById('btnGpModeWeekly');
    const btnMonthly = document.getElementById('btnGpModeMonthly');
    const btnAll = document.getElementById('btnGpModeAll');
    const selWrap = document.getElementById('gpPeriodSelectorWrap');

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
        if (selWrap) selWrap.style.display = 'flex';
    } else if (mode === 'monthly') {
        if (btnMonthly) {
            btnMonthly.style.background = 'var(--primary-yellow)';
            btnMonthly.style.color = '#121212';
        }
        if (selWrap) selWrap.style.display = 'flex';
    } else {
        if (btnAll) {
            btnAll.style.background = 'var(--primary-yellow)';
            btnAll.style.color = '#121212';
        }
        if (selWrap) selWrap.style.display = 'none';
    }

    populateSecurityGatePassPeriodDropdown();
    filterAndRenderGatePasses();
}

function populateSecurityGatePassPeriodDropdown() {
    const sel = document.getElementById('gpPeriodSelect');
    if (!sel) return;

    if (securityGpPeriodMode === 'all') {
        return;
    }

    if (securityGpPeriodMode === 'weekly') {
        const weekMap = new Map();
        allGatePasses.forEach(p => {
            if (p.fromDate) {
                const w = getWeekRangeForDate(p.fromDate);
                if (w && !weekMap.has(w.key)) weekMap.set(w.key, w);
            }
        });
        const todayStr = new Date().toISOString().split('T')[0];
        const todayWeek = getWeekRangeForDate(todayStr);
        if (todayWeek && !weekMap.has(todayWeek.key)) {
            weekMap.set(todayWeek.key, todayWeek);
        }
        const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => b.startStr.localeCompare(a.startStr));
        sel.innerHTML = sortedWeeks.map(w => {
            const isCur = todayWeek && w.key === todayWeek.key;
            return `<option value="${w.key}">${isCur ? '📍 [This Week] ' : ''}${w.label}</option>`;
        }).join('');
        if (!selectedSecurityGpPeriod || !weekMap.has(selectedSecurityGpPeriod)) {
            selectedSecurityGpPeriod = todayWeek ? todayWeek.key : (sortedWeeks[0] ? sortedWeeks[0].key : '');
        }
        sel.value = selectedSecurityGpPeriod;
    } else if (securityGpPeriodMode === 'monthly') {
        const monthMap = new Map();
        allGatePasses.forEach(p => {
            if (p.fromDate) {
                const mKey = p.fromDate.substring(0, 7);
                if (mKey && !monthMap.has(mKey)) {
                    const dObj = new Date(p.fromDate + 'T00:00:00');
                    monthMap.set(mKey, dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
                }
            }
        });
        const todayMonth = new Date().toISOString().substring(0, 7);
        if (!monthMap.has(todayMonth)) {
            monthMap.set(todayMonth, new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        }
        const sortedMonths = Array.from(monthMap.keys()).sort().reverse();
        sel.innerHTML = sortedMonths.map(mKey => {
            const isCur = mKey === todayMonth;
            return `<option value="${mKey}">${isCur ? '📍 [This Month] ' : ''}${monthMap.get(mKey)}</option>`;
        }).join('');
        if (!selectedSecurityGpPeriod || !monthMap.has(selectedSecurityGpPeriod)) {
            selectedSecurityGpPeriod = todayMonth;
        }
        sel.value = selectedSecurityGpPeriod;
    }
}

function onSecurityGatePassPeriodChange() {
    const sel = document.getElementById('gpPeriodSelect');
    if (sel) {
        selectedSecurityGpPeriod = sel.value;
    }
    filterAndRenderGatePasses();
}

function getPeriodFilteredGatePasses() {
    let list = allGatePasses;
    if (securityGpPeriodMode === 'weekly' && selectedSecurityGpPeriod) {
        const parts = selectedSecurityGpPeriod.split('_');
        if (parts.length === 2) {
            const start = parts[0];
            const end = parts[1];
            list = list.filter(p => {
                if (!p.fromDate) return false;
                return p.fromDate >= start && p.fromDate <= end;
            });
        }
    } else if (securityGpPeriodMode === 'monthly' && selectedSecurityGpPeriod) {
        list = list.filter(p => {
            if (!p.fromDate) return false;
            return p.fromDate.startsWith(selectedSecurityGpPeriod);
        });
    }
    return list;
}

function downloadSecurityGatePassCSV() {
    const list = getPeriodFilteredGatePasses();
    if (list.length === 0) {
        showToast("No gate pass records to download in this period.", "info");
        return;
    }
    let csv = "Pass ID,Student ID,Student Name,Room,Block,Reason,Departure Date,Return Date,Status\n";
    list.forEach(p => {
        const sId = p.user ? (p.user.studentId || '') : '';
        const sName = (p.user ? (p.user.fullName || '') : '').replace(/,/g, ' ');
        const rNum = (p.user && p.user.room ? p.user.room.roomNumber : '');
        const blk = (p.user && p.user.room ? p.user.room.blockName : '');
        const rsn = (p.reason || '').replace(/,/g, ' ');
        csv += `${p.id},"${sId}","${sName}","${rNum}","${blk}","${rsn}","${p.fromDate || ''}","${p.toDate || ''}","${p.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `security_gatepass_summary_${securityGpPeriodMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Gate pass CSV summary downloaded successfully!", "success");
}

function printSecurityGatePassSummary() {
    window.print();
}

function setGatePassFilter(filter, btn) {
    currentGatePassFilter = filter;
    document.querySelectorAll('.gp-filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#6c757d';
        b.style.color = '#fff';
    });
    if (!btn) {
        btn = document.querySelector(`.gp-filter-btn[data-filter="${filter}"]`);
    }
    if (btn) {
        btn.classList.add('active');
        btn.style.background = '#2ed573';
        btn.style.color = '#121212';
    }
    filterAndRenderGatePasses();
}

function filterAndRenderGatePasses() {
    const periodList = getPeriodFilteredGatePasses();

    // Update period badges
    const pTot = document.getElementById('gpPeriodTotalCount');
    if (pTot) pTot.innerText = periodList.length;
    const pApp = document.getElementById('gpPeriodApprovedCount');
    if (pApp) pApp.innerText = periodList.filter(p => p.status === 'APPROVED').length;
    const pDep = document.getElementById('gpPeriodDepartedCount');
    if (pDep) pDep.innerText = periodList.filter(p => p.status === 'DEPARTED').length;

    let filtered = periodList;
    if (currentGatePassFilter !== 'ALL') {
        filtered = filtered.filter(p => p.status === currentGatePassFilter);
    }

    const query = (document.getElementById('gatePassSearch')?.value || '').toLowerCase();
    if (query) {
        filtered = filtered.filter(p => {
            const sId = (p.user ? p.user.studentId : '').toLowerCase();
            const sName = (p.user ? p.user.fullName : '').toLowerCase();
            const reason = (p.reason || '').toLowerCase();
            const room = (p.user && p.user.room ? p.user.room.roomNumber : '').toLowerCase();
            const idStr = String(p.id);
            return sId.includes(query) || sName.includes(query) || reason.includes(query) || room.includes(query) || idStr.includes(query);
        });
    }

    renderGatePassesTable(filtered);
}

function filterGatePasses() {
    filterAndRenderGatePasses();
}

// Quick Verification on Dashboard
function quickVerifyStudentOrPass() {
    const input = document.getElementById('quickVerifyInput');
    const resultBox = document.getElementById('quickVerifyResult');
    if (!input || !resultBox) return;

    const val = input.value.trim().toLowerCase();
    if (!val) {
        showToast("Please enter a Student ID or Pass ID to verify.", "info");
        return;
    }

    resultBox.style.display = 'block';

    // Search pass first
    let matchedPass = allGatePasses.find(p => String(p.id) === val);
    let matchedStudent = null;

    if (!matchedPass) {
        // Search by student ID or name
        matchedStudent = allStudents.find(s => (s.studentId && s.studentId.toLowerCase() === val) || (s.fullName && s.fullName.toLowerCase().includes(val)));
        if (matchedStudent) {
            const studentPasses = allGatePasses.filter(p => p.user && (p.user.id === matchedStudent.id || p.user.studentId === matchedStudent.studentId));
            if (studentPasses.length > 0) {
                matchedPass = studentPasses[studentPasses.length - 1];
            }
        }
    } else {
        matchedStudent = matchedPass.user;
    }

    if (!matchedStudent && !matchedPass) {
        resultBox.innerHTML = `
            <div style="background:#fff0f3; border:1.5px solid #ff4757; border-radius:12px; padding:16px 20px; display:flex; align-items:center; gap:14px;">
                <i class="fas fa-times-circle" style="color:#ff4757; font-size:26px;"></i>
                <div>
                    <h4 style="margin:0; color:#d63031; font-size:16px;">No Resident or Pass Found</h4>
                    <p style="margin:4px 0 0 0; font-size:13.5px; color:#636e72;">No student or gate pass matched "<strong>${escapeQuote(val)}</strong>". Verify ID card spelling or register student.</p>
                </div>
            </div>
        `;
        return;
    }

    const sName = matchedStudent ? (matchedStudent.fullName || matchedStudent.studentId) : (matchedPass.user ? matchedPass.user.fullName : 'Student');
    const sId = matchedStudent ? (matchedStudent.studentId || 'N/A') : (matchedPass.user ? matchedPass.user.studentId : 'N/A');
    const roomInfo = (matchedStudent && matchedStudent.room) ? `${matchedStudent.room.roomNumber} (${matchedStudent.room.blockName})` : ((matchedPass && matchedPass.user && matchedPass.user.room) ? `${matchedPass.user.room.roomNumber} (${matchedPass.user.room.blockName})` : 'Not Allocated');

    let passStatusCard = '';
    if (matchedPass) {
        if (matchedPass.status === 'APPROVED') {
            passStatusCard = `
                <div style="background:#e8f8f0; border:1.5px solid #2ed573; border-radius:12px; padding:16px 20px; margin-top:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <span class="status-badge" style="background:#2ed573; color:#121212; font-weight:800; font-size:12.5px;"><i class="fas fa-check-circle"></i> SUB WARDEN APPROVED EXIT PASS (#${matchedPass.id})</span>
                            <div style="margin-top:8px; font-size:14px; color:#155724;">
                                <strong>Reason:</strong> ${matchedPass.reason || 'Leave'} | <strong>Departure:</strong> ${matchedPass.fromDate} &rarr; <strong>Return:</strong> ${matchedPass.toDate}
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="promptMarkGateExit(${matchedPass.id}, '${escapeQuote(sName)}', '${escapeQuote(roomInfo)}', '${escapeQuote(matchedPass.reason)}')" style="background:#2ed573; color:#121212; font-weight:700; padding:10px 18px; border-radius:8px; border:none; cursor:pointer;">
                            <i class="fas fa-walking"></i> Authorize Gate Exit
                        </button>
                    </div>
                </div>
            `;
        } else if (matchedPass.status === 'DEPARTED') {
            passStatusCard = `
                <div style="background:#f1f2f6; border:1.5px solid #2f3542; border-radius:12px; padding:16px 20px; margin-top:12px; color:#2f3542;">
                    <span class="status-badge" style="background:#2f3542; color:#fff; font-weight:800;"><i class="fas fa-walking"></i> CURRENTLY DEPARTED (Away from Campus)</span>
                    <div style="margin-top:6px; font-size:13.5px;">Pass #${matchedPass.id}: ${matchedPass.reason || 'Leave'} (${matchedPass.fromDate} to ${matchedPass.toDate}).</div>
                </div>
            `;
        } else if (matchedPass.status === 'PENDING') {
            passStatusCard = `
                <div style="background:#fff8e7; border:1.5px solid #ffa502; border-radius:12px; padding:16px 20px; margin-top:12px; color:#856404;">
                    <span class="status-badge" style="background:#ffa502; color:#fff; font-weight:800;"><i class="fas fa-clock"></i> PENDING SUB WARDEN APPROVAL</span>
                    <div style="margin-top:6px; font-size:13.5px;">Student has requested leave (Pass #${matchedPass.id}) but Sub Warden has NOT approved it yet. <strong>Do not allow exit.</strong></div>
                </div>
            `;
        } else if (matchedPass.status === 'REJECTED') {
            passStatusCard = `
                <div style="background:#fff0f3; border:1.5px solid #ff4757; border-radius:12px; padding:16px 20px; margin-top:12px; color:#721c24;">
                    <span class="status-badge" style="background:#ff4757; color:#fff; font-weight:800;"><i class="fas fa-ban"></i> LEAVE REQUEST REJECTED</span>
                    <div style="margin-top:6px; font-size:13.5px;">Sub Warden has rejected Pass #${matchedPass.id}. Student is NOT permitted to exit.</div>
                </div>
            `;
        }
    } else {
        passStatusCard = `
            <div style="background:#fff8e7; border:1.5px solid #ffa502; border-radius:12px; padding:14px 18px; margin-top:12px; color:#856404;">
                <i class="fas fa-exclamation-triangle"></i> <strong>No Active Gate Pass on File:</strong> This student currently does NOT have an approved leave pass. Student cannot leave hostel campus without Sub Warden permission.
            </div>
        `;
    }

    resultBox.innerHTML = `
        <div style="background:#f8f9fa; border:1.5px solid #e2e8f0; border-radius:14px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(sName)}&background=1e3799&color=ffffff&size=54" style="border-radius:50%; width:50px; height:50px;" alt="Avatar">
                    <div>
                        <h4 style="margin:0; font-size:17px; font-family:'Outfit', sans-serif; color:#121212;">${sName}</h4>
                        <div style="font-size:13px; color:#636e72; margin-top:2px;">ID: <strong>${sId}</strong> | Assigned Room: <strong>${roomInfo}</strong></div>
                    </div>
                </div>
                <button class="btn btn-dark btn-sm" onclick="switchSecurityTab('gatepasses')" style="padding:6px 14px; border-radius:8px; cursor:pointer;">
                    <i class="fas fa-external-link-alt"></i> View in Gate Passes
                </button>
            </div>
            ${passStatusCard}
        </div>
    `;
}

function clearQuickVerify() {
    const input = document.getElementById('quickVerifyInput');
    const resultBox = document.getElementById('quickVerifyResult');
    if (input) input.value = '';
    if (resultBox) {
        resultBox.innerHTML = '';
        resultBox.style.display = 'none';
    }
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

        const dashDuty = document.getElementById('dash-duty-status-text');
        if (todayRecord) {
            if (todayRecord.status === 'ABSENT') {
                statusBadge.innerHTML = `<span style="color:#d63031;"><i class="fas fa-exclamation-triangle"></i> <strong>Admin Marked Absence:</strong> ${todayRecord.remarks}</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#d63031; font-weight:700;"><i class="fas fa-exclamation-triangle"></i> Status: ABSENT (${todayRecord.remarks || ''})</span>`;
                btnIn.disabled = true;
            } else if (todayRecord.status === 'ON_LEAVE') {
                statusBadge.innerHTML = `<span style="color:#e67e22;"><i class="fas fa-calendar-minus"></i> <strong>Admin Marked Leave:</strong> ${todayRecord.remarks}</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#e67e22; font-weight:700;"><i class="fas fa-calendar-minus"></i> Status: ON LEAVE (${todayRecord.remarks || ''})</span>`;
                btnIn.disabled = true;
            } else {
                statusBadge.innerHTML = `<span style="color:#2ed573;"><i class="fas fa-check-circle"></i> Checked In Today at <strong>${todayRecord.checkInTime || '-'}</strong>${todayRecord.checkOutTime ? ' &bull; Checked Out at <strong>' + todayRecord.checkOutTime + '</strong>' : ' (Currently On Duty)'}</span>`;
                if (dashDuty) dashDuty.innerHTML = `<span style="color:#2ed573; font-weight:700;"><i class="fas fa-check-circle"></i> Checked In: ${todayRecord.checkInTime || '-'} ${todayRecord.checkOutTime ? '(Checked Out: ' + todayRecord.checkOutTime + ')' : '(Active Duty)'}</span>`;
                if (todayRecord.checkOutTime) {
                    btnOut.disabled = true;
                }
            }
        } else {
            statusBadge.innerHTML = `<span style="color:#636e72;"><i class="fas fa-info-circle"></i> You have not marked duty attendance for today yet.</span>`;
            if (dashDuty) dashDuty.innerHTML = `<span style="color:#636e72;"><i class="fas fa-clock"></i> Not checked in yet today. Ready for duty.</span>`;
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

    const todayDateFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayDateEl = document.getElementById('today-date-str');
    if (todayDateEl) todayDateEl.innerText = 'Date: ' + todayDateFormatted;
    const dashDuty = document.getElementById('dash-duty-status-text');
    if (dashDuty) dashDuty.innerText = 'Date: ' + todayDateFormatted + ' | Checking attendance...';

    switchSecurityTab('dashboard');
};
