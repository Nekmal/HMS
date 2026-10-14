// Student Portal Frontend Controller
// Manages student hostel room details, fee payments, complaints, and early departure gate pass requests.

const API_BASE = '/hms/api';

let currentUserId = localStorage.getItem('userId'); 

// Chart instances for Student Dashboard
let studentPaymentsChart = null;
let studentRequestsChart = null;
let myComplaintsList = [];
let myGatePassesList = [];
let allStudentNotices = [];

async function initDashboard() {
    if (!currentUserId || localStorage.getItem('userRole') !== 'STUDENT') {
        window.location.href = '/hms/'; // redirect to login
        return;
    }

    try {
        const usersRes = await fetch(`${API_BASE}/users`);
        const users = await usersRes.json();
        const student = users.find(u => u.id == currentUserId);

        if (student) {
            document.getElementById('student-name').innerText = student.fullName;
            document.getElementById('student-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName)}&background=FFD700&color=121212`;
            
            const heroNameEl = document.getElementById('hero-student-name');
            if (heroNameEl) heroNameEl.innerText = student.fullName;

            if (student.room) {
                document.getElementById('my-block').innerText = student.room.blockName;
                document.getElementById('my-room').innerText = student.room.roomNumber;
                
                const heroRoomEl = document.getElementById('hero-room-no');
                if (heroRoomEl) heroRoomEl.innerText = student.room.roomNumber;
                const heroBlockEl = document.getElementById('hero-block-name');
                if (heroBlockEl) heroBlockEl.innerText = student.room.blockName;
            } else {
                document.getElementById('my-block').innerText = 'Not Allocated';
                document.getElementById('my-room').innerText = 'Not Allocated';
                const heroRoomEl = document.getElementById('hero-room-no');
                if (heroRoomEl) heroRoomEl.innerText = 'Not Allocated';
                const heroBlockEl = document.getElementById('hero-block-name');
                if (heroBlockEl) heroBlockEl.innerText = 'Not Allocated';
            }

            loadPayments();
            loadComplaints();
            loadGatePasses();
            loadNotices();
            loadRoommates(users, student);
        }
    } catch (e) {
        console.error("Error initializing dashboard", e);
    }
}

function loadRoommates(users, student) {
    const tbody = document.getElementById('student-roommates-summary-tbody');
    const badge = document.getElementById('roommate-room-badge');
    if (!tbody) return;

    if (!student.room) {
        if (badge) badge.innerText = 'Not Allocated';
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">You are not allocated to a hostel room yet.</td></tr>';
        return;
    }

    if (badge) badge.innerText = `Room ${student.room.roomNumber} (${student.room.blockName})`;

    const roommates = users.filter(u => u.role === 'STUDENT' && u.room && u.room.id === student.room.id);
    tbody.innerHTML = '';
    if (roommates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No roommates registered in this room.</td></tr>';
    } else {
        roommates.forEach(rm => {
            const isMe = rm.id == student.id;
            tbody.innerHTML += `
                <tr style="${isMe ? 'background: rgba(255, 215, 0, 0.08);' : ''}">
                    <td>
                        <strong>${rm.fullName}</strong> ${isMe ? '<span style="font-size:11px; background:#FFD700; color:#121212; padding:2px 6px; border-radius:4px; margin-left:4px; font-weight:700;">You</span>' : ''}
                    </td>
                    <td><code>${rm.studentId}</code></td>
                    <td>${rm.phone || '-'}</td>
                    <td><span class="status allocated">Active Resident</span></td>
                </tr>
            `;
        });
    }
}

async function loadPayments() {
    if (!currentUserId) return;
    
    try {
        const res = await fetch(`${API_BASE}/payments`);
        const allPayments = await res.json();
        
        // Filter payments for this user
        const myPayments = allPayments.filter(p => p.user && p.user.id == currentUserId);
        
        let totalPaid = 0;
        const tbody = document.getElementById('payments-table-body');
        if (tbody) tbody.innerHTML = '';
        
        myPayments.forEach(payment => {
            totalPaid += payment.amount;
            if (tbody) {
                tbody.innerHTML += `
                    <tr>
                        <td>${payment.invoiceNo}</td>
                        <td>${payment.month}</td>
                        <td>Rs. ${payment.amount.toFixed(2)}</td>
                        <td>${payment.paymentDate || new Date().toISOString().split('T')[0]}</td>
                        <td><span class="status paid">${payment.status}</span></td>
                    </tr>
                `;
            }
        });
        
        const totalPaidStr = `Rs. ${totalPaid.toFixed(2)}`;
        document.getElementById('total-paid').innerText = totalPaidStr;
        const heroPaidEl = document.getElementById('hero-total-paid');
        if (heroPaidEl) heroPaidEl.innerText = totalPaidStr;

        // Render Payments Column Graph
        renderStudentPaymentsChart(myPayments);

    } catch (e) {
        console.error("Error loading payments", e);
    }
}

function renderStudentPaymentsChart(myPayments) {
    const canvas = document.getElementById('studentPaymentsBarChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (studentPaymentsChart) {
        studentPaymentsChart.destroy();
    }

    let labels = myPayments.map(p => p.month || 'Fee');
    let data = myPayments.map(p => p.amount);

    if (labels.length === 0) {
        labels = ['January', 'February', 'March'];
        data = [0, 0, 0];
    }

    studentPaymentsChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Paid Amount (Rs)',
                data: data,
                backgroundColor: '#FFD700',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Outfit', weight: '600' } }
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

async function loadComplaints() {
    if (!currentUserId) return;
    
    try {
        const res = await fetch(`${API_BASE}/complaints/user/${currentUserId}`);
        myComplaintsList = await res.json();
        
        const tbody = document.getElementById('complaints-table-body');
        const summaryTbody = document.getElementById('student-complaints-summary-tbody');
        if (tbody) tbody.innerHTML = '';
        if (summaryTbody) summaryTbody.innerHTML = '';

        const statCompEl = document.getElementById('student-stat-complaints');
        const activeComplaints = myComplaintsList.filter(c => c.status !== 'RESOLVED');
        if (statCompEl) statCompEl.innerText = activeComplaints.length;

        if (myComplaintsList.length === 0) {
            if (summaryTbody) summaryTbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">No complaints filed. Everything is in order!</td></tr>';
        }

        myComplaintsList.forEach(c => {
            let statusClass = c.status === 'RESOLVED' ? 'paid' : (c.status === 'IN_PROGRESS' ? 'allocated' : 'pending');
            if (tbody) {
                tbody.innerHTML += `
                    <tr>
                        <td>${c.createdAt}</td>
                        <td>${c.description}</td>
                        <td><span class="status ${statusClass}">${c.status}</span></td>
                    </tr>
                `;
            }
        });

        myComplaintsList.slice(-5).reverse().forEach(c => {
            let statusClass = c.status === 'RESOLVED' ? 'paid' : (c.status === 'IN_PROGRESS' ? 'allocated' : 'pending');
            if (summaryTbody) {
                summaryTbody.innerHTML += `
                    <tr>
                        <td>${c.createdAt || 'Recent'}</td>
                        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.description}">${c.description}</td>
                        <td><span class="status ${statusClass}">${c.status}</span></td>
                    </tr>
                `;
            }
        });

        updateStudentRequestsSummary();
    } catch (e) {
        console.error("Error loading complaints", e);
    }
}

function onReasonSelectChange() {
    const sel = document.getElementById('gpReasonSelect');
    const input = document.getElementById('gpReason');
    if (!sel || !input) return;
    if (sel.value === 'Other') {
        input.value = '';
        input.placeholder = 'Please describe your reason for leaving...';
        input.focus();
    } else {
        input.value = sel.value;
    }
}

async function loadGatePasses() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_BASE}/gatepasses/user/${currentUserId}`);
        myGatePassesList = await res.json();
        
        let approvedCount = 0;
        let pendingCount = 0;
        let departedCount = 0;

        const tbody1 = document.getElementById('gatepass-table-body');
        const tbody2 = document.getElementById('leave-table-body');
        if (tbody1) tbody1.innerHTML = '';
        if (tbody2) tbody2.innerHTML = '';

        if (myGatePassesList.length === 0) {
            const emptyHtml = '<tr><td colspan="6" style="text-align:center; color:#888; padding:25px;">No early home departure requests found. Click "+ Request Early Home Departure" to create one.</td></tr>';
            if (tbody1) tbody1.innerHTML = emptyHtml;
            if (tbody2) tbody2.innerHTML = emptyHtml;
        } else {
            myGatePassesList.forEach(p => {
                let statusBadge = '';
                let gateClearance = '';

                if (p.status === 'APPROVED') {
                    approvedCount++;
                    statusBadge = '<span class="status-badge" style="background: rgba(46, 213, 115, 0.15); color: #2ed573; border: 1px solid rgba(46, 213, 115, 0.3); font-weight: 700;"><i class="fas fa-check-circle"></i> APPROVED BY SUB WARDEN</span>';
                    gateClearance = '<span style="color:#2ed573; font-weight:700;"><i class="fas fa-id-card"></i> Ready to Exit Gate</span>';
                } else if (p.status === 'REJECTED') {
                    statusBadge = '<span class="status-badge" style="background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); font-weight: 700;"><i class="fas fa-times-circle"></i> REJECTED BY SUB WARDEN</span>';
                    gateClearance = '<span style="color:#ff4757;"><i class="fas fa-ban"></i> Exit Not Permitted</span>';
                } else if (p.status === 'DEPARTED') {
                    departedCount++;
                    statusBadge = '<span class="status-badge" style="background: rgba(47, 53, 66, 0.15); color: #2f3542; border: 1px solid rgba(47, 53, 66, 0.3); font-weight: 700;"><i class="fas fa-walking"></i> DEPARTED (At Gate)</span>';
                    gateClearance = '<span style="color:#3742fa; font-weight:600;"><i class="fas fa-check-double"></i> Security Checked Out</span>';
                } else {
                    pendingCount++;
                    statusBadge = '<span class="status-badge" style="background: rgba(255, 165, 2, 0.15); color: #ffa502; border: 1px solid rgba(255, 165, 2, 0.3); font-weight: 700;"><i class="fas fa-hourglass-half"></i> PENDING SUB WARDEN REVIEW</span>';
                    gateClearance = '<span style="color:#ffa502; font-size:12px;"><i class="fas fa-clock"></i> Awaiting Approval</span>';
                }

                const rowHtml = `
                    <tr>
                        <td><strong>#${p.id}</strong></td>
                        <td><strong>${p.reason}</strong></td>
                        <td><span style="color: #1e3799; font-weight: 600;"><i class="fas fa-calendar-day"></i> ${p.fromDate}</span></td>
                        <td><span style="color: #57606f;"><i class="fas fa-calendar-check"></i> ${p.toDate}</span></td>
                        <td>${statusBadge}</td>
                        <td>${gateClearance}</td>
                    </tr>
                `;

                if (tbody1) tbody1.innerHTML += `
                    <tr>
                        <td>${p.reason}</td>
                        <td>${p.fromDate}</td>
                        <td>${p.toDate}</td>
                        <td>${statusBadge}</td>
                        <td>${gateClearance}</td>
                    </tr>
                `;
                if (tbody2) tbody2.innerHTML += rowHtml;
            });
        }

        // Update leave summary cards
        const elApp = document.getElementById('student-stat-approved-leaves');
        if (elApp) elApp.innerText = approvedCount;
        const elPen = document.getElementById('student-stat-pending-leaves');
        if (elPen) elPen.innerText = pendingCount;
        const elDep = document.getElementById('student-stat-departed-leaves');
        if (elDep) elDep.innerText = departedCount;

        const elPasses = document.getElementById('student-stat-passes');
        if (elPasses) elPasses.innerText = `${approvedCount + pendingCount} (${departedCount} Away)`;

        updateStudentRequestsSummary();
    } catch (e) {
        console.error("Error loading gate passes", e);
    }
}

function updateStudentRequestsSummary() {
    const totalRequests = myComplaintsList.length + myGatePassesList.length;
    const reqEl = document.getElementById('my-requests');
    if (reqEl) reqEl.innerText = totalRequests;

    const canvas = document.getElementById('studentRequestsPieChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (studentRequestsChart) {
        studentRequestsChart.destroy();
    }

    let approvedCount = 0;
    let pendingCount = 0;

    myComplaintsList.forEach(c => {
        if (c.status === 'RESOLVED') approvedCount++;
        else pendingCount++;
    });

    myGatePassesList.forEach(p => {
        if (p.status === 'APPROVED') approvedCount++;
        else pendingCount++;
    });

    if (approvedCount === 0 && pendingCount === 0) {
        approvedCount = 1; // default showcase slice
    }

    studentRequestsChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Approved / Resolved', 'Pending / In Progress'],
            datasets: [{
                data: [approvedCount, pendingCount],
                backgroundColor: ['#2ed573', '#ffa502'],
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
                    labels: { font: { family: 'Outfit', weight: '600' }, boxWidth: 14 }
                }
            },
            cutout: '65%'
        }
    });
}

async function loadNotices() {
    try {
        const res = await fetch(`${API_BASE}/notices`);
        if (!res.ok) throw new Error('Failed to load notices');
        allStudentNotices = await res.json();
        
        renderStudentDashboardNotices(allStudentNotices);
        renderStudentAllNotices(allStudentNotices);
    } catch (e) {
        console.error("Error loading notices", e);
        const container = document.getElementById('notices-container');
        if (container) {
            container.innerHTML = '<p style="color:#ff4757; font-size:14px;"><i class="fas fa-exclamation-circle"></i> Error loading notices from server.</p>';
        }
    }
}

function renderStudentDashboardNotices(notices) {
    const container = document.getElementById('notices-container');
    const badge = document.getElementById('notices-count-badge');
    if (badge) badge.innerText = `${notices.length} Active`;

    if (!container) return;

    if (!notices || notices.length === 0) {
        container.innerHTML = '<p style="color:#777; font-size:14px; text-align: center; padding: 15px;">No new notices published.</p>';
        return;
    }

    // Display the 4 most recent notices on dashboard widget
    const recentNotices = notices.slice(0, 4);
    let html = '';
    recentNotices.forEach(n => {
        html += `
            <div style="padding: 12px 14px; background: #f8f9fa; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #FFD700; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; transition: background 0.2s;" onmouseover="this.style.background='#f1f2f6'" onmouseout="this.style.background='#f8f9fa'">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #121212; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-bullhorn" style="color: #f39c12; font-size: 13px;"></i>
                        <span>${n.title}</span>
                    </div>
                    <div style="font-size: 13px; color: #57606f; line-height: 1.4;">${n.content}</div>
                </div>
                <div style="white-space: nowrap; font-size: 11px; color: #747d8c; background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #e1e2e6; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    <i class="fas fa-calendar-alt"></i> ${n.datePosted || 'Recent'}
                </div>
            </div>
        `;
    });

    if (notices.length > 4) {
        html += `
            <div style="text-align: center; padding-top: 6px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="showSection('notices-section', document.getElementById('sidebar-menu-notices'))" style="font-size: 12px; padding: 6px 16px; border-radius: 20px; font-weight: 600;">
                    <i class="fas fa-chevron-down"></i> View All ${notices.length} Notices
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderStudentAllNotices(notices) {
    const grid = document.getElementById('student-all-notices-grid');
    const totalStat = document.getElementById('student-notices-total-stat');
    const latestDateStat = document.getElementById('student-notices-latest-date');

    if (totalStat) totalStat.innerText = `${allStudentNotices.length} Bulletins`;
    if (latestDateStat) {
        latestDateStat.innerText = allStudentNotices.length > 0 && allStudentNotices[0].datePosted ? allStudentNotices[0].datePosted : 'Today';
    }

    if (!grid) return;

    if (!notices || notices.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: #ffffff; border-radius: 12px; border: 1px dashed #ced6e0;">
                <i class="fas fa-search" style="font-size: 36px; color: #f39c12; margin-bottom: 12px; display: block;"></i>
                <h3 style="color: #2f3542; margin-bottom: 6px;">No notices match your search</h3>
                <p style="color: #747d8c; font-size: 14px;">Try searching with different keywords or clear the search input.</p>
            </div>
        `;
        return;
    }

    let html = '';
    notices.forEach(n => {
        const titleLower = (n.title || '').toLowerCase();
        let iconClass = 'fa-bullhorn';
        let badgeColor = '#f39c12';
        let badgeBg = 'rgba(243, 156, 18, 0.12)';
        let categoryName = 'General Notice';

        if (titleLower.includes('fee') || titleLower.includes('payment') || titleLower.includes('invoice')) {
            iconClass = 'fa-file-invoice-dollar';
            badgeColor = '#2ed573';
            badgeBg = 'rgba(46, 213, 115, 0.12)';
            categoryName = 'Hostel Fees';
        } else if (titleLower.includes('maintenance') || titleLower.includes('water') || titleLower.includes('repair')) {
            iconClass = 'fa-tools';
            badgeColor = '#e67e22';
            badgeBg = 'rgba(230, 126, 34, 0.12)';
            categoryName = 'Maintenance';
        } else if (titleLower.includes('curfew') || titleLower.includes('gate') || titleLower.includes('action')) {
            iconClass = 'fa-shield-alt';
            badgeColor = '#ff4757';
            badgeBg = 'rgba(255, 71, 87, 0.12)';
            categoryName = 'Rules & Security';
        } else if (titleLower.includes('sports') || titleLower.includes('meeting') || titleLower.includes('seminar') || titleLower.includes('campaign')) {
            iconClass = 'fa-users';
            badgeColor = '#3742fa';
            badgeBg = 'rgba(55, 66, 250, 0.12)';
            categoryName = 'Events & Activities';
        }

        html += `
            <div class="card" style="margin-bottom: 0; padding: 22px; border-radius: 14px; border: 1px solid #edf2f7; box-shadow: 0 4px 14px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 22px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 14px rgba(0,0,0,0.05)';">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas ${iconClass}"></i> ${categoryName}
                        </span>
                        <span style="font-size: 12px; color: #747d8c; background: #f8f9fa; border: 1px solid #e1e2e6; padding: 4px 9px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                            <i class="fas fa-calendar-alt"></i> ${n.datePosted || 'Recent'}
                        </span>
                    </div>
                    <h3 style="font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: #121212; margin-bottom: 10px; line-height: 1.4;">${n.title}</h3>
                    <p style="color: #57606f; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">${n.content}</p>
                </div>
                <div style="padding-top: 14px; border-top: 1px solid #f1f2f6; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #2ed573; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-check-circle"></i> Sub Warden Official
                    </span>
                    <span style="font-size: 11px; color: #a4b0be; font-weight: 600;">#NTC-${n.id}</span>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function searchStudentNotices() {
    const input = document.getElementById('studentNoticeSearchInput');
    const query = input ? input.value.trim().toLowerCase() : '';
    
    if (!query) {
        renderStudentAllNotices(allStudentNotices);
        return;
    }

    const filtered = allStudentNotices.filter(n => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        const date = (n.datePosted || '').toLowerCase();
        return title.includes(query) || content.includes(query) || date.includes(query);
    });

    renderStudentAllNotices(filtered);
}

// Modal Logic
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Submit Payment
async function submitPayment(event) {
    event.preventDefault();
    if (!currentUserId) {
        alert("No user logged in to make payment!");
        return;
    }

    const payment = {
        invoiceNo: 'INV-' + Math.floor(1000 + Math.random() * 9000),
        amount: parseFloat(document.getElementById('amount').value),
        month: document.getElementById('month').value,
        status: 'PAID',
        paymentDate: new Date().toISOString().split('T')[0],
        user: { id: currentUserId }
    };

    try {
        await fetch(`${API_BASE}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment)
        });

        closeModal('paymentModal');
        document.getElementById('paymentForm').reset();
        loadPayments(); // Refresh table
    } catch (e) {
        console.error("Error submitting payment", e);
    }
}

// Submit Complaint
async function submitComplaint(event) {
    event.preventDefault();
    if (!currentUserId) return;

    const complaint = {
        description: document.getElementById('complaintDesc').value,
        user: { id: currentUserId }
    };

    try {
        await fetch(`${API_BASE}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complaint)
        });

        closeModal('complaintModal');
        document.getElementById('complaintForm').reset();
        loadComplaints(); // Refresh table
    } catch (e) {
        console.error("Error submitting complaint", e);
    }
}

// Submit Gate Pass
async function submitGatePass(event) {
    event.preventDefault();
    if (!currentUserId) return;

    let reason = document.getElementById('gpReason').value;
    const fromDate = document.getElementById('gpFromDate').value;
    const toDate = document.getElementById('gpToDate').value;

    if (!reason || !fromDate || !toDate) {
        showStudentToast("Please fill all required departure details.", "error");
        return;
    }

    const pass = {
        reason: reason,
        fromDate: fromDate,
        toDate: toDate,
        user: { id: parseInt(currentUserId) }
    };

    try {
        const res = await fetch(`${API_BASE}/gatepasses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pass)
        });

        if (res.ok) {
            closeModal('gatePassModal');
            document.getElementById('gatePassForm').reset();
            showStudentToast("Early home departure request submitted! Sent to Sub Warden for review.", "success");
            await loadGatePasses();
        } else {
            showStudentToast("Failed to submit request.", "error");
        }
    } catch (e) {
        console.error("Error submitting gate pass", e);
        showStudentToast("Error connecting to server.", "error");
    }
}

function printGatePass(id) {
    showStudentToast("Gate Pass #" + id + " verified and ready for download.", "success");
}

function showStudentToast(message, type = 'info') {
    let container = document.getElementById('studentToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'studentToastContainer';
        container.style.cssText = 'position:fixed; bottom:25px; right:25px; z-index:99999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    toast.style.cssText = `
        background: ${isSuccess ? '#2ed573' : '#ff4757'};
        color: ${isSuccess ? '#121212' : '#ffffff'};
        font-weight: 700;
        padding: 12px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        display: flex;
        align-items: center;
        gap: 10px;
        pointer-events: auto;
    `;
    toast.innerHTML = `
        <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
        <button style="background:transparent; border:none; color:inherit; font-weight:800; cursor:pointer; margin-left:10px;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function logout() {
    localStorage.clear();
    window.location.href = '/hms/';
}

// Initial Load
window.onload = () => {
    initDashboard();
};
