/* =========================================================
   MODUL 3: APP.JS (Core Engine & Rename Hub)
========================================================= */

const AppState = {
    robots: [],  
    groups: [],  
    globalRate: 100
};

// 1. LOGIKA SIDEBAR
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
};

// 2. NAVIGASI SPA
window.switchTab = function(targetId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(targetId);
    const targetBtn = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    updateUI();
};

// 3. UPDATE UI
window.updateUI = function() {
    const countEl = document.getElementById('global-hub-count');
    if (countEl) countEl.innerText = `${AppState.robots.length} Hub`;
    renderKoneksi();
    if (typeof renderDashboard === 'function') renderDashboard();
};

// 4. FITUR RENAME (Fungsi yang Sempat Hilang)
window.renameRobot = function(id) {
    const robot = AppState.robots.find(r => r.id === id);
    if (!robot) return;
    
    const newName = prompt("Masukkan nama baru untuk Hub ini:", robot.name);
    if (newName && newName.trim() !== "") {
        robot.name = newName.trim();
        updateUI();
    }
};

// 5. RENDER KONEKSI
function renderKoneksi() {
    const list = document.getElementById('koneksi-list');
    if (!list) return;
    
    let html = '';

    if (AppState.robots.length === 0) {
        html = '<div class="empty-state">Klik "Scan Robot" untuk mencari perangkat.</div>';
    } else {
        html = AppState.robots.map(r => {
            const isGrouped = AppState.groups.find(g => g.hub1 === r.id || g.hub2 === r.id);
            return `
            <div class="card" style="${isGrouped ? 'opacity:0.5; border-top-color:#ccc;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>🤖 ${r.name}</strong>
                    <span class="status-badge">RSSI: ${r.rssi || '--'}</span>
                </div>
                <div style="display:flex; gap:8px; margin-top:15px;">
                    <button class="btn btn-primary" style="padding:8px; font-size:11px;" onclick="renameRobot('${r.id}')">RENAME</button>
                    <button class="btn btn-warning" style="padding:8px; font-size:11px;" onclick="identifyRobot('${r.id}')">IDENTIFY</button>
                    <button class="btn btn-danger" style="padding:8px; font-size:11px;" onclick="disconnectRobot('${r.id}')">PUTUS</button>
                </div>
            </div>`;
        }).join('');
    }

    const freeHubs = AppState.robots.filter(r => !AppState.groups.find(g => g.hub1 === r.id || g.hub2 === r.id));
    if (freeHubs.length >= 2) {
        html += `
        <div class="card" style="border-top-color:var(--purple); background:#f9f5ff; grid-column: 1 / -1;">
            <h3 style="margin-top:0;">🔗 Grouping ABCD</h3>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <select id="sel-hub1" style="flex:1;">${freeHubs.map(r=>`<option value="${r.id}">${r.name}</option>`)}</select>
                <select id="sel-hub2" style="flex:1;">${freeHubs.map(r=>`<option value="${r.id}">${r.name}</option>`)}</select>
                <button class="btn btn-success" onclick="createGroup()">GABUNG</button>
            </div>
        </div>`;
    }

    if (AppState.groups.length > 0) {
        html += AppState.groups.map(g => `
            <div class="card" style="border-top-color:var(--success);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>🦾 ${g.name}</strong>
                    <button class="btn btn-danger" style="padding:5px 10px; font-size:11px;" onclick="deleteGroup('${g.id}')">PISAH</button>
                </div>
                <div style="margin-top:10px; font-size:12px; color:var(--text-muted);">Port A-B & C-D Terhubung</div>
            </div>
        `).join('');
    }

    list.innerHTML = html;
}

window.createGroup = function() {
    const h1 = document.getElementById('sel-hub1').value;
    const h2 = document.getElementById('sel-hub2').value;
    if (h1 === h2) return;
    AppState.groups.push({ id: 'GRP-' + Date.now(), name: 'Super Robot ' + (AppState.groups.length + 1), hub1: h1, hub2: h2 });
    updateUI();
};

window.deleteGroup = function(gId) {
    AppState.groups = AppState.groups.filter(g => g.id !== gId);
    updateUI();
};

window.getPlayableEntities = function() {
    let entities = [];
    AppState.groups.forEach(g => entities.push({ id: g.id, name: g.name, type: 'group', hub1: g.hub1, hub2: g.hub2 }));
    AppState.robots.forEach(r => {
        if (!AppState.groups.find(g => g.hub1 === r.id || g.hub2 === r.id)) {
            entities.push({ id: r.id, name: r.name, type: 'single', hub1: r.id });
        }
    });
    return entities;
};

window.onload = () => updateUI();
