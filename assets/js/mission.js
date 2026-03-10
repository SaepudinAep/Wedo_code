/* =========================================================
   MODUL 5: MISSION.JS (v27.0 - ULTIMATE INDUSTRIAL ENGINE)
   Status: FULL CODE (NO CLEANING) - ANTI RESET - CLAMPING
   Features: Dual-Core 100ms, M3 Seq-Lock, Sensor Tolerance
========================================================= */

window.GlobalMission = {
    type: 'm1',
    m5SensorType: 'distance', 
    m5TriggerPort: 'A',
    m5Operator: '<',
    m5TriggerVal: 5, 
    defaultActions: [{ port: 'A', direction: 0, speed: 0 }], 
    states: [{ actions: [{ port: 'A', direction: 1, speed: 100 }] }],
    rows: [{ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }],
    isExecuting: false,
    activatedPorts: new Set() 
};

const PRESET_COLORS = [
    { name: 'Merah', hex: '#FF0000' }, { name: 'Hijau', hex: '#00FF00' }, { name: 'Biru', hex: '#0000FF' },
    { name: 'Kuning', hex: '#FFFF00' }, { name: 'Ungu', hex: '#9966FF' }, { name: 'Cyan', hex: '#00FFFF' }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

window.hexToRgb = function(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 255 };
};

window.rgbToHex = function(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

// FITUR BARU: SENSOR CLAMPING (TOLERANSI ERROR --)
window.getSensorVal = function(hubId, portChar, sType) {
    const pNum = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    const div = document.getElementById('sens' + pNum + '-' + hubId);
    
    // Jika sensor blank / tidak siap
    if (!div || div.innerText === '--' || div.innerText.trim() === '') {
        return sType === 'distance' ? 10 : 0; 
    }
    
    let val = parseFloat(div.innerText);
    if (isNaN(val)) return sType === 'distance' ? 10 : 0;
    
    // Batasi nilai agar tidak error logika
    if (sType === 'distance') {
        if (val > 10) return 10;
        if (val < 0) return 0;
    }
    return val;
};

// HANDLER TOMBOL FISIK: MASTER SWITCH LOKAL SEMUA MODE
window.handlePhysicalButton = function(hubId) {
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    const ent = entities.find(e => e.hub1 === hubId || e.hub2 === hubId);
    if (!ent) return;

    const master = AppState.robots.find(r => r.id === ent.hub1);
    if (master) {
        if (master.isRunning) stopLocal(ent.id);
        else runLocal(ent.id);
    }
};

window.setupGlobalSensor = async function(portChar, type, btnElem) {
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    if (entities.length === 0) return;
    const originalText = btnElem.innerText;
    btnElem.innerText = "⏳";
    
    if (type === 'unset') GlobalMission.activatedPorts.delete(portChar);
    else GlobalMission.activatedPorts.add(portChar);

    for (let ent of entities) {
        const sHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
        const sPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
        if (sHub && typeof setupSensor === 'function') {
            if (type === 'unset') {
                const r = AppState.robots.find(x => x.id === sHub);
                if (r && r.cmd) await r.cmd.writeValue(new Uint8Array([0x00, 0x01, sPort])); 
            } else {
                await setupSensor(sHub, sPort, type);
            }
        }
        await new Promise(r => setTimeout(r, 80)); 
    }
    btnElem.innerText = originalText;
    renderMissionUI();
};

window.renderMissionUI = function() {
    const container = document.getElementById('dashboard-list');
    if (!container) return;

    let paletteHtml = PRESET_COLORS.map(c => 
        `<div onclick="applyPresetColor('${c.hex}')" style="width:28px; height:28px; border-radius:50%; background:${c.hex}; cursor:pointer; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.2);"></div>`
    ).join('');

    let html = `
        <div class="card" style="border-top: 8px solid var(--primary); box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h3 style="margin:0; font-size:16px;">🌍 PUSAT KOMANDO v27 (CLAMPING)</h3>
                <div id="global-status-badge" class="status-badge" style="background:${GlobalMission.isExecuting ? 'var(--warning)' : '#e0e6ed'}; padding:8px 16px; border-radius:20px; font-weight:bold; font-size:12px;">
                    ${GlobalMission.isExecuting ? '🚀 KELAS JALAN' : '🔘 STANDBY'}
                </div>
            </div>

            <div style="margin-top:15px; background:#e8f4f8; padding:15px; border-radius:12px; border:1px solid #bce8f1;">
                <label style="font-size:11px; font-weight:bold; color:#2c3e50; margin-bottom:8px; display:block;">📡 AKTIFASI SENSOR GLOBAL:</label>
                <div style="display:flex; flex-wrap:wrap; gap:10px;">
                    ${['A', 'B', 'C', 'D'].map(p => `
                        <div style="flex:1; min-width:110px; background:white; padding:8px; border-radius:8px; border:1px solid #ddd;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <strong style="font-size:12px;">PORT ${p}</strong>
                                <span style="font-size:10px; cursor:pointer; color:#e74c3c; font-weight:bold;" onclick="setupGlobalSensor('${p}','unset',this)">✖ OFF</span>
                            </div>
                            <div style="display:flex; gap:4px;">
                                <button class="btn" style="flex:1; font-size:10px; padding:6px; background:#9B59B6; color:white;" onclick="setupGlobalSensor('${p}','distance',this)">IR</button>
                                <button class="btn" style="flex:1; font-size:10px; padding:6px; background:#3498db; color:white;" onclick="setupGlobalSensor('${p}','tilt',this)">TILT</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top:15px; background:#f8f9fa; padding:15px; border-radius:12px; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <label style="font-size:11px; font-weight:bold; color:#7f8c8d;">WARNA LED:</label>
                        <div style="display:flex; gap:6px;">${paletteHtml}</div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="color" id="global-color" value="#9966FF" style="width:35px; height:35px; border:none; cursor:pointer; border-radius:6px;">
                        <button class="btn btn-primary" style="padding:8px 15px; font-size:11px; font-weight:bold;" onclick="setGlobalColor()">TERAPKAN</button>
                    </div>
                </div>
                
                <select id="global-type" style="width:100%; margin:15px 0; padding:12px; border-radius:8px; font-weight:bold; font-size:13px; border:2px solid #bdc3c7; background:white;" onchange="updateGlobalType()">
                    <option value="m1" ${GlobalMission.type === 'm1' ? 'selected' : ''}>🕹️ 1. DIRECT DRIVE (Jalan Terus)</option>
                    <option value="m2" ${GlobalMission.type === 'm2' ? 'selected' : ''}>⏱️ 2. TIMER SEQUENCE (Berurutan Waktu)</option>
                    <option value="m3" ${GlobalMission.type === 'm3' ? 'selected' : ''}>🧠 3. IR SENSOR (Reaksi Berantai / Tuli Sementara)</option>
                    <option value="m4" ${GlobalMission.type === 'm4' ? 'selected' : ''}>📐 4. TILT SENSOR (Memori Aksi Terkunci)</option>
                    <option value="m5" ${GlobalMission.type === 'm5' ? 'selected' : ''}>🔄 5. STATE COUNTER (Siklus Multitahap)</option>
                </select>

                <div id="global-rows-container"></div>
                
                <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="btn-global-start" class="btn btn-warning" style="flex:1; min-width:200px; padding:16px; font-weight:bold; font-size:14px; color:#2c3e50;" onclick="broadcastMission()">🚀 JALANKAN SEMUA READY</button>
                    <button class="btn btn-danger" style="flex:1; min-width:120px; padding:16px; font-weight:bold; font-size:14px;" onclick="stopAllMissions()">🛑 STOP ALL</button>
                </div>
            </div>
        </div>
        
        <div id="individual-cards-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px; margin-top:20px;">
    `;

    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    html += entities.map(ent => {
        const master = AppState.robots.find(r => r.id === ent.hub1);
        const isReady = master && master.isReady;
        const isRun = master && master.isRunning;
        let hexColor = master && master.currentColor ? rgbToHex(master.currentColor.r, master.currentColor.g, master.currentColor.b) : "#0000ff";

        let active = [];
        if (GlobalMission.activatedPorts.has('A')) active.push({l: 'P1', id: `sens1-${ent.hub1}`});
        if (GlobalMission.activatedPorts.has('B')) active.push({l: 'P2', id: `sens2-${ent.hub1}`});
        if (ent.hub2) {
            if (GlobalMission.activatedPorts.has('C')) active.push({l: 'P3', id: `sens1-${ent.hub2}`});
            if (GlobalMission.activatedPorts.has('D')) active.push({l: 'P4', id: `sens2-${ent.hub2}`});
        }

        return `
        <div id="card-${ent.id}" class="card" style="padding:15px; border-left: 8px solid ${isReady ? '#2ecc71' : '#95a5a6'}; background:${isRun ? '#fdfefe' : '#ffffff'}; opacity: ${isRun ? '1' : '0.85'}; transition: 0.3s;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <strong style="font-size:15px; color:#2c3e50;">🤖 ${ent.name}</strong>
                        <input type="color" value="${hexColor}" onchange="setLocalColor('${ent.id}', this.value)" style="width:24px; height:24px; border:none; cursor:pointer; border-radius:4px;">
                    </div>
                    <div style="font-size:10px; color:${isRun ? '#e67e22' : '#7f8c8d'}; margin-top:4px; font-weight:bold;">${isRun ? '🔥 RUNNING' : '💤 IDLE'} | ${ent.type === 'group' ? '📡 ABCD' : '📱 SINGLE'}</div>
                </div>
                <button class="btn" style="padding:8px 12px; font-size:11px; font-weight:bold; background:${isReady?'#2ecc71':'#34495e'}; color:white; border-radius:8px;" onclick="toggleReady('${ent.id}')">${isReady?'✅ READY':'🔘 SET READY'}</button>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap:6px; margin-top:12px;">
                ${active.map(s => `<div style="background:#f1f3f5; border:1px solid #e9ecef; padding:6px 8px; border-radius:6px; font-size:11px; display:flex; justify-content:space-between; align-items:center;"><strong style="color:#7f8c8d;">${s.l}:</strong> <span id="${s.id}" style="color:#2980b9; font-weight:bold; font-family:monospace; font-size:13px;">--</span></div>`).join('')}
            </div>
            <div id="state-text-${ent.hub1}" style="font-size:11px; color:#d35400; margin-top:12px; text-align:center; font-weight:bold; background:#fcf3cf; padding:6px; border-radius:6px; border:1px solid #f9e79f;">INFO: [ STANDBY ]</div>
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="btn" style="flex:1; background:#f1c40f; color:#2c3e50; font-weight:bold; padding:10px; font-size:12px;" onclick="runLocal('${ent.id}')">▶️ START LOKAL</button>
                <button class="btn" style="flex:1; background:#e74c3c; color:white; font-weight:bold; padding:10px; font-size:12px;" onclick="stopLocal('${ent.id}')">🛑 STOP LOKAL</button>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = html + `</div>`;
    refreshGlobalRows();
};

window.refreshGlobalRows = function() {
    const container = document.getElementById('global-rows-container');
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    const hasGroup = entities.some(e => e.type === 'group');
    const pOpts = `<option value="A">Port A</option><option value="B">Port B</option>` + (hasGroup ? `<option value="C">Port C</option><option value="D">Port D</option>` : '');

    if (GlobalMission.type === 'm5') {
        const vDrop = GlobalMission.m5SensorType === 'distance' ? getIrOptions(GlobalMission.m5TriggerVal) : getTiltOptions(GlobalMission.m5TriggerVal);
        let header = `<div style="background:#fdf2e9; padding:12px; border-radius:10px; margin-bottom:12px; font-size:12px; border:1px solid #f5cba7;">
            <strong style="color:#d35400;">⚙️ SENGGOL SENSOR UNTUK PINDAH STATE:</strong>
            <div style="display:flex; gap:8px; margin-top:8px; align-items:center; flex-wrap:wrap;">
                <select onchange="GlobalMission.m5TriggerPort=this.value; updateField()" style="padding:6px; border-radius:4px;">${pOpts.replace(`value="${GlobalMission.m5TriggerPort}"`,`selected value="${GlobalMission.m5TriggerPort}"`)}</select>
                <select onchange="GlobalMission.m5SensorType=this.value; refreshGlobalRows();" style="padding:6px; border-radius:4px;"><option value="distance" ${GlobalMission.m5SensorType==='distance'?'selected':''}>👁️ IR</option><option value="tilt" ${GlobalMission.m5SensorType==='tilt'?'selected':''}>📐 TILT</option></select>
                <select onchange="GlobalMission.m5Operator=this.value; updateField()" style="padding:6px; border-radius:4px;"><option value="<" ${GlobalMission.m5Operator==='<'?'selected':''}> < </option><option value="==" ${GlobalMission.m5Operator==='=='?'selected':''}> = </option><option value=">" ${GlobalMission.m5Operator==='>'?'selected':''}> > </option></select>
                <select onchange="GlobalMission.m5TriggerVal=parseInt(this.value); updateField()" style="padding:6px; border-radius:4px;">${vDrop}</select>
            </div>
        </div>`;
        let states = GlobalMission.states.map((st, sIdx) => `
            <div style="background:white; border:1px solid #e5e8e8; padding:15px; margin-bottom:12px; border-left:6px solid #e67e22; border-radius:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
                    <strong style="color:#d35400; font-size:13px;">STATE ${sIdx + 1}</strong> 
                    <button onclick="removeState(${sIdx})" style="color:#c0392b; background:none; border:none; cursor:pointer; font-weight:bold; font-size:11px;">🗑️ HAPUS</button>
                </div>
                ${st.actions.map((act, aIdx) => renderActionItem(sIdx, aIdx, act, pOpts, 'm5')).join('')}
                <button class="btn" style="font-size:10px; padding:8px 12px; background:#f4f6f7; margin-top:8px; border:1px solid #d5dbdb; border-radius:6px; font-weight:bold;" onclick="addActionToState(${sIdx})">+ TAMBAH MOTOR PARALEL</button>
            </div>`).join('');
        container.innerHTML = header + states + `<button class="btn btn-success" style="width:100%; padding:12px; font-weight:bold; font-size:13px; border-radius:8px;" onclick="addState()">➕ TAMBAH TAHAP BARU (STATE)</button>`;
    
    } else if (GlobalMission.type === 'm3') {
        let defBox = `
        <div style="background:#e8f8f5; border:2px solid #1abc9c; border-radius:10px; padding:15px; margin-bottom:15px;">
            <div style="font-size:12px; font-weight:bold; color:#16a085; margin-bottom:10px;">🟢 KONDISI BAWAAN (DEFAULT):</div>
            ${GlobalMission.defaultActions.map((act, aIdx) => renderActionItem('def', aIdx, act, pOpts, 'm3_def')).join('')}
            <button class="btn" style="font-size:10px; padding:8px 12px; background:white; margin-top:8px; border:1px solid #1abc9c; color:#16a085; border-radius:6px; font-weight:bold;" onclick="addDefaultAction()">+ TAMBAH AKSI DEFAULT</button>
        </div>`;
        
        let rows = GlobalMission.rows.map((row, rIdx) => {
            const vDrop = row.sensorType === 'distance' ? getIrOptions(row.threshold) : getTiltOptions(row.threshold);
            
            let stepsHtml = row.steps.map((step, sIdx) => `
                <div style="background:#f0f3f4; padding:10px; border-radius:8px; border:1px solid #d5dbdb; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size:11px; font-weight:bold; color:#2c3e50;">LANGKAH REAKSI ${sIdx+1}:</span>
                        <div>
                            <span style="font-size:11px; color:#7f8c8d;">Waktu:</span> 
                            <input type="number" step="0.5" min="0" value="${step.time}" style="width:50px; padding:4px; border-radius:4px; border:1px solid #ccc; font-size:11px;" oninput="updateActionVal('m3_time', '${rIdx}', null, 'time', parseFloat(this.value), ${sIdx})"> <span style="font-size:10px;">dtk</span>
                            <span onclick="removeStepFromRow(${rIdx}, ${sIdx})" style="cursor:pointer; color:red; margin-left:10px; font-size:12px;">🗑️</span>
                        </div>
                    </div>
                    ${step.actions.map((act, aIdx) => renderActionItem(rIdx, aIdx, act, pOpts, 'm3_seq', sIdx)).join('')}
                    <button class="btn" style="font-size:9px; padding:4px 8px; background:white; border:1px solid #bdc3c7; margin-top:4px; border-radius:4px;" onclick="addActionToStep(${rIdx}, ${sIdx})">+ MOTOR PARALEL</button>
                </div>
            `).join('');

            return `
            <div style="background:white; border:2px solid #e74c3c; border-radius:10px; padding:15px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
                    <div style="background:#fcebe6; padding:8px 12px; border-radius:8px; display:flex; gap:6px; align-items:center; border:1px solid #fadbd8; font-size:12px;">
                        <strong style="color:#c0392b;">⚡ PEMICU:</strong> <select onchange="GlobalMission.rows[${rIdx}].sensorPort=this.value; updateField()" style="padding:4px; border-radius:4px;">${pOpts.replace(`value="${row.sensorPort}"`,`selected value="${row.sensorPort}"`)}</select>
                        <select onchange="GlobalMission.rows[${rIdx}].sensorType=this.value; refreshGlobalRows();" style="padding:4px; border-radius:4px;"><option value="distance" ${row.sensorType==='distance'?'selected':''}>👁️ IR</option><option value="tilt" ${row.sensorType==='tilt'?'selected':''}>📐 TILT</option></select>
                        <select onchange="GlobalMission.rows[${rIdx}].operator=this.value; updateField()" style="padding:4px; border-radius:4px;"><option value="<" ${row.operator==='<'?'selected':''}> < </option><option value="==" ${row.operator==='=='?'selected':''}> = </option><option value=">" ${row.operator==='>'?'selected':''}> > </option></select>
                        <select onchange="GlobalMission.rows[${rIdx}].threshold=parseInt(this.value); updateField()" style="padding:4px; border-radius:4px;">${vDrop}</select>
                    </div>
                    <button onclick="removeGlobalRow(${rIdx})" style="color:white; background:#e74c3c; border:none; padding:6px 10px; border-radius:6px; font-size:10px; font-weight:bold;">🗑️ HAPUS KONDISI</button>
                </div>
                <div style="background:#f9f9f9; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <div style="font-size:11px; font-weight:bold; margin-bottom:8px; color:#34495e;">REAKSI BERANTAI (TULI SEMENTARA):</div>
                    ${stepsHtml}
                    <button class="btn" style="font-size:10px; padding:6px 10px; background:#ecf0f1; border:1px dashed #7f8c8d; margin-top:5px; border-radius:6px; font-weight:bold;" onclick="addStepToRow(${rIdx})">➕ TAMBAH LANGKAH WAKTU BARU</button>
                </div>
            </div>`;
        }).join('');
        container.innerHTML = defBox + rows + `<button class="btn btn-danger" style="width:100%; padding:12px; font-weight:bold; font-size:13px; border-radius:8px;" onclick="addGlobalRow()">➕ TAMBAH KONDISI PEMICU BARU</button>`;
    
    } else {
        // MODE 1, 2, 4
        let rows = GlobalMission.rows.map((row, rIdx) => {
            let trigger = '';
            if (GlobalMission.type === 'm2') trigger = `<span>⏱️ SELAMA</span> <input type="number" value="${row.time}" style="width:50px; padding:6px; border-radius:4px; border:1px solid #ccc;" oninput="updateActionVal('m2_time', '${rIdx}', null, 'time', parseFloat(this.value))"> <strong>DETIK</strong>`;
            
            if (GlobalMission.type === 'm4') {
                const vDrop = row.sensorType === 'distance' ? getIrOptions(row.threshold) : getTiltOptions(row.threshold);
                trigger = `<div style="background:#ebf5fb; padding:8px 12px; border-radius:8px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:12px; border:1px solid #a9cce3;">
                    <strong style="color:#2980b9;">🔑 JIKA TERSENGGOL:</strong> <select onchange="GlobalMission.rows[${rIdx}].sensorPort=this.value; updateField()" style="padding:4px; border-radius:4px;">${pOpts.replace(`value="${row.sensorPort}"`,`selected value="${row.sensorPort}"`)}</select>
                    <select onchange="GlobalMission.rows[${rIdx}].sensorType=this.value; refreshGlobalRows();" style="padding:4px; border-radius:4px;"><option value="distance" ${row.sensorType==='distance'?'selected':''}>👁️ IR</option><option value="tilt" ${row.sensorType==='tilt'?'selected':''}>📐 TILT</option></select>
                    <select onchange="GlobalMission.rows[${rIdx}].operator=this.value; updateField()" style="padding:4px; border-radius:4px;"><option value="<" ${row.operator==='<'?'selected':''}> < </option><option value="==" ${row.operator==='=='?'selected':''}> = </option><option value=">" ${row.operator==='>'?'selected':''}> > </option></select>
                    <select onchange="GlobalMission.rows[${rIdx}].threshold=parseInt(this.value); updateField()" style="padding:4px; border-radius:4px;">${vDrop}</select>
                </div>`;
            }

            return `
            <div style="background:white; border:1px solid #bdc3c7; padding:15px; margin-bottom:12px; border-radius:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                    ${GlobalMission.type === 'm4' ? trigger : `<strong style="font-size:13px; color:#34495e;">BARIS AKSI ${rIdx+1}</strong> ${trigger}`}
                    <button onclick="removeGlobalRow(${rIdx})" style="color:white; background:#e74c3c; border:none; padding:6px 12px; border-radius:6px; font-size:10px; font-weight:bold;">🗑️ HAPUS</button>
                </div>
                <div style="background:#f4f6f7; padding:12px; border-radius:8px; border:1px solid #e5e8e8;">
                    <div style="font-size:11px; font-weight:bold; margin-bottom:8px; color:#2c3e50;">KUNCI AKSI MOTOR:</div>
                    ${row.actions.map((act, aIdx) => renderActionItem(rIdx, aIdx, act, pOpts, 'normal')).join('')}
                    <button class="btn" style="font-size:10px; padding:8px 12px; background:white; border:1px solid #bdc3c7; margin-top:6px; border-radius:6px; font-weight:bold;" onclick="addActionToRow(${rIdx})">+ TAMBAH MOTOR PARALEL</button>
                </div>
            </div>`;
        }).join('');
        container.innerHTML = rows + `<button class="btn btn-success" style="width:100%; padding:12px; font-weight:bold; font-size:13px; border-radius:8px;" onclick="addGlobalRow()">➕ TAMBAH BLOK BARU</button>`;
    }
};

// FIX BUG KUTIP ('${rIdx}')
function renderActionItem(rIdx, aIdx, act, opts, mode, stepIdx = null) {
    let removeFn = `removeActionFromRow(${rIdx}, ${aIdx})`;
    if (mode === 'm5') removeFn = `removeActionFromState(${rIdx}, ${aIdx})`;
    if (mode === 'm3_def') removeFn = `removeDefaultAction(${aIdx})`;
    if (mode === 'm3_seq') removeFn = `removeActionFromStep(${rIdx}, ${stepIdx}, ${aIdx})`;
    
    return `<div style="display:flex; gap:8px; align-items:center; margin-bottom:8px; padding:8px 10px; background:white; border-radius:8px; border:1px solid #d5dbdb; font-size:12px; flex-wrap:wrap;">
        <select onchange="updateActionVal('${mode}', '${rIdx}', ${aIdx}, 'port', this.value, ${stepIdx}); updateField(this)" style="padding:6px; border-radius:4px; border:1px solid #ccc; font-weight:bold;">${opts.replace(`value="${act.port}"`,`selected value="${act.port}"`)}</select>
        <select onchange="updateActionVal('${mode}', '${rIdx}', ${aIdx}, 'direction', parseInt(this.value), ${stepIdx}); updateField(this)" style="padding:6px; border-radius:4px; border:1px solid #ccc;">
            <option value="1" ${act.direction===1?'selected':''}>⏩ MAJU</option>
            <option value="-1" ${act.direction===-1?'selected':''}>⏪ MUNDUR</option>
            <option value="0" ${act.direction===0?'selected':''}>🛑 STOP (DIAM)</option>
        </select>
        <span style="color:#7f8c8d; font-size:11px; margin-left:4px;">Speed:</span>
        <input type="number" step="10" max="100" min="0" value="${act.speed}" style="width:55px; padding:6px; border-radius:4px; border:1px solid #ccc; text-align:center;" oninput="updateActionVal('${mode}', '${rIdx}', ${aIdx}, 'speed', parseInt(this.value), ${stepIdx}); highlightField(this)">
        <span onclick="${removeFn}" style="cursor:pointer; color:#e74c3c; font-size:14px; font-weight:bold; margin-left:auto; padding:4px;">❌</span>
    </div>`;
}

// FUNGSI INTI UI DENGAN STRING PARSER
window.updateActionVal = function(mode, rIdxStr, aIdx, key, val, stepIdx) {
    let rIdx = (rIdxStr === 'def' || rIdxStr === 'null') ? rIdxStr : parseInt(rIdxStr);
    
    if (mode === 'm5') GlobalMission.states[rIdx].actions[aIdx][key] = val;
    else if (mode === 'm3_def') GlobalMission.defaultActions[aIdx][key] = val;
    else if (mode === 'm3_seq') GlobalMission.rows[rIdx].steps[stepIdx].actions[aIdx][key] = val;
    else if (mode === 'm3_time') GlobalMission.rows[rIdx].steps[stepIdx][key] = val;
    else if (mode === 'm2_time') GlobalMission.rows[rIdx][key] = val;
    else GlobalMission.rows[rIdx].actions[aIdx][key] = val;
};

window.updateField = function() {}; 
window.highlightField = function(elem) { elem.style.backgroundColor = '#e8f8f5'; setTimeout(()=>elem.style.backgroundColor='white', 300); };

window.updateGlobalType = function() {
    GlobalMission.type = document.getElementById('global-type').value;
    GlobalMission.defaultActions = [{ port: 'A', direction: 0, speed: 0 }];
    GlobalMission.states = [{ actions: [{ port: 'A', direction: 1, speed: 100 }] }];
    if (GlobalMission.type === 'm3') {
        GlobalMission.rows = [{ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, steps: [{ time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }] }];
    } else {
        GlobalMission.rows = [{ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }];
    }
    renderMissionUI();
};

window.addGlobalRow = () => { 
    if(GlobalMission.type === 'm3') GlobalMission.rows.push({ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, steps: [{ time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }] });
    else GlobalMission.rows.push({ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }); 
    refreshGlobalRows(); 
};
window.removeGlobalRow = (idx) => { if(GlobalMission.rows.length > 1) { GlobalMission.rows.splice(idx, 1); refreshGlobalRows(); } };
window.addActionToRow = (rIdx) => { GlobalMission.rows[rIdx].actions.push({ port: 'A', direction: 1, speed: 100 }); refreshGlobalRows(); };
window.removeActionFromRow = (rIdx, aIdx) => { if(GlobalMission.rows[rIdx].actions.length > 1) { GlobalMission.rows[rIdx].actions.splice(aIdx, 1); refreshGlobalRows(); } };

window.addStepToRow = (rIdx) => { GlobalMission.rows[rIdx].steps.push({ time: 1, actions: [{ port: 'A', direction: 1, speed: 100 }] }); refreshGlobalRows(); };
window.removeStepFromRow = (rIdx, sIdx) => { if(GlobalMission.rows[rIdx].steps.length > 1) { GlobalMission.rows[rIdx].steps.splice(sIdx, 1); refreshGlobalRows(); } };
window.addActionToStep = (rIdx, sIdx) => { GlobalMission.rows[rIdx].steps[sIdx].actions.push({ port: 'A', direction: 1, speed: 100 }); refreshGlobalRows(); };
window.removeActionFromStep = (rIdx, sIdx, aIdx) => { if(GlobalMission.rows[rIdx].steps[sIdx].actions.length > 1) { GlobalMission.rows[rIdx].steps[sIdx].actions.splice(aIdx, 1); refreshGlobalRows(); } };

window.addState = () => { GlobalMission.states.push({ actions: [{ port: 'A', direction: 1, speed: 100 }] }); refreshGlobalRows(); };
window.removeState = (idx) => { if(GlobalMission.states.length > 1) { GlobalMission.states.splice(idx, 1); refreshGlobalRows(); } };
window.addActionToState = (idx) => { GlobalMission.states[idx].actions.push({ port: 'A', direction: 1, speed: 100 }); refreshGlobalRows(); };
window.removeActionFromState = (sIdx, aIdx) => { if(GlobalMission.states[sIdx].actions.length > 1) { GlobalMission.states[sIdx].actions.splice(aIdx, 1); refreshGlobalRows(); } };

window.addDefaultAction = () => { GlobalMission.defaultActions.push({ port: 'A', direction: 0, speed: 0 }); refreshGlobalRows(); };
window.removeDefaultAction = (aIdx) => { if(GlobalMission.defaultActions.length > 1) { GlobalMission.defaultActions.splice(aIdx, 1); refreshGlobalRows(); } };

function getIrOptions(sel) { let o=''; for(let i=0;i<=10;i++) o+=`<option value="${i}" ${sel===i?'selected':''}>${i}</option>`; return o; }
function getTiltOptions(sel) { return [0,3,5,7,9].map(v=>`<option value="${v}" ${sel===v?'selected':''}>${v}</option>`).join(''); }

window.applyPresetColor = function(hex) { document.getElementById('global-color').value = hex; setGlobalColor(); };
window.setGlobalColor = async function() {
    const rgb = hexToRgb(document.getElementById('global-color').value);
    for (let r of AppState.robots) { r.currentColor = rgb; await setRGB(r.id, rgb.r, rgb.g, rgb.b); await new Promise(res => setTimeout(res, 50)); }
};
window.setLocalColor = async function(entId, hex) {
    const rgb = hexToRgb(hex);
    const ent = getPlayableEntities().find(e => e.id === entId);
    const master = AppState.robots.find(r => r.id === ent.hub1);
    if (master) { master.currentColor = rgb; await setRGB(master.id, rgb.r, rgb.g, rgb.b); if (ent.hub2) await setRGB(ent.hub2, rgb.r, rgb.g, rgb.b); }
};

window.toggleReady = function(entId) {
    const master = AppState.robots.find(r => r.id === getPlayableEntities().find(e => e.id === entId).hub1);
    if (master) { master.isReady = !master.isReady; master.stateIndex = 0; master.isDetecting = false; renderMissionUI(); }
};

window.executeHardware = async function(entId, portChar, val) {
    const ent = getPlayableEntities().find(e => e.id === entId);
    if (!ent) return;
    let targetHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
    let targetPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    if (targetHub) await setMotor(targetHub, targetPort, val);
};

// =========================================================
// THE INDUSTRIAL ENGINE (DUAL CORE: LOGIC + KEEPALIVE)
// =========================================================
window.runLocal = async function(entId) {
    const ent = getPlayableEntities().find(e => e.id === entId);
    const master = AppState.robots.find(r => r.id === ent.hub1);
    if (!master) return;
    
    master.isRunning = true;
    master.stateIndex = 1; 
    master.isDetecting = false;
    master.logicLock = false; 
    master.currentActions = []; 
    
    if (master.keepAlive) clearInterval(master.keepAlive);
    if (master.logicLoop) clearInterval(master.logicLoop);
    renderMissionUI(); 
    
    // CORE 1: KEEPALIVE WATCHDOG (400ms)
    master.keepAlive = setInterval(async () => {
        if (!master.isRunning || !master.currentActions) return;
        for (let act of master.currentActions) {
            await executeHardware(entId, act.port, act.speed * act.direction);
        }
    }, 400);

    // CORE 2: LOGIC EVALUATOR (100ms)
    master.logicLoop = setInterval(async () => {
        if (!master.isRunning) return;
        if (master.logicLock) return; 
        
        const txt = document.getElementById(`state-text-${ent.hub1}`);

        if (GlobalMission.type === 'm1') {
            master.currentActions = GlobalMission.rows[0].actions;
            if (txt) txt.innerText = `STATUS: [ JALAN TERUS ]`;
        }
        
        else if (GlobalMission.type === 'm2') {
            const row = GlobalMission.rows[master.stateIndex - 1];
            if (!row) { stopLocal(entId); return; } 
            
            master.logicLock = true; 
            if (txt) txt.innerText = `TAHAP WAKTU AKTIF: [ ${master.stateIndex} ]`;
            master.currentActions = row.actions;
            
            await sleep(row.time * 1000); 
            if(master.isRunning) { master.stateIndex++; master.logicLock = false; }
        }

        else if (GlobalMission.type === 'm3') {
            let triggeredRow = null;
            for (let row of GlobalMission.rows) {
                const sHub = (row.sensorPort === 'A' || row.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                // Clamping sudah aktif di dalam getSensorVal
                const val = getSensorVal(sHub, row.sensorPort, row.sensorType); 
                
                let hit = false;
                if (row.operator === '<') hit = val < row.threshold;
                else if (row.operator === '==') hit = Math.round(val) === row.threshold;
                else if (row.operator === '>') hit = val > row.threshold;
                
                if (hit) { triggeredRow = row; break; } 
            }
            
            if (triggeredRow) {
                master.logicLock = true; 
                if (txt) txt.innerText = `STATUS: [ ⚡ MANUVER REAKSI ]`;
                
                for (let step of triggeredRow.steps) {
                    if(!master.isRunning) break;
                    master.currentActions = step.actions;
                    await sleep(step.time * 1000); 
                }
                if(master.isRunning) master.logicLock = false; 
            } else {
                if (txt) txt.innerText = `STATUS: [ 🟢 NORMAL BAWAAN ]`;
                master.currentActions = GlobalMission.defaultActions;
            }
        }

        else if (GlobalMission.type === 'm4') {
            let hitTrigger = false;
            for (let row of GlobalMission.rows) {
                const sHub = (row.sensorPort === 'A' || row.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                const val = getSensorVal(sHub, row.sensorPort, row.sensorType);
                
                let hit = false;
                if (row.operator === '<') hit = val < row.threshold;
                else if (row.operator === '==') hit = Math.round(val) === row.threshold;
                else if (row.operator === '>') hit = val > row.threshold;
                
                if (hit) { 
                    master.currentActions = row.actions; 
                    hitTrigger = true; 
                    break; 
                }
            }
            if (txt) txt.innerText = master.currentActions.length > 0 ? `MEMORI AKSI: [ TERKUNCI 🔒 ]` : `MEMORI AKSI: [ KOSONG ⚪ ]`;
        }

        else if (GlobalMission.type === 'm5') {
            const state = GlobalMission.states[master.stateIndex - 1];
            if (!state) { master.stateIndex = 1; return; }
            
            master.currentActions = state.actions;
            
            const sHub = (GlobalMission.m5TriggerPort === 'A' || GlobalMission.m5TriggerPort === 'B') ? ent.hub1 : ent.hub2;
            const val = getSensorVal(sHub, GlobalMission.m5TriggerPort, GlobalMission.m5SensorType);
            
            let hit = false;
            if (GlobalMission.m5Operator === '<') hit = val < GlobalMission.m5TriggerVal;
            else if (GlobalMission.m5Operator === '==') hit = Math.round(val) === GlobalMission.m5TriggerVal;
            else if (GlobalMission.m5Operator === '>') hit = val > GlobalMission.m5TriggerVal;
            
            if (hit && !master.isDetecting) {
                master.isDetecting = true;
                master.stateIndex++;
                if (master.stateIndex > GlobalMission.states.length) master.stateIndex = 1;
            } else if (!hit) {
                master.isDetecting = false;
            }
            if (txt) txt.innerText = `STATE SIKLUS: [ ${master.stateIndex} ]`;
        }
        
    }, 100); 
};

window.stopLocal = async function(entId) {
    const ent = getPlayableEntities().find(e => e.id === entId);
    const master = AppState.robots.find(r => r.id === ent.hub1);
    if (master) {
        master.isRunning = false; 
        master.logicLock = false;
        master.currentActions = [];
        if (master.keepAlive) clearInterval(master.keepAlive);
        if (master.logicLoop) clearInterval(master.logicLoop);
    }
    await executeHardware(entId, 'A', 0); await executeHardware(entId, 'B', 0);
    await executeHardware(entId, 'C', 0); await executeHardware(entId, 'D', 0);
    
    const txt = document.getElementById(`state-text-${ent.hub1}`);
    if (txt) txt.innerText = `INFO: [ STANDBY ]`;
    
    renderMissionUI();
};

window.broadcastMission = function() {
    GlobalMission.isExecuting = !GlobalMission.isExecuting;
    if (GlobalMission.isExecuting) {
        getPlayableEntities().forEach(ent => {
            const m = AppState.robots.find(r => r.id === ent.hub1);
            if (m && m.isReady) runLocal(ent.id);
        });
    } else {
        stopAllMissions();
    }
    renderMissionUI();
};

window.stopAllMissions = async function() {
    GlobalMission.isExecuting = false;
    for (let r of AppState.robots) {
        r.isRunning = false; r.logicLock = false; r.currentActions = [];
        if (r.keepAlive) clearInterval(r.keepAlive);
        if (r.logicLoop) clearInterval(r.logicLoop);
        await setMotor(r.id, 1, 0); await setMotor(r.id, 2, 0);
    }
    renderMissionUI();
};

window.renderDashboard = () => renderMissionUI();