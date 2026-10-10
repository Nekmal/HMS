const API_BASE = '/hms/api';

let currentUserId = localStorage.getItem('userId'); 

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
            
            if (student.room) {
                document.getElementById('my-block').innerText = student.room.blockName;
                document.getElementById('my-room').innerText = student.room.roomNumber;
            } else {
                document.getElementById('my-block').innerText = 'Not Allocated';
                document.getElementById('my-room').innerText = 'Not Allocated';
            }

            loadPayments();
            loadComplaints();
            loadGatePasses();
            loadNotices();
        }
    } catch (e) {
        console.error("Error initializing dashboard", e);
    }
}

async function loadPayments() {
    if (!currentUserId) return;
    
    try {
        const res = await fetch(`${API_BASE}/payments`);
        const allPayments = await res.json();
        
        // Filter payments for this user (Ideally done via a dedicated backend endpoint)
        const myPayments = allPayments.filter(p => p.user && p.user.id === currentUserId);
        
        let totalPaid = 0;
        const tbody = document.getElementById('payments-table-body');
        tbody.innerHTML = '';
        
        myPayments.forEach(payment => {
            totalPaid += payment.amount;
            tbody.innerHTML += `
                <tr>
                    <td>${payment.invoiceNo}</td>
                    <td>${payment.month}</td>
                    <td>Rs. ${payment.amount.toFixed(2)}</td>
                    <td>${payment.paymentDate || new Date().toISOString().split('T')[0]}</td>
                    <td><span class="status paid">${payment.status}</span></td>
                </tr>
            `;
        });
        
        document.getElementById('total-paid').innerText = `Rs. ${totalPaid.toFixed(2)}`;

    } catch (e) {
        console.error("Error loading payments", e);
    }
}

async function loadComplaints() {
    if (!currentUserId) return;
    
    try {
        const res = await fetch(`${API_BASE}/complaints/user/${currentUserId}`);
        const myComplaints = await res.json();
        
        const tbody = document.getElementById('complaints-table-body');
        tbody.innerHTML = '';
        
        myComplaints.forEach(c => {
            let statusClass = c.status === 'RESOLVED' ? 'paid' : 'pending';
            tbody.innerHTML += `
                <tr>
                    <td>${c.createdAt}</td>
                    <td>${c.description}</td>
                    <td><span class="status ${statusClass}">${c.status}</span></td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error loading complaints", e);
    }
}

async function loadGatePasses() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_BASE}/gatepasses/user/${currentUserId}`);
        const passes = await res.json();
        
        const tbody = document.getElementById('gatepass-table-body');
        tbody.innerHTML = '';
        
        passes.forEach(p => {
            let statusClass = p.status === 'APPROVED' ? 'paid' : (p.status === 'REJECTED' ? 'pending' : 'pending');
            let actionBtn = p.status === 'APPROVED' ? `<button class="btn btn-primary" style="padding:5px 10px; font-size:12px;" onclick="printGatePass(${p.id})"><i class="fas fa-print"></i> Print</button>` : '-';
            tbody.innerHTML += `
                <tr>
                    <td>${p.reason}</td>
                    <td>${p.fromDate}</td>
                    <td>${p.toDate}</td>
                    <td><span class="status ${statusClass}">${p.status}</span></td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error loading gate passes", e);
    }
}

async function loadNotices() {
    try {
        const res = await fetch(`${API_BASE}/notices`);
        const notices = await res.json();
        const container = document.getElementById('notices-container');
        if (!container) return;
        
        if (notices.length === 0) {
            container.innerHTML = '<p style="color:#777; font-size:14px;">No new notices.</p>';
            return;
        }

        container.innerHTML = '';
        notices.forEach(n => {
            container.innerHTML += `
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                    <strong style="color: #121212;">${n.title}</strong> <span style="font-size: 12px; color: #888;">(${n.datePosted})</span>
                    <p style="margin: 5px 0 0; font-size: 14px; color: #555;">${n.content}</p>
                </div>
            `;
        });
    } catch (e) {
        console.error("Error loading notices", e);
    }
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

    const pass = {
        reason: document.getElementById('gpReason').value,
        fromDate: document.getElementById('gpFromDate').value,
        toDate: document.getElementById('gpToDate').value,
        user: { id: currentUserId }
    };

    try {
        await fetch(`${API_BASE}/gatepasses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pass)
        });

        closeModal('gatePassModal');
        document.getElementById('gatePassForm').reset();
        loadGatePasses(); // Refresh table
    } catch (e) {
        console.error("Error submitting gate pass", e);
    }
}

function printGatePass(id) {
    alert("Printing Gate Pass ID: " + id + "\n(This feature can be extended to open a proper PDF!)");
}

function logout() {
    localStorage.clear();
    window.location.href = '/hms/';
}

// Initial Load
window.onload = () => {
    initDashboard();
};
