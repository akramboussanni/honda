const originalRenderMachines = renderMachines;
renderMachines = function (machines) {
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

            const wolBtn = m.wol_enabled ? `
                <button onclick="openWakeModal(${m.id}, '${m.name}')" 
                    class="text-xs bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-3 py-1.5 rounded-md transition font-medium shadow-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                    </svg>
                    Wake
                </button>
            ` : `<span class="text-xs text-gray-400 italic mr-2">WOL Off</span>`;

            const actionsHtml = `
                <div class="flex items-center space-x-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                    <button onclick="pingMachine(${m.id})" class="text-xs text-gray-500 hover:text-blue-600 px-2 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" title="Ping">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                    </button>
                    ${wolBtn}
                    <button onclick="openEditModal(machinesCache.find(x=>x.id===${m.id}))" class="text-gray-400 hover:text-blue-600 transition p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                    <button onclick="deleteMachine(${m.id})" 
                        class="text-gray-400 hover:text-red-600 transition p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            `;

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
};

async function scanNetwork() {
    const btn = document.getElementById('scanBtn');
    const resultDiv = document.getElementById('discoveryResults');
    const subnetInput = document.getElementById('subnetInput');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Scanning...';
    }

    if (resultDiv) resultDiv.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm animate-pulse">Scanning network...</div>';

    const subnet = subnetInput ? subnetInput.value : '192.168.1.0/24';

    try {
        const url = `${API_URL}/admin/discover?subnet=${encodeURIComponent(subnet)}`;
        const res = await fetch(url);
        const devices = await res.json();
        renderDiscovery(devices);
    } catch (e) {
        showToast('Scan failed', true);
        if (resultDiv) resultDiv.innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Scan failed.</div>';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Scan';
        }
    }
}

function renderDiscovery(devices) {
    const resultDiv = document.getElementById('discoveryResults');
    if (!resultDiv) return;
    resultDiv.innerHTML = '';

    if (!devices || devices.length === 0) {
        resultDiv.innerHTML = '<div class="text-center py-6 text-gray-400 text-sm">No devices found.</div>';
        return;
    }

    devices.forEach(d => {
        const div = document.createElement('div');

        const isYou = d.is_you;
        const borderClass = isYou
            ? 'border-2 border-green-500 dark:border-green-400'
            : 'border border-gray-100 dark:border-gray-700 hover:border-black dark:hover:border-white';

        div.className = `bg-white dark:bg-gray-800 ${borderClass} rounded-lg p-3 flex justify-between items-center group transition cursor-pointer shadow-sm`;
        div.onclick = () => addDiscoveredMachine(d.ip, d.mac, d.name);

        const youBadge = isYou ? `<span class="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Your Device</span>` : '';

        div.innerHTML = `
            <div>
                <div class="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center">${d.name !== d.ip ? d.name : d.ip}${youBadge}</div>
                <div class="text-xs text-gray-500 font-mono">${d.mac}</div> 
            </div>
            <div class="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
            </div>
        `;
        resultDiv.appendChild(div);
    });
}

function addDiscoveredMachine(ip, mac, name) {
    const nameInput = document.getElementById('machineName');
    const macInput = document.getElementById('machineMac');
    const ipInput = document.getElementById('machineIp');
    const categorySelect = document.getElementById('machineCategory');
    const passInput = document.getElementById('machinePassword');
    const wolCheckbox = document.getElementById('machineWolEnabled');

    if (nameInput) nameInput.value = name || `Device ${ip}`;
    if (nameInput) nameInput.placeholder = '';
    if (macInput) macInput.value = mac;
    if (ipInput) {
        ipInput.value = ip;
        ipInput.readOnly = true;
    }
    if (categorySelect) categorySelect.value = 'Uncategorized';
    if (passInput) passInput.value = '';
    if (wolCheckbox) wolCheckbox.checked = true;

    switchTab('devices');
    showToast('Device info filled! Click "Add Device" to save.');
}

async function addMachine() {
    const name = document.getElementById('machineName').value.trim();
    const mac = document.getElementById('machineMac').value.trim();
    const ip = document.getElementById('machineIp').value.trim();
    const category = document.getElementById('machineCategory').value;
    const password = document.getElementById('machinePassword').value;
    const wol_enabled = document.getElementById('machineWolEnabled').checked;

    if (!name || !mac) {
        showToast('Name and MAC are required', true);
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/machines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                mac_address: mac,
                ip_address: ip,
                password,
                category,
                wol_enabled
            })
        });

        if (res.ok) {
            showToast('Device added');
            document.getElementById('machineName').value = '';
            document.getElementById('machineMac').value = '';
            document.getElementById('machineIp').value = '';
            document.getElementById('machineIp').readOnly = false;
            document.getElementById('machinePassword').value = '';
            fetchMachines();
        } else if (res.status === 409) {
            showToast('Device with this MAC already exists', true);
        } else {
            showToast('Failed to add device', true);
        }
    } catch (e) {
        showToast('Error', true);
    }
}

let pendingDeleteId = null;

function deleteMachine(id) {
    pendingDeleteId = id;
    const confirmModal = document.getElementById('confirmModal');
    const confirmMsg = document.getElementById('confirmMessage');
    if (confirmModal && confirmMsg) {
        confirmMsg.textContent = 'Permanently remove this device?';
        confirmModal.classList.remove('hidden');
    } else {
        if (confirm('Permanently remove this device?')) {
            doDeleteMachine(id);
        }
    }
}

function closeConfirmModal(confirmed) {
    document.getElementById('confirmModal').classList.add('hidden');
    if (confirmed && pendingDeleteId) {
        doDeleteMachine(pendingDeleteId);
    }
    pendingDeleteId = null;
}

async function doDeleteMachine(id) {
    try {
        const res = await fetch(`${API_URL}/admin/machines/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Device removed');
            fetchMachines();
        } else {
            showToast('Failed to remove device', true);
        }
    } catch (e) {
        showToast('Error removing device', true);
    }
}

async function pingAllDevices() {
    const btn = document.getElementById('pingAllBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Pinging...</span>
    `;

    try {
        const res = await fetch(`${API_URL}/ping/all`, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showToast(`Pinged ${data.total} devices: ${data.online} online, ${data.offline} offline`);
            await fetchMachines();
        } else {
            showToast('Ping all failed', true);
        }
    } catch (e) {
        showToast('Error pinging devices', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-black', 'dark:border-white', 'text-gray-900', 'dark:text-white');
        b.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById('panel-' + tab).classList.remove('hidden');
    const btn = document.getElementById('tab-' + tab);
    btn.classList.add('border-black', 'dark:border-white', 'text-gray-900', 'dark:text-white');
    btn.classList.remove('border-transparent', 'text-gray-500');
    if (tab === 'settings') fetchCategories();
}

let categories = [];
async function fetchCategories() {
    try {
        const res = await fetch('/admin/categories');
        categories = await res.json();
        renderCategories();
        populateCategoryDropdowns();
    } catch (e) { console.error(e); }
}

async function renderCategories() {
    const list = document.getElementById('categoryList');
    if (!categories.length) {
        list.innerHTML = '<p class="text-gray-400 text-sm">No categories yet. Add one above.</p>';
        return;
    }

    const machinesByCategory = machinesCache.reduce((acc, m) => {
        const cat = m.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {});

    list.innerHTML = categories.map((c, index) => {
        const machines = machinesByCategory[c.name] || [];
        const machineCount = machines.length;

        return `
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <!-- Category Header -->
                <div class="bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between">
                    <div class="flex items-center space-x-3 flex-1">
                        <!-- Reorder Buttons -->
                        <div class="flex flex-col space-y-1">
                            <button onclick="moveCategoryUp(${index})" ${index === 0 ? 'disabled' : ''}
                                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                                </svg>
                            </button>
                            <button onclick="moveCategoryDown(${index})" ${index === categories.length - 1 ? 'disabled' : ''}
                                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <!-- Editable Category Name -->
                        <input type="text" value="${c.name}" id="cat-name-${c.id}"
                            onblur="saveCategoryName(${c.id})" 
                            onkeypress="if(event.key==='Enter') this.blur()"
                            class="flex-1 px-3 py-1.5 rounded-md border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-black dark:focus:border-white bg-transparent font-medium text-sm transition">
                        
                        <span class="text-xs text-gray-500">${machineCount} device${machineCount !== 1 ? 's' : ''}</span>
                    </div>

                    <div class="flex items-center space-x-2">
                        <button onclick="toggleCategoryDevices(${c.id})" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1">
                            <svg id="expand-icon-${c.id}" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <button onclick="deleteCategory(${c.id})" class="text-red-500 hover:text-red-700 text-sm px-2 py-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Device List (Collapsible) -->
                <div id="devices-${c.id}" class="hidden bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    ${machines.length === 0 ? '<p class="p-4 text-sm text-gray-400 text-center">No devices in this category</p>' : machines.map((m, mIndex) => `
                        <div class="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                            <div class="flex items-center space-x-3">
                                <div class="flex flex-col space-y-1">
                                    <button onclick="moveMachineUp('${c.name}', ${mIndex})" ${mIndex === 0 ? 'disabled' : ''}
                                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                    <button onclick="moveMachineDown('${c.name}', ${mIndex})" ${mIndex === machines.length - 1 ? 'disabled' : ''}
                                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-gray-900 dark:text-white">${m.name}</div>
                                    <div class="text-xs text-gray-500 font-mono">${m.mac}</div>
                                </div>
                            </div>
                            <button onclick="removeMachineFromCategory(${m.id})" class="text-gray-400 hover:text-red-600 transition text-xs px-2 py-1" title="Remove from category">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleCategoryDevices(categoryId) {
    const devicesDiv = document.getElementById(`devices-${categoryId}`);
    const icon = document.getElementById(`expand-icon-${categoryId}`);
    devicesDiv.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

async function saveCategoryName(categoryId) {
    const input = document.getElementById(`cat-name-${categoryId}`);
    const newName = input.value.trim();
    if (!newName) {
        fetchCategories();
        return;
    }

    try {
        const res = await fetch(`/admin/categories/${categoryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });

        if (res.ok) {
            showToast('Category renamed');
            fetchCategories();
            fetchMachines();
        } else if (res.status === 409) {
            showToast('Category name already exists', true);
            fetchCategories();
        } else {
            showToast('Failed to rename category', true);
            fetchCategories();
        }
    } catch (e) {
        showToast('Error', true);
        fetchCategories();
    }
}

async function moveCategoryUp(index) {
    if (index === 0) return;
    const items = categories.map((c, i) => ({
        id: c.id,
        order: i === index ? index - 1 : i === index - 1 ? index : i
    }));
    await reorderCategories(items);
}

async function moveCategoryDown(index) {
    if (index === categories.length - 1) return;
    const items = categories.map((c, i) => ({
        id: c.id,
        order: i === index ? index + 1 : i === index + 1 ? index : i
    }));
    await reorderCategories(items);
}

async function reorderCategories(items) {
    try {
        const res = await fetch('/admin/categories/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (res.ok) {
            await fetchCategories();
            await fetchMachines();
        }
    } catch (e) {
        showToast('Reorder failed', true);
    }
}

async function moveMachineUp(categoryName, index) {
    const machines = machinesCache.filter(m => m.category === categoryName);
    if (index === 0 || machines.length === 0) return;

    const items = machines.map((m, i) => ({
        id: m.id,
        order: i === index ? index - 1 : i === index - 1 ? index : i
    }));
    await reorderMachines(items);
}

async function moveMachineDown(categoryName, index) {
    const machines = machinesCache.filter(m => m.category === categoryName);
    if (index === machines.length - 1 || machines.length === 0) return;

    const items = machines.map((m, i) => ({
        id: m.id,
        order: i === index ? index + 1 : i === index + 1 ? index : i
    }));
    await reorderMachines(items);
}

async function reorderMachines(items) {
    try {
        const res = await fetch('/admin/machines/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (res.ok) {
            await fetchMachines();
            await fetchCategories();
        }
    } catch (e) {
        showToast('Reorder failed', true);
    }
}

async function removeMachineFromCategory(machineId) {
    try {
        const res = await fetch(`/admin/machines/${machineId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'Uncategorized' })
        });
        if (res.ok) {
            showToast('Device moved to Uncategorized');
            await fetchMachines();
            await fetchCategories();
        } else {
            showToast('Failed to remove device', true);
        }
    } catch (e) {
        showToast('Error', true);
    }
}

function populateCategoryDropdowns() {
    const options = '<option value="Uncategorized">Uncategorized</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    document.getElementById('machineCategory').innerHTML = options;
    document.getElementById('editCategory').innerHTML = options;
}

async function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;
    try {
        const res = await fetch('/admin/categories?name=' + encodeURIComponent(name), { method: 'POST' });
        if (res.ok) {
            showToast('Category added');
            document.getElementById('newCategoryName').value = '';
            fetchCategories();
        } else if (res.status === 409) {
            showToast('Category already exists', true);
        }
    } catch (e) { showToast('Error', true); }
}

async function deleteCategory(id) {
    pendingDeleteCategoryId = id;
    document.getElementById('confirmMessage').textContent = 'Delete this category?';
    document.getElementById('confirmModal').classList.remove('hidden');
}

let pendingDeleteCategoryId = null;
const origCloseConfirm = window.closeConfirmModal;
window.closeConfirmModal = function (confirmed) {
    document.getElementById('confirmModal').classList.add('hidden');
    if (confirmed && pendingDeleteId) {
        doDeleteMachine(pendingDeleteId);
        pendingDeleteId = null;
    } else if (confirmed && pendingDeleteCategoryId) {
        doDeleteCategory(pendingDeleteCategoryId);
        pendingDeleteCategoryId = null;
    }
};

async function doDeleteCategory(id) {
    try {
        await fetch('/admin/categories/' + id, { method: 'DELETE' });
        showToast('Category deleted');
        fetchCategories();
    } catch (e) { showToast('Error', true); }
}

function openEditModal(machine) {
    document.getElementById('editMachineId').value = machine.id;
    document.getElementById('editName').value = machine.name;
    document.getElementById('editMac').value = machine.mac;
    document.getElementById('editIp').value = machine.ip_address || '';
    document.getElementById('editCategory').value = machine.category || 'Uncategorized';
    document.getElementById('editWolEnabled').checked = machine.wol_enabled;
    document.getElementById('editPass').value = '';
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editMachineForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editMachineId').value;
            const name = document.getElementById('editName').value.trim();
            const mac = document.getElementById('editMac').value.trim();
            const ip = document.getElementById('editIp').value.trim();
            const category = document.getElementById('editCategory').value;
            const wol_enabled = document.getElementById('editWolEnabled').checked;
            const password = document.getElementById('editPass').value;

            const body = { name, mac_address: mac, ip_address: ip, category, wol_enabled };
            if (password) body.password = password;

            try {
                const res = await fetch(`${API_URL}/admin/machines/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (res.ok) {
                    showToast('Device updated');
                    closeEditModal();
                    fetchMachines();
                } else {
                    showToast('Failed to update device', true);
                }
            } catch (e) {
                showToast('Error', true);
            }
        });
    }
});

// Logout
async function logout() {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (e) {
        console.error('Logout error:', e);
    }
    window.location.href = '/';
}

// Init
fetchCategories();
