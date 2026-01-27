
const API_URL = "";
const machineList = document.getElementById('machineList');
const toastEl = document.getElementById('toast');

// Global state for wake modal
let selectedMachineId = null;

// Utility: Show Toast
function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.style.backgroundColor = isError ? 'var(--danger-color)' : 'var(--card-bg)';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Fetch Machines
async function fetchMachines() {
    try {
        const res = await fetch(`${API_URL}/machines`);
        const machines = await res.json();
        renderMachines(machines);
    } catch (e) {
        showToast('Failed to load machines', true);
    }
}

// Render Machines
function renderMachines(machines) {
    machineList.innerHTML = '';
    if (machines.length === 0) {
        machineList.innerHTML = '<p style="text-align:center; color: #94a3b8;">No machines found.</p>';
        return;
    }

    const isAdmin = window.location.pathname === '/admin' || window.location.pathname.includes('admin.html');

    machines.forEach(m => {
        const div = document.createElement('div');
        div.className = 'machine-item';

        if (isAdmin) {
            div.innerHTML = `
                <div class="machine-info">
                    <div class="machine-name">${m.name}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">ID: ${m.id}</div> 
                </div>
                <button class="btn btn-danger" onclick="deleteMachine(${m.id})">Delete</button>
            `;
        } else {
            div.innerHTML = `
                <div class="machine-name">${m.name}</div>
                <button class="btn" onclick="openWakeModal(${m.id}, '${m.name}')">Wake</button>
            `;
        }
        machineList.appendChild(div);
    });
}

// Admin: Add Machine
const addForm = document.getElementById('addMachineForm');
if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('machineName').value;
        const mac = document.getElementById('machineMac').value;
        const password = document.getElementById('machinePass').value;

        try {
            const res = await fetch(`${API_URL}/admin/machines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mac_address: mac, password })
            });

            if (res.ok) {
                showToast('Machine added successfully');
                addForm.reset();
                fetchMachines();
            } else {
                showToast('Failed to add machine', true);
            }
        } catch (e) {
            showToast('Error adding machine', true);
        }
    });
}

// Admin: Delete Machine
async function deleteMachine(id) {
    if (!confirm('Are you sure you want to remove this machine?')) return;
    try {
        const res = await fetch(`${API_URL}/admin/machines/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Machine removed');
            fetchMachines();
        } else {
            showToast('Failed to remove machine', true);
        }
    } catch (e) {
        showToast('Error removing machine', true);
    }
}

// Wake: Open Modal
function openWakeModal(id, name) {
    selectedMachineId = id;
    document.getElementById('modalTitle').textContent = `Wake ${name}`;
    document.getElementById('wakeModal').classList.add('active');
    document.getElementById('wakeModal').style.pointerEvents = 'all'; // Fix
    document.getElementById('wakePassword').value = '';
    document.getElementById('wakePassword').focus();
}

function closeModal() {
    document.getElementById('wakeModal').classList.remove('active');
    selectedMachineId = null;
}

// Wake: Confirm
async function confirmWake() {
    if (!selectedMachineId) return;
    const password = document.getElementById('wakePassword').value;

    try {
        const res = await fetch(`${API_URL}/wake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machine_id: selectedMachineId, password })
        });

        if (res.ok) {
            showToast('Magic packet sent!');
            closeModal();
        } else if (res.status === 429) {
            showToast('Too many attempts! Please wait.', true);
        } else if (res.status === 401) {
            showToast('Incorrect password', true);
        } else {
            showToast('Failed to wake machine', true);
        }
    } catch (e) {
        showToast('Error sending wake request', true);
    }
}

// Initial Load
fetchMachines();
