/* =========================================================
   MODUL 5: MISSION.JS (GLOBAL COMMAND CENTER v16.0)
   Status: LED Await Fix, Physical Absensi, Input Speed Fix
========================================================= */

window.GlobalMission = {
    type: 'm1',
    m5SensorType: 'distance', 
    m5TriggerPort: 'A',
    m5Operator: '<',
    m5TriggerVal: 5, 
    rows: [
        { port: 'A', direction: 1, speed: 100, time: 2.5, sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5 }
    ],
    isExecuting: false
};

window.hexToRgb = function(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 255 };
};

window.rgbToHex = function(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

window.getSensorVal = function(hubId, portChar) {
    const pNum = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    const div = document.getElementById('sens' + pNum + '-' + hubId);
    return div && !isNaN(parseFloat(div.innerText)) ? parseFloat(div.innerText) : 0;
};

// ABSENSI: Tombol fisik dialihkan untuk SET READY
window.handlePhysicalButton = function(hubId) {
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    const ent = entities.find(e => e.hub1 === hubId || e.hub2 === hubId);
    if (!ent) return;
    toggleReady(ent.id); 
};

window.setupGlobalSensor = async function(portChar, type, btnElem) {
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    if (entities.length === 0) return;
    
    const originalText = btnElem.innerText;
    btnElem.innerText = "⏳ MENGIRIM...";
    btnElem.style.opacity = "0.7";
    
    for (let ent of entities) {
        const sHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
        const sPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
        if (sHub && typeof setupSensor === 'function') setupSensor(sHub, sPort, type);
        await new Promise(r => setTimeout(r, 100)); 
    }
    
    btnElem.innerText = "✅ TERKIRIM";
    setTimeout(() => {
        btnElem.innerText = originalText;
        btnElem.style.opacity = "1";
    }, 2000);
};

window.renderMissionUI = function() {
    const container = document.getElementById('dashboard-list');
    if (!container) return;

    let html = `
        <div class="card" style="border-top: 8px solid var(--primary); box-shadow:0 4px 10px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:#2c3e50;">🌍 PUSAT KOMANDO GLOBAL</h3>
                <div id="global-status-badge" class="status-badge" style="background:${GlobalMission.isExecuting ? 'var(--warning)' : '#e0e6ed'}; padding:6px 12px; border-radius:15px; font-weight:bold; font-size:12px;">
                    ${GlobalMission.isExecuting ? '🚀 PROGRAM JALAN' : '🔘 SIAP'}
                </div>
            </div>

            <div style="margin-top:15px; background:#e8f4f8; padding:12px; border-radius:10px; border:1px solid #bce8f1;">
                <label style="font-size:11px; font-weight:bold; color:#2c3e50;">📡 AKTIFASI SENSOR KELAS (GLOBAL):</label>
                <div style="display:flex; gap:10px; margin-top:8px;">
                    <div style="flex:1; background:white; padding:8px; border-radius:6px; border:1px solid #ddd;">
                        <strong style="font-size:11px;">PORT A (P1 Fisik):</strong>
                        <div style="display:flex; gap:5px; margin-top:5px;">
                            <button class="btn" style="flex:1; font-size:10px; padding:8px 4px; background-color:#9B59B6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="setupGlobalSensor('A', 'distance', this)">👁️ SET JARAK (IR)</button>
                            <button class="btn" style="flex:1; font-size:10px; padding:8px 4px; background-color:#4C97FF; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="setupGlobalSensor('A', 'tilt', this)">📐 SET TILT</button>
                        </div>
                    </div>
                    <div style="flex:1; background:white; padding:8px; border-radius:6px; border:1px solid #ddd;">
                        <strong style="font-size:11px;">PORT B (P2 Fisik):</strong>
                        <div style="display:flex; gap:5px; margin-top:5px;">
                            <button class="btn" style="flex:1; font-size:10px; padding:8px 4px; background-color:#9B59B6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="setupGlobalSensor('B', 'distance', this)">👁️ SET JARAK (IR)</button>
                            <button class="btn" style="flex:1; font-size:10px; padding:8px 4px; background-color:#4C97FF; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="setupGlobalSensor('B', 'tilt', this)">📐 SET TILT</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top:15px; background:#f4f7f9; padding:15px; border-radius:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label style="font-size:11px; font-weight:bold; color:#2c3e50;">MODE KURIKULUM</label>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <span style="font-size:11px; font-weight:bold;">WARNA KELAS:</span>
                        <input type="color" id="global-color" value="#9966FF" style="width:30px; height:30px; border:none; border-radius:5px; cursor:pointer;">
                        <button class="btn btn-primary" style="padding:6px 12px; font-size:11px; border-radius:6px;" onclick="setGlobalColor()">TERAPKAN</button>
                    </div>
                </div>
                
                <select id="global-type" style="width:100%; margin:10px 0; padding:12px; border-radius:8px; border:2px solid #ddd; font-weight:bold; font-size:13px;" onchange="updateGlobalType()">
                    <option value="m1" ${GlobalMission.type === 'm1' ? 'selected' : ''}>🕹️ 1. Direct Drive (Manual)</option>
                    <option value="m2" ${GlobalMission.type === 'm2' ? 'selected' : ''}>⏱️ 2. Timer Sequence (Waktu)</option>
                    <option value="m3" ${GlobalMission.type === 'm3' ? 'selected' : ''}>🧠 3. Sensor Logic (IR & Tilt Gabungan)</option>
                    <option value="m5" ${GlobalMission.type === 'm5' ? 'selected' : ''}>🔄 4. State Counter (Multi-Tahap)</option>
                </select>

                <div id="global-rows-container" style="margin-top:10px; display:flex; flex-direction:column; gap:10px;"></div>
                
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button id="btn-global-start" class="btn btn-warning" style="flex:2; padding:15px; font-weight:bold; color:#000; border:none; border-radius:8px; cursor:pointer; ${GlobalMission.isExecuting ? 'opacity:0.6; cursor:not-allowed;' : ''}" onclick="broadcastMission()" ${GlobalMission.isExecuting ? 'disabled' : ''}>🚀 JALANKAN (READY ONLY)</button>
                    <button class="btn btn-danger" style="flex:1; padding:15px; font-weight:bold; color:white; background-color:#E74C3C; border:none; border-radius:8px; cursor:pointer;" onclick="stopAllMissions()">🛑 STOP ALL</button>
                </div>
            </div>
        </div>
        
        <h3 style="margin-top:20px; border-bottom:2px solid #eee; padding-bottom:5px; color:#2c3e50;">📋 Assignment & Monitoring Individu</h3>
        <div id="individual-cards-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px; margin-top:15px;">
    `;

    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    if (entities.length === 0) {
        html += `<div class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:30px; color:#7f8c8d; background:white; border-radius:10px; border:2px dashed #bdc3c7;">Belum ada robot. Hubungkan di tab Koneksi.</div>`;
    } else {
        html += entities.map(ent => {
            const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
            const isReady = masterRobot && masterRobot.isReady === true;
            const isRunning = masterRobot && masterRobot.isRunning === true;
            const btnPressed = masterRobot && masterRobot.isButtonPressed;
            const currentState = masterRobot ? (masterRobot.stateIndex || 0) : 0;
            
            let hexColor = "#0000ff"; 
            if (masterRobot && masterRobot.currentColor) {
                hexColor = rgbToHex(masterRobot.currentColor.r, masterRobot.currentColor.g, masterRobot.currentColor.b);
            }

            const p1Div = document.getElementById(`sens1-${ent.hub1}`);
            const p1Val = p1Div ? p1Div.innerText : '--';
            const p2Div = document.getElementById(`sens2-${ent.hub1}`);
            const p2Val = p2Div ? p2Div.innerText : '--';

            return `
            <div id="card-${ent.id}" class="card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1); border-left: 8px solid ${isReady ? '#2ECC71' : '#bdc3c7'}; transition: border-color 0.3s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <strong style="font-size:14px; color:#2c3e50;">🤖 ${ent.name}</strong>
                            <input type="color" value="${hexColor}" onchange="setLocalColor('${ent.id}', this.value)" style="width:20px; height:20px; border:none; cursor:pointer; border-radius:4px;" title="Ubah Warna Robot">
                        </div>
                        <div style="font-size:11px; color:#7f8c8d; margin-top:3px;">${ent.type === 'group' ? '📡 Grup ABCD' : '📱 Single Hub'}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                        <div style="display:flex; align-items:center; gap:5px;" title="Status Koneksi">
                            <span style="font-size:10px; font-weight:bold; color:#2ecc71;">🟢 ONLINE</span>
                        </div>
                        <span id="btn-state-${ent.hub1}" style="font-size:10px; font-weight:bold; color:${btnPressed ? '#E74C3C' : '#bdc3c7'};">
                            ${btnPressed ? '🔴 FISIK DITEKAN' : '⚪ FISIK LEPAS'}
                        </span>
                        <button id="btn-ready-${ent.id}" class="btn" style="padding:6px 12px; font-size:11px; font-weight:bold; border:none; border-radius:6px; cursor:pointer; background-color:${isReady ? '#2ECC71' : '#4C97FF'}; color:white; transition: 0.2s;" onclick="toggleReady('${ent.id}')">
                            ${isReady ? '✅ READY' : '🔘 SET READY'}
                        </button>
                    </div>
                </div>
                
                <div style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
                    <div style="font-size:11px; color:#7f8c8d; font-weight:bold; margin-bottom:8px; text-transform:uppercase;">📡 Monitoring Sensor</div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1; background:#f8f9fa; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; border:1px solid #eee;">
                            <strong style="font-size:12px; color:#34495e;">P1:</strong>
                            <div class="status-box" id="sens1-${ent.hub1}" style="font-family:monospace; font-size:14px; padding:4px 8px; background:#e8f4f8; border:1px solid #bce8f1; border-radius:6px; text-align:center; min-width:40px; font-weight:bold; color:#4C97FF;">${p1Val}</div>
                        </div>
                        <div style="flex:1; background:#f8f9fa; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; border:1px solid #eee;">
                            <strong style="font-size:12px; color:#34495e;">P2:</strong>
                            <div class="status-box" id="sens2-${ent.hub1}" style="font-family:monospace; font-size:14px; padding:4px 8px; background:#e8f4f8; border:1px solid #bce8f1; border-radius:6px; text-align:center; min-width:40px; font-weight:bold; color:#4C97FF;">${p2Val}</div>
                        </div>
                    </div>
                </div>

                <div id="state-text-${ent.hub1}" style="font-size:12px; color:#e67e22; margin-top:12px; text-align:center; font-weight:bold; display:${GlobalMission.type === 'm5' ? 'block' : 'none'}; background:#fff3e0; padding:4px; border-radius:4px;">STATE AKTIF: [ ${currentState} ]</div>
                
                <div style="display:flex; gap:8px; margin-top:15px;">
                    <button id="btn-local-start-${ent.id}" class="btn" style="flex:1; padding:8px; font-size:11px; font-weight:bold; color:#000; background-color:#FFBF00; border:none; border-radius:6px; cursor:pointer; ${isRunning ? 'opacity:0.5;' : ''}" onclick="runLocal('${ent.id}')" ${isRunning ? 'disabled' : ''}>▶️ START LOKAL</button>
                    <button class="btn" style="flex:1; padding:8px; font-size:11px; font-weight:bold; color:white; background-color:#E74C3C; border:none; border-radius:6px; cursor:pointer;" onclick="stopLocal('${ent.id}')">🛑 STOP LOKAL</button>
                </div>
            </div>`;
        }).join('');
    }

    html += `</div>`;
    container.innerHTML = html;
    refreshGlobalRows();
};

function updateGlobalUIState() {
    const badge = document.getElementById('global-status-badge');
    const btnStart = document.getElementById('btn-global-start');
    if (badge) {
        badge.innerHTML = GlobalMission.isExecuting ? '🚀 PROGRAM JALAN' : '🔘 SIAP';
        badge.style.background = GlobalMission.isExecuting ? 'var(--warning)' : '#e0e6ed';
    }
    if (btnStart) {
        btnStart.disabled = GlobalMission.isExecuting;
        btnStart.style.opacity = GlobalMission.isExecuting ? '0.6' : '1';
        btnStart.style.cursor = GlobalMission.isExecuting ? 'not-allowed' : 'pointer';
    }
}

window.updateGlobalType = function() {
    GlobalMission.type = document.getElementById('global-type').value;
    GlobalMission.rows = []; 
    addGlobalRow(); 
    renderMissionUI(); 
};

function getIrOptions(selected) {
    let opts = '';
    for(let i=0; i<=10; i++) opts += `<option value="${i}" ${selected===i?'selected':''}>${i}</option>`;
    return opts;
}
function getTiltOptions(selected) {
    return [0,3,5,7,9].map(v => `<option value="${v}" ${selected===v?'selected':''}>${v}</option>`).join('');
}

window.refreshGlobalRows = function() {
    const container = document.getElementById('global-rows-container');
    if (!container) return;

    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    const hasGroup = entities.some(e => e.type === 'group');
    const portOptions = `<option value="A">Port A</option><option value="B">Port B</option>` + 
                        (hasGroup ? `<option value="C">Port C</option><option value="D">Port D</option>` : '');

    let m5Header = '';
    if (GlobalMission.type === 'm5') {
        const valDropdown = GlobalMission.m5SensorType === 'distance' ? getIrOptions(GlobalMission.m5TriggerVal) : getTiltOptions(GlobalMission.m5TriggerVal);
        m5Header = `
        <div style="background:#fff3e0; padding:12px; border-radius:8px; margin-bottom:12px; font-size:12px; font-weight:bold; border:1px solid #ffe0b2;">
            ⚙️ KONDISI TRIGGER COUNTER (M5):<br>
            <div style="display:flex; gap:8px; margin-top:8px; align-items:center; flex-wrap:wrap;">
                <select onchange="GlobalMission.m5TriggerPort=this.value; refreshGlobalRows();" style="padding:6px; border-radius:6px; border:1px solid #ccc;">${portOptions.replace(`value="${GlobalMission.m5TriggerPort}"`,`selected value="${GlobalMission.m5TriggerPort}"`)}</select>
                <select onchange="GlobalMission.m5SensorType=this.value; GlobalMission.m5TriggerVal=(this.value==='distance'?5:3); refreshGlobalRows();" style="padding:6px; border-radius:6px; border:1px solid #ccc;">
                    <option value="distance" ${GlobalMission.m5SensorType==='distance'?'selected':''}>👁️ Sensor IR</option>
                    <option value="tilt" ${GlobalMission.m5SensorType==='tilt'?'selected':''}>📐 Sensor Tilt</option>
                </select>
                <select onchange="GlobalMission.m5Operator=this.value; refreshGlobalRows();" style="padding:6px; border-radius:6px; border:1px solid #ccc;">
                    <option value="<" ${GlobalMission.m5Operator==='<'?'selected':''}> &lt; </option>
                    <option value="==" ${GlobalMission.m5Operator==='=='?'selected':''}> = </option>
                    <option value=">" ${GlobalMission.m5Operator==='>'?'selected':''}> &gt; </option>
                </select>
                <select onchange="GlobalMission.m5TriggerVal=parseInt(this.value);" style="padding:6px; border-radius:6px; border:1px solid #ccc;">${valDropdown}</select>
            </div>
        </div>`;
    }

    const rowsHTML = GlobalMission.rows.map((row, idx) => {
        let logicHTML = '';
        const dirSel = `<select onchange="GlobalMission.rows[${idx}].direction=parseInt(this.value)" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">
                            <option value="1" ${row.direction===1?'selected':''}>⏩ Maju</option>
                            <option value="-1" ${row.direction===-1?'selected':''}>⏪ Mundur</option>
                            <option value="0" ${row.direction===0?'selected':''}>🛑 Stop</option>
                        </select>`;
        
        // SPEED FIX: Menggunakan Kolom Ketik Angka untuk mencegah dropdown kepanjangan
        const speedSel = `Speed: <input type="number" min="0" max="100" step="10" value="${row.speed}" onchange="GlobalMission.rows[${idx}].speed=parseInt(this.value)" style="width:55px; padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">`;

        if (GlobalMission.type === 'm1') {
            logicHTML = `<select onchange="GlobalMission.rows[${idx}].port=this.value" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">${portOptions.replace(`value="${row.port}"`,`selected value="${row.port}"`)}</select>
                    ${dirSel} ${speedSel}`;
        } else if (GlobalMission.type === 'm2') {
            logicHTML = `<select onchange="GlobalMission.rows[${idx}].port=this.value" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">${portOptions.replace(`value="${row.port}"`,`selected value="${row.port}"`)}</select>
                    ${dirSel} ${speedSel}
                    <span style="font-weight:bold;">selama</span> <input type="number" value="${row.time}" style="width:50px; padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;" onchange="GlobalMission.rows[${idx}].time=parseFloat(this.value)">s`;
        } else if (GlobalMission.type === 'm3') {
            const valDropdown = row.sensorType === 'distance' ? getIrOptions(row.threshold) : getTiltOptions(row.threshold);
            logicHTML = `<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <div style="background:#f0f2f5; padding:6px 10px; border-radius:6px; display:flex; gap:6px; align-items:center;">
                        <span style="font-weight:bold; color:#7f8c8d;">JIKA</span> 
                        <select onchange="GlobalMission.rows[${idx}].sensorPort=this.value" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">${portOptions.replace(`value="${row.sensorPort}"`,`selected value="${row.sensorPort}"`)}</select>
                        <select onchange="GlobalMission.rows[${idx}].sensorType=this.value; GlobalMission.rows[${idx}].threshold=(this.value==='distance'?5:3); refreshGlobalRows();" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">
                            <option value="distance" ${row.sensorType==='distance'?'selected':''}>👁️ IR</option>
                            <option value="tilt" ${row.sensorType==='tilt'?'selected':''}>📐 Tilt</option>
                        </select>
                        <select onchange="GlobalMission.rows[${idx}].operator=this.value" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">
                            <option value="<" ${row.operator==='<'?'selected':''}> &lt; </option>
                            <option value="==" ${row.operator==='=='?'selected':''}> = </option>
                            <option value=">" ${row.operator==='>'?'selected':''}> &gt; </option>
                        </select>
                        <select onchange="GlobalMission.rows[${idx}].threshold=parseInt(this.value)" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">${valDropdown}</select>
                    </div>
                    <div style="background:#e8f4f8; padding:6px 10px; border-radius:6px; display:flex; gap:6px; align-items:center;">
                        <span style="font-weight:bold; color:#2980b9;">MAKA</span> 
                        <select onchange="GlobalMission.rows[${idx}].port=this.value" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">${portOptions.replace(`value="${row.port}"`,`selected value="${row.port}"`)}</select> 
                        ${dirSel} ${speedSel}
                    </div>
                </div>`;
        } else if (GlobalMission.type === 'm5') {
            logicHTML = `<span style="font-weight:bold; color:#e67e22; background:#fff3e0; padding:6px 10px; border-radius:6px;">STATE ${idx + 1}</span> 
                    <div style="background:#e8f4f8; padding:6px 10px; border-radius:6px; display:flex; gap:6px; align-items:center;">
                        <span style="font-weight:bold; color:#2980b9;">JALANKAN</span> 
                        <select onchange="GlobalMission.rows[${idx}].port=this.value" style="padding:6px; border-radius:6px; border:1px solid #ccc; font-size:12px;">${portOptions.replace(`value="${row.port}"`,`selected value="${row.port}"`)}</select> 
                        ${dirSel} ${speedSel}
                    </div>`;
        }
        return `<div class="logic-row" style="display:flex; gap:10px; align-items:center; background:white; padding:12px; border-radius:10px; border:1px solid #ddd; font-size:12px; margin-bottom:8px; flex-wrap:wrap;">
                <div style="flex:1; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">${logicHTML}</div> 
                <button class="btn" style="padding:8px 12px; background-color:#E74C3C; color:white; border:none; border-radius:6px; cursor:pointer;" onclick="removeGlobalRow(${idx})">🗑️</button></div>`;
    }).join('');

    container.innerHTML = m5Header + rowsHTML + `<button class="btn" style="width:fit-content; font-size:12px; font-weight:bold; margin-top:5px; padding:10px 15px; background-color:#2ECC71; color:white; border:none; border-radius:6px; cursor:pointer;" onclick="addGlobalRow()">+ TAMBAH ${GlobalMission.type==='m5'?'STATE':'BARIS'}</button>`;
};

window.addGlobalRow = function() {
    GlobalMission.rows.push({ port: 'A', direction: 1, speed: 100, time: 2.5, sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5 });
    refreshGlobalRows();
};
window.removeGlobalRow = function(idx) { GlobalMission.rows.splice(idx, 1); refreshGlobalRows(); };

// LED AWAIT FIX: Tambahkan async/await agar warna tidak telat
window.setGlobalColor = async function() {
    const hex = document.getElementById('global-color').value;
    const rgb = hexToRgb(hex);
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    
    for (let ent of entities) {
        const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
        if (masterRobot) masterRobot.currentColor = rgb; 
        if (typeof setRGB === 'function' && (!masterRobot || !masterRobot.isReady)) {
            await setRGB(ent.hub1, rgb.r, rgb.g, rgb.b);
            if (ent.hub2) await setRGB(ent.hub2, rgb.r, rgb.g, rgb.b);
        }
    }
};

window.setLocalColor = async function(entId, hex) {
    const rgb = hexToRgb(hex);
    const ent = typeof getPlayableEntities === 'function' ? getPlayableEntities().find(e => e.id === entId) : null;
    if (!ent) return;
    const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
    if (masterRobot) masterRobot.currentColor = rgb; 
    
    if (typeof setRGB === 'function' && (!masterRobot || !masterRobot.isReady)) {
        await setRGB(ent.hub1, rgb.r, rgb.g, rgb.b);
        if (ent.hub2) await setRGB(ent.hub2, rgb.r, rgb.g, rgb.b);
    }
};

window.executeHardware = async function(entId, portChar, val) {
    const ent = typeof getPlayableEntities === 'function' ? getPlayableEntities().find(e => e.id === entId) : null;
    if (!ent) return;
    let targetHubId = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
    let targetPortNum = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    if (targetHubId && typeof setMotor === 'function') {
        await setMotor(targetHubId, targetPortNum, val);
    }
};

// LED AWAIT FIX: Tambahkan async/await agar warna instan
window.toggleReady = async function(entId) {
    const ent = typeof getPlayableEntities === 'function' ? getPlayableEntities().find(e => e.id === entId) : null;
    if (!ent) return;
    const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
    
    if (masterRobot) {
        masterRobot.isReady = !masterRobot.isReady;
        masterRobot.stateIndex = 0; 
        masterRobot.isDetecting = false; 
        
        if (typeof setRGB === 'function') {
            if (masterRobot.isReady) { 
                await setRGB(ent.hub1, 0, 255, 0); 
                if(ent.hub2) await setRGB(ent.hub2, 0, 255, 0); 
            } else { 
                let c = masterRobot.currentColor || {r:0, g:0, b:255};
                await setRGB(ent.hub1, c.r, c.g, c.b); 
                if(ent.hub2) await setRGB(ent.hub2, c.r, c.g, c.b); 
            }
        }

        const cardElem = document.getElementById(`card-${ent.id}`);
        const btnReady = document.getElementById(`btn-ready-${ent.id}`);
        const stateText = document.getElementById(`state-text-${ent.hub1}`);
        
        if(cardElem) cardElem.style.borderLeft = masterRobot.isReady ? '8px solid #2ECC71' : '8px solid #bdc3c7';
        if(btnReady) {
            btnReady.innerText = masterRobot.isReady ? '✅ READY' : '🔘 SET READY';
            btnReady.style.backgroundColor = masterRobot.isReady ? '#2ECC71' : '#4C97FF';
        }
        if(stateText) stateText.innerText = `STATE AKTIF: [ 0 ]`;
    }
};

window.runLocal = async function(entId) {
    const ent = typeof getPlayableEntities === 'function' ? getPlayableEntities().find(e => e.id === entId) : null;
    if(!ent) return;
    const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
    if(masterRobot) {
        masterRobot.isRunning = true;
        masterRobot.stateIndex = 0;
        
        const btnLocal = document.getElementById(`btn-local-start-${ent.id}`);
        if(btnLocal) { btnLocal.disabled = true; btnLocal.style.opacity = '0.5'; }
    }

    const r = GlobalMission.rows[0]; 
    if(r) {
        const actualSpeed = r.speed * (r.direction || 1);
        await executeHardware(entId, r.port, actualSpeed);
    }
};

window.stopLocal = async function(entId) {
    const ent = typeof getPlayableEntities === 'function' ? getPlayableEntities().find(e => e.id === entId) : null;
    if (!ent) return;

    const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
    if (masterRobot) {
        masterRobot.isRunning = false; 
        masterRobot.isReady = false; 
        masterRobot.stateIndex = 0;   
        masterRobot.isDetecting = false;
        
        if (typeof setRGB === 'function') {
            let c = masterRobot.currentColor || {r:0, g:0, b:255};
            setRGB(ent.hub1, c.r, c.g, c.b); 
            if(ent.hub2) setRGB(ent.hub2, c.r, c.g, c.b);
        }

        const cardElem = document.getElementById(`card-${ent.id}`);
        const btnReady = document.getElementById(`btn-ready-${ent.id}`);
        const btnLocal = document.getElementById(`btn-local-start-${ent.id}`);
        const stateText = document.getElementById(`state-text-${ent.hub1}`);
        
        if(cardElem) cardElem.style.borderLeft = '8px solid #bdc3c7';
        if(btnReady) { btnReady.innerText = '🔘 SET READY'; btnReady.style.backgroundColor = '#4C97FF'; }
        if(btnLocal) { btnLocal.disabled = false; btnLocal.style.opacity = '1'; }
        if(stateText) stateText.innerText = `STATE AKTIF: [ 0 ]`;
    }

    await executeHardware(entId, 'A', 0); await new Promise(r=>setTimeout(r,20));
    await executeHardware(entId, 'B', 0); await new Promise(r=>setTimeout(r,20));
    await executeHardware(entId, 'C', 0); await new Promise(r=>setTimeout(r,20));
    await executeHardware(entId, 'D', 0);
};

window.broadcastMission = async function() {
    if (GlobalMission.isExecuting) return; 

    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    if (entities.length === 0) return alert("Belum ada robot terkoneksi!");

    GlobalMission.isExecuting = true;
    updateGlobalUIState(); 

    entities.forEach(ent => {
        const m = AppState.robots.find(r => r.id === ent.hub1);
        if (m && m.isReady) {
            m.isRunning = true;
            m.stateIndex = 0; 
            m.isDetecting = false; 
        }
    });

    while (GlobalMission.isExecuting) {
        for (let ent of entities) {
            if (!GlobalMission.isExecuting) break;
            const masterRobot = AppState.robots.find(r => r.id === ent.hub1);
            if (!masterRobot || !masterRobot.isReady) continue; 

            if (GlobalMission.type === 'm5') {
                const sHubId = (GlobalMission.m5TriggerPort === 'A' || GlobalMission.m5TriggerPort === 'B') ? ent.hub1 : ent.hub2;
                const currentVal = getSensorVal(sHubId, GlobalMission.m5TriggerPort);
                
                let conditionMet = false;
                if (GlobalMission.m5Operator === '<') conditionMet = currentVal < GlobalMission.m5TriggerVal;
                else if (GlobalMission.m5Operator === '==') conditionMet = Math.round(currentVal) === GlobalMission.m5TriggerVal;
                else if (GlobalMission.m5Operator === '>') conditionMet = currentVal > GlobalMission.m5TriggerVal;

                if (conditionMet && !masterRobot.isDetecting) {
                    masterRobot.isDetecting = true;
                    masterRobot.stateIndex++;
                    if (masterRobot.stateIndex > GlobalMission.rows.length) masterRobot.stateIndex = 1; 
                    
                    const stateText = document.getElementById(`state-text-${ent.hub1}`);
                    if (stateText) stateText.innerText = `STATE AKTIF: [ ${masterRobot.stateIndex} ]`;
                    
                } else if (!conditionMet && masterRobot.isDetecting) {
                    masterRobot.isDetecting = false; 
                }

                if (masterRobot.stateIndex > 0) {
                    const activeRow = GlobalMission.rows[masterRobot.stateIndex - 1];
                    if (activeRow) {
                        const actualSpeed = activeRow.speed * (activeRow.direction || 0); 
                        await executeHardware(ent.id, activeRow.port, actualSpeed);
                    }
                }
            } 
            else if (GlobalMission.type === 'm3') {
                for (let r of GlobalMission.rows) {
                    if (!GlobalMission.isExecuting) break;
                    const actualSpeed = r.speed * (r.direction || 0);
                    const sHubId = (r.sensorPort === 'A' || r.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                    const currentVal = getSensorVal(sHubId, r.sensorPort);
                    
                    let conditionMet = false;
                    if (r.operator === '<') conditionMet = currentVal < r.threshold;
                    else if (r.operator === '==') conditionMet = Math.round(currentVal) === r.threshold;
                    else if (r.operator === '>') conditionMet = currentVal > r.threshold;
                    
                    await executeHardware(ent.id, r.port, conditionMet ? actualSpeed : 0);
                }
            }
            else {
                for (let r of GlobalMission.rows) {
                    if (!GlobalMission.isExecuting) break;
                    const actualSpeed = r.speed * (r.direction || 0);

                    if (GlobalMission.type === 'm1') {
                        await executeHardware(ent.id, r.port, actualSpeed);
                    } else if (GlobalMission.type === 'm2') {
                        await executeHardware(ent.id, r.port, actualSpeed);
                        await new Promise(res => setTimeout(res, r.time * 1000));
                        await executeHardware(ent.id, r.port, 0);
                    }
                }
            }
        }
        if (GlobalMission.type === 'm1' || GlobalMission.type === 'm2') GlobalMission.isExecuting = false;
        if (!GlobalMission.isExecuting) break;
        await new Promise(res => setTimeout(res, 100)); 
    }
    
    entities.forEach(ent => {
        const m = AppState.robots.find(r => r.id === ent.hub1);
        if (m) m.isRunning = false;
    });
    
    GlobalMission.isExecuting = false;
    updateGlobalUIState();
};

window.stopAllMissions = async function() {
    GlobalMission.isExecuting = false;
    updateGlobalUIState(); 
    
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    
    for (let ent of entities) {
        const m = AppState.robots.find(r => r.id === ent.hub1);
        if (m) {
            m.isRunning = false; 
            m.stateIndex = 0; 
            m.isDetecting = false;
            
            const stateText = document.getElementById(`state-text-${ent.hub1}`);
            const btnLocal = document.getElementById(`btn-local-start-${ent.id}`);
            if (stateText) stateText.innerText = `STATE AKTIF: [ 0 ]`;
            if (btnLocal) { btnLocal.disabled = false; btnLocal.style.opacity = '1'; }
        }
        
        await executeHardware(ent.id, 'A', 0); await new Promise(r=>setTimeout(r,20));
        await executeHardware(ent.id, 'B', 0); await new Promise(r=>setTimeout(r,20));
        await executeHardware(ent.id, 'C', 0); await new Promise(r=>setTimeout(r,20));
        await executeHardware(ent.id, 'D', 0); await new Promise(r=>setTimeout(r,20));
    }
};

window.renderDashboard = function() {
    renderMissionUI();
};