// Public dashboard functionality
const API_URL = "";
let machinesCache = [];

async function fetchMachines() {
    try {
        const res = await fetch(`${API_URL}/machines`);
        const machines = await res.json();
        machinesCache = machines;
        renderMachines(machines);
    } catch (e) {
        console.error("Failed to fetch machines", e);
    }
}

function renderMachines(machines) {
    const machineList = document.getElementById('machineList');
    if (!machineList) return;

    machineList.innerHTML = '';

    if (machines.length === 0) {
        machineList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>No devices found.</p>
            </div>`;
        return;
    }

    const grouped = machines.reduce((acc, m) => {
        const cat = m.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {});

    Object.keys(grouped).sort().forEach(category => {
        const header = document.createElement('div');
        header.className = 'bg-gray-50/50 dark:bg-gray-800/50 px-6 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-100 dark:border-gray-700';
        header.textContent = category;
        machineList.appendChild(header);

        grouped[category].forEach(m => {
            const div = document.createElement('div');
            div.className = 'group flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition border-b border-gray-100 dark:border-gray-800 last:border-b-0';

            const statusColor = m.online === null ? 'bg-gray-400' : m.online ? 'bg-green-500' : 'bg-red-500';
            const statusText = m.online === null ? 'Not yet pinged' : m.online ? 'Online' : 'Offline';

            const pingBtn = `<button onclick="pingMachine(${m.id})" class="text-gray-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition mr-2" title="Ping">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
            </button>`;

            let actionsHtml = '';
            if (m.wol_enabled) {
                actionsHtml = `
                    <div class="flex items-center">
                        ${pingBtn}
                        <button class="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-medium text-sm shadow-sm" onclick="openWakeModal(${m.id}, '${m.name}')">Wake</button>
                    </div>
                `;
            } else {
                actionsHtml = `<div class="flex items-center">${pingBtn}<span class="text-sm text-gray-400 italic">Monitoring Only</span></div>`;
            }

            div.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="relative">
                        <div class="h-2.5 w-2.5 rounded-full ${statusColor}" title="${statusText}"></div>
                        ${m.online ? `<div class="absolute top-0 left-0 h-2.5 w-2.5 rounded-full ${statusColor} animate-ping opacity-75"></div>` : ''}
                    </div>
                    <div>
                        <h3 class="font-medium text-sm text-gray-900 dark:text-white">${m.name}</h3>
                        <p class="text-xs text-gray-500 font-mono tracking-wide">${m.mac}</p>
                    </div>
                </div>
                ${actionsHtml}
            `;
            machineList.appendChild(div);
        });
    });
}

let wakeTargetId = null;
let wakeTargetName = '';

function openWakeModal(id, name) {
    wakeTargetId = id;
    wakeTargetName = name;
    const wakeModal = document.getElementById('wakeModal');
    const wakeDeviceName = document.getElementById('wakeDeviceName');
    const wakePassword = document.getElementById('wakePassword');

    if (wakeModal && wakeDeviceName) {
        wakeDeviceName.textContent = name;
        if (wakePassword) wakePassword.value = '';
        wakeModal.classList.remove('hidden');
    } else {
        const password = prompt(`Enter Wake password for ${name} (if any):`, "");
        if (password !== null) {
            doWakeMachine(id, name, password);
        }
    }
}

function closeWakeModal() {
    document.getElementById('wakeModal').classList.add('hidden');
    wakeTargetId = null;
}

async function sendWakePacket() {
    const password = document.getElementById('wakePassword').value;
    closeWakeModal();
    await doWakeMachine(wakeTargetId, wakeTargetName, password);
}

async function doWakeMachine(id, name, password) {
    try {
        const res = await fetch(`${API_URL}/wake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ machine_id: id, password: password })
        });

        if (res.ok) {
            showToast(`Magic packet sent to ${name}!`);
        } else if (res.status === 401) {
            showToast('Incorrect password', true);
        } else {
            showToast('Failed to wake device', true);
        }
    } catch (e) {
        showToast('Error sending wake request', true);
    }
}

async function pingMachine(id, silent = false) {
    if (!silent) showToast('Pinging...');
    try {
        const res = await fetch(`${API_URL}/ping/${id}`, { method: 'POST' });
        const data = await res.json();
        if (!silent) {
            if (data.online) {
                showToast(`Device is online (${data.ip})`);
            } else if (data.error) {
                showToast(`Offline: ${data.error}`, true);
            } else {
                showToast('Device is offline', true);
            }
        }
        fetchMachines();
    } catch (e) {
        if (!silent) showToast('Ping failed', true);
    }
}

async function autoPingAll() {
    if (machinesCache.length === 0) return;

    for (const machine of machinesCache) {
        await pingMachine(machine.id, true);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

fetchMachines();
setInterval(fetchMachines, 5000);
setInterval(autoPingAll, 30000);
