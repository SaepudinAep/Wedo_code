/* =========================================================
   MODUL 5: MISSION.JS (v29.0 - EXPANDED PRO VERSION)
   Status: NO CLEANING - NO COMPRESSION - 100% INTEGRITY
   Features: Dual-Core 100ms, Sensor Clamping, RSSI UI, Anti-Reset
========================================================= */

window.GlobalMission = {
    type: 'm1',
    m5SensorType: 'distance', 
    m5TriggerPort: 'A',
    m5Operator: '<',
    m5TriggerVal: 5, 
    defaultActions: [
        { port: 'A', direction: 0, speed: 0 }
    ], 
    states: [
        { actions: [{ port: 'A', direction: 1, speed: 100 }] }
    ],
    rows: [
        { 
            sensorPort: 'A', 
            sensorType: 'distance', 
            operator: '<', 
            threshold: 5, 
            steps: [
                { time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }
            ] 
        }
    ],
    isExecuting: false,
    activatedPorts: new Set() 
};

const PRESET_COLORS = [
    { name: 'Red', hex: '#FF0000' }, 
    { name: 'Green', hex: '#00FF00' }, 
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Yellow', hex: '#FFFF00' }, 
    { name: 'Purple', hex: '#9966FF' }, 
    { name: 'Cyan', hex: '#00FFFF' }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

window.hexToRgb = function(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return { 
            r: parseInt(result[1], 16), 
            g: parseInt(result[2], 16), 
            b: parseInt(result[3], 16) 
        };
    } else {
        return { r: 0, g: 0, b: 255 };
    }
};

window.rgbToHex = function(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

// =========================================================
// SENSOR ENGINE WITH CLAMPING (ANTI -- ERROR)
// =========================================================
window.getSensorVal = function(hubId, portChar, sType) {
    const pNum = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    const div = document.getElementById('sens' + pNum + '-' + hubId);
    
    if (!div || div.innerText === '--' || div.innerText.trim() === '') {
        if (sType === 'distance') return 10;
        return 0;
    }
    
    let val = parseFloat(div.innerText);
    if (isNaN(val)) {
        if (sType === 'distance') return 10;
        return 0;
    }
    
    if (sType === 'distance') {
        if (val > 10) val = 10;
        if (val < 0) val = 0;
    }
    
    return val;
};

window.handlePhysicalButton = function(hubId) {
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    const ent = entities.find(e => e.hub1 === hubId || e.hub2 === hubId);
    if (!ent) return;

    const master = AppState.robots.find(r => r.id === ent.hub1);
    if (master) {
        if (master.isRunning) {
            stopLocal(ent.id);
        } else {
            runLocal(ent.id);
        }
    }
};

window.setupGlobalSensor = async function(portChar, type, btnElem) {
    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    if (entities.length === 0) return;
    
    const originalText = btnElem.innerText;
    btnElem.innerText = "⏳";
    
    if (type === 'unset') {
        GlobalMission.activatedPorts.delete(portChar);
    } else {
        GlobalMission.activatedPorts.add(portChar);
    }

    for (let ent of entities) {
        const sHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
        const sPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
        
        if (sHub && typeof setupSensor === 'function') {
            if (type === 'unset') {
                const r = AppState.robots.find(x => x.id === sHub);
                if (r && r.cmd) {
                    await r.cmd.writeValue(new Uint8Array([0x00, 0x01, sPort])); 
                }
            } else {
                await setupSensor(sHub, sPort, type);
            }
        }
        await sleep(80); 
    }
    btnElem.innerText = originalText;
    renderMissionUI();
};

// =========================================================
// UI RENDERER (EXPANDED - NO HELPER COMPRESSION)
// =========================================================
window.renderMissionUI = function() {
    const container = document.getElementById('dashboard-list');
    if (!container) return;

    let paletteHtml = '';
    for (let c of PRESET_COLORS) {
        paletteHtml += `<div onclick="applyPresetColor('${c.hex}')" style="width:22px; height:22px; border-radius:50%; background:${c.hex}; cursor:pointer; border:1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>`;
    }

    let html = `
        <div class="card" style="padding:10px; border-top: 6px solid var(--primary); box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:14px; color:#2c3e50;">🌍 ROBOPANDA MISSION CONTROL v29</h3>
                <div id="global-status-badge" style="background:${GlobalMission.isExecuting ? 'var(--warning)' : '#eee'}; padding:4px 12px; border-radius:12px; font-size:10px; font-weight:bold; color:#2c3e50;">
                    ${GlobalMission.isExecuting ? 'MISSION ACTIVE' : 'SYSTEM STANDBY'}
                </div>
            </div>

            <div style="margin-top:10px; background:#f0f8ff; padding:8px; border-radius:8px; border:1px solid #d1e9ff;">
                <label style="font-size:10px; font-weight:bold; color:#2c3e50; margin-bottom:5px; display:block;">📡 SENSOR GLOBAL:</label>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:5px;">
                    ${['A', 'B', 'C', 'D'].map(p => `
                        <div style="background:white; padding:5px; border-radius:6px; border:1px solid #ddd; font-size:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                                <strong style="color:#2980b9;">Port ${p}</strong>
                                <span style="cursor:pointer; color:#e74c3c; font-size:9px; font-weight:bold;" onclick="setupGlobalSensor('${p}','unset',this)">OFF</span>
                            </div>
                            <div style="display:flex; gap:3px;">
                                <button style="flex:1; font-size:9px; padding:3px; background:#9B59B6; color:white; border:none; border-radius:3px; cursor:pointer;" onclick="setupGlobalSensor('${p}','distance',this)">IR</button>
                                <button style="flex:1; font-size:9px; padding:3px; background:#3498db; color:white; border:none; border-radius:3px; cursor:pointer;" onclick="setupGlobalSensor('${p}','tilt',this)">TLT</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top:10px; padding:10px; border-radius:8px; background:#fff; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                    <div style="display:flex; gap:5px; align-items:center;">
                        <span style="font-size:10px; font-weight:bold; color:#7f8c8d;">LED:</span>
                        <div style="display:flex; gap:5px;">${paletteHtml}</div>
                    </div>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <input type="color" id="global-color" value="#9966FF" style="width:25px; height:25px; border:none; cursor:pointer; background:none;">
                        <button class="btn btn-primary" style="padding:4px 10px; font-size:10px; font-weight:bold;" onclick="setGlobalColor()">SET COLOR</button>
                    </div>
                </div>
                
                <select id="global-type" style="width:100%; margin-bottom:10px; padding:10px; border-radius:8px; font-weight:bold; font-size:13px; border:2px solid #bdc3c7; color:#2c3e50; background:white;" onchange="updateGlobalType()">
                    <option value="m1" ${GlobalMission.type === 'm1' ? 'selected' : ''}>🕹️ 1. DIRECT DRIVE (Normal)</option>
                    <option value="m2" ${GlobalMission.type === 'm2' ? 'selected' : ''}>⏱️ 2. TIMER SEQUENCE (Waktu)</option>
                    <option value="m3" ${GlobalMission.type === 'm3' ? 'selected' : ''}>🧠 3. IR SENSOR (Reaksi Berantai)</option>
                    <option value="m4" ${GlobalMission.type === 'm4' ? 'selected' : ''}>📐 4. TILT SENSOR (Kunci Persneling)</option>
                    <option value="m5" ${GlobalMission.type === 'm5' ? 'selected' : ''}>🔄 5. STATE COUNTER (Siklus)</option>
                </select>

                <div id="global-rows-container"></div>
                
                <div style="display:flex; gap:8px; margin-top:15px;">
                    <button id="btn-global-start" class="btn btn-warning" style="flex:2; padding:15px; font-weight:bold; font-size:13px; color:#2c3e50; border-radius:10px; box-shadow: 0 4px 0 #d4ac0d;" onclick="broadcastMission()">🚀 JALANKAN SEMUA READY</button>
                    <button class="btn btn-danger" style="flex:1; padding:15px; font-weight:bold; font-size:13px; border-radius:10px; box-shadow: 0 4px 0 #922b21;" onclick="stopAllMissions()">🛑 STOP ALL</button>
                </div>
            </div>
        </div>
        
        <div id="individual-cards-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px; margin-top:10px;">
    `;

    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    for (let ent of entities) {
        const master = AppState.robots.find(r => r.id === ent.hub1);
        const isReady = master && master.isReady;
        const isRun = master && master.isRunning;
        let hexColor = (master && master.currentColor) ? rgbToHex(master.currentColor.r, master.currentColor.g, master.currentColor.b) : "#0000ff";

        let activeSensors = [];
        if (GlobalMission.activatedPorts.has('A')) activeSensors.push({ label: 'P1', id: `sens1-${ent.hub1}` });
        if (GlobalMission.activatedPorts.has('B')) activeSensors.push({ label: 'P2', id: `sens2-${ent.hub1}` });
        
        if (ent.hub2) {
            if (GlobalMission.activatedPorts.has('C')) activeSensors.push({ label: 'P3', id: `sens1-${ent.hub2}` });
            if (GlobalMission.activatedPorts.has('D')) activeSensors.push({ label: 'P4', id: `sens2-${ent.hub2}` });
        }

        html += `
        <div id="card-${ent.id}" class="card" style="padding:12px; border-left: 6px solid ${isReady ? '#2ecc71' : '#bdc3c7'}; background:${isRun ? '#fffdf0' : '#fff'}; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <strong style="font-size:14px; color:#2c3e50;">🤖 ${ent.name}</strong>
                        <input type="color" value="${hexColor}" onchange="setLocalColor('${ent.id}', this.value)" style="width:18px; height:18px; border:none; border-radius:4px; cursor:pointer; background:none;">
                    </div>
                    <div id="rssi-${ent.hub1}" style="font-size:9px; font-weight:bold; color:#7f8c8d; margin-top:3px; font-family:monospace;">📶 -- dBm (Standby)</div>
                </div>
                <button class="btn" style="padding:6px 12px; font-size:10px; font-weight:bold; background:${isReady ? '#2ecc71' : '#34495e'}; color:white; border-radius:6px; border:none; cursor:pointer;" onclick="toggleReady('${ent.id}')">
                    ${isReady ? '✅ READY' : '🔘 SET'}
                </button>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap:5px; margin:10px 0;">
                ${activeSensors.map(s => `
                    <div style="background:#f8f9fa; border:1px solid #eee; padding:4px; border-radius:5px; font-size:10px; text-align:center;">
                        <b style="color:#7f8c8d;">${s.label}:</b> 
                        <span id="${s.id}" style="color:#2980b9; font-weight:bold; font-family:monospace;">--</span>
                    </div>
                `).join('')}
            </div>
            
            <div id="state-text-${ent.hub1}" style="font-size:10px; color:#d35400; margin-top:5px; text-align:center; font-weight:bold; background:#fff9e6; padding:6px; border-radius:6px; border:1px solid #f9e79f;">
                INFO: [ WAITING ]
            </div>
            
            <div style="display:flex; gap:6px; margin-top:10px;">
                <button class="btn" style="flex:1; background:#f1c40f; color:#2c3e50; font-weight:bold; padding:10px; font-size:11px; border-radius:8px; border:none; cursor:pointer;" onclick="runLocal('${ent.id}')">▶️ START</button>
                <button class="btn" style="flex:1; background:#e74c3c; color:white; font-weight:bold; padding:10px; font-size:11px; border-radius:8px; border:none; cursor:pointer;" onclick="stopLocal('${ent.id}')">🛑 STOP</button>
            </div>
        </div>`;
    }

    container.innerHTML = html + `</div>`;
    refreshGlobalRows();
};

window.refreshGlobalRows = function() {
    const container = document.getElementById('global-rows-container');
    if (!container) return;

    const entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    const hasGroup = entities.some(e => e.type === 'group');
    
    let pOpts = `<option value="A">Port A</option><option value="B">Port B</option>`;
    if (hasGroup) {
        pOpts += `<option value="C">Port C</option><option value="D">Port D</option>`;
    }

    if (GlobalMission.type === 'm3') {
        // --- MODE 3: IR REAKSI BERANTAI ---
        let defHtml = `<div style="background:#e8f8f5; border:2px solid #1abc9c; border-radius:10px; padding:10px; margin-bottom:10px;">
            <div style="font-size:11px; font-weight:bold; color:#16a085; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
                🟢 KONDISI NORMAL (DEFAULT)
            </div>`;
        
        for (let aIdx = 0; aIdx < GlobalMission.defaultActions.length; aIdx++) {
            let act = GlobalMission.defaultActions[aIdx];
            defHtml += `
            <div style="display:flex; gap:5px; align-items:center; margin-bottom:5px; padding:5px; background:#fff; border-radius:6px; border:1px solid #d1f2eb;">
                <select onchange="updateActionVal('m3_def', 'def', ${aIdx}, 'port', this.value)" style="font-size:10px; padding:3px; border-radius:4px;">
                    ${pOpts.replace(`value="${act.port}"`, `selected value="${act.port}"`)}
                </select>
                <select onchange="updateActionVal('m3_def', 'def', ${aIdx}, 'direction', parseInt(this.value))" style="font-size:10px; padding:3px; border-radius:4px;">
                    <option value="1" ${act.direction === 1 ? 'selected' : ''}>⏩ MAJU</option>
                    <option value="-1" ${act.direction === -1 ? 'selected' : ''}>⏪ MUNDUR</option>
                    <option value="0" ${act.direction === 0 ? 'selected' : ''}>🛑 STOP</option>
                </select>
                <span style="font-size:9px; color:#95a5a6;">Spd:</span>
                <input type="number" value="${act.speed}" style="width:35px; font-size:10px; text-align:center;" oninput="updateActionVal('m3_def', 'def', ${aIdx}, 'speed', parseInt(this.value))">
                <span onclick="removeDefaultAction(${aIdx})" style="cursor:pointer; color:#e74c3c; font-weight:bold; margin-left:auto; padding:0 5px;">×</span>
            </div>`;
        }
        defHtml += `<button style="font-size:9px; padding:4px 10px; background:white; border:1px solid #1abc9c; color:#16a085; border-radius:5px; font-weight:bold; cursor:pointer;" onclick="addDefaultAction()">+ TAMBAH MOTOR</button></div>`;

        let rowsHtml = '';
        for (let rIdx = 0; rIdx < GlobalMission.rows.length; rIdx++) {
            let row = GlobalMission.rows[rIdx];
            const irDrop = getIrOptions(row.threshold);
            const tltDrop = getTiltOptions(row.threshold);
            const vDrop = row.sensorType === 'distance' ? irDrop : tltDrop;

            let stepsHtml = '';
            for (let sIdx = 0; sIdx < row.steps.length; sIdx++) {
                let step = row.steps[sIdx];
                stepsHtml += `
                <div style="background:#fff; padding:8px; border-radius:8px; border:1px solid #eee; margin-bottom:8px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <span style="font-size:10px; font-weight:bold; color:#34495e;">LANGKAH ${sIdx + 1}:</span>
                        <div style="font-size:10px; display:flex; align-items:center; gap:5px;">
                            <span>⏱️ Waktu:</span>
                            <input type="number" step="0.5" value="${step.time}" style="width:40px; padding:2px; font-size:10px;" oninput="updateActionVal('m3_time', '${rIdx}', null, 'time', parseFloat(this.value), ${sIdx})">
                            <span>dtk</span>
                            <span onclick="removeStepFromRow(${rIdx}, ${sIdx})" style="cursor:pointer; color:#e74c3c; font-weight:bold; margin-left:5px;">🗑️</span>
                        </div>
                    </div>`;
                
                for (let aIdx = 0; aIdx < step.actions.length; aIdx++) {
                    let act = step.actions[aIdx];
                    stepsHtml += `
                    <div style="display:flex; gap:5px; align-items:center; margin-bottom:4px; padding:4px; background:#f9f9f9; border-radius:5px; border:1px solid #f1f1f1;">
                        <select onchange="updateActionVal('m3_seq', '${rIdx}', ${aIdx}, 'port', this.value, ${sIdx})" style="font-size:10px;">
                            ${pOpts.replace(`value="${act.port}"`, `selected value="${act.port}"`)}
                        </select>
                        <select onchange="updateActionVal('m3_seq', '${rIdx}', ${aIdx}, 'direction', parseInt(this.value), ${sIdx})" style="font-size:10px;">
                            <option value="1" ${act.direction === 1 ? 'selected' : ''}>MAJU</option>
                            <option value="-1" ${act.direction === -1 ? 'selected' : ''}>MUNDUR</option>
                            <option value="0" ${act.direction === 0 ? 'selected' : ''}>STOP</option>
                        </select>
                        <input type="number" value="${act.speed}" style="width:35px; text-align:center; font-size:10px;" oninput="updateActionVal('m3_seq', '${rIdx}', ${aIdx}, 'speed', parseInt(this.value), ${sIdx})">
                        <span onclick="removeActionFromStep(${rIdx}, ${sIdx}, ${aIdx})" style="cursor:pointer; color:red; font-weight:bold; margin-left:auto;">×</span>
                    </div>`;
                }
                stepsHtml += `<button style="font-size:9px; padding:3px 8px; background:#f4f6f7; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="addActionToStep(${rIdx}, ${sIdx})">+ MOTOR PARALEL</button></div>`;
            }

            rowsHtml += `
            <div style="background:#fffafa; border:2px solid #e74c3c; border-radius:10px; padding:10px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:5px;">
                    <div style="display:flex; gap:5px; align-items:center; font-size:11px;">
                        <strong style="color:#c0392b;">⚡ JIKA:</strong>
                        <select onchange="GlobalMission.rows[${rIdx}].sensorPort=this.value" style="font-size:10px; padding:2px;">
                            ${pOpts.replace(`value="${row.sensorPort}"`, `selected value="${row.sensorPort}"`)}
                        </select>
                        <select onchange="GlobalMission.rows[${rIdx}].sensorType=this.value; refreshGlobalRows();" style="font-size:10px; padding:2px;">
                            <option value="distance" ${row.sensorType === 'distance' ? 'selected' : ''}>IR</option>
                            <option value="tilt" ${row.sensorType === 'tilt' ? 'selected' : ''}>TLT</option>
                        </select>
                        <select onchange="GlobalMission.rows[${rIdx}].operator=this.value;" style="font-size:10px; padding:2px;">
                            <option value="<" ${row.operator === '<' ? 'selected' : ''}> < </option>
                            <option value="==" ${row.operator === '==' ? 'selected' : ''}> = </option>
                            <option value=">" ${row.operator === '>' ? 'selected' : ''}> > </option>
                        </select>
                        <select onchange="GlobalMission.rows[${rIdx}].threshold=parseInt(this.value);" style="font-size:10px; padding:2px;">
                            ${vDrop}
                        </select>
                    </div>
                    <button onclick="removeGlobalRow(${rIdx})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-weight:bold; font-size:12px;">🗑️</button>
                </div>
                <div style="border-top:1px dashed #fadbd8; padding-top:10px;">
                    <div style="font-size:10px; font-weight:bold; color:#7b241c; margin-bottom:8px;">MANUVER REAKSI (SEQUENCE):</div>
                    ${stepsHtml}
                    <button style="width:100%; font-size:10px; background:#fbeeee; border:1px dashed #e74c3c; color:#c0392b; padding:8px; border-radius:6px; cursor:pointer; font-weight:bold;" onclick="addStepToRow(${rIdx})">+ TAMBAH LANGKAH WAKTU BARU</button>
                </div>
            </div>`;
        }
        container.innerHTML = defHtml + rowsHtml + `<button class="btn btn-danger" style="width:100%; padding:12px; font-weight:bold; font-size:12px; border-radius:8px;" onclick="addGlobalRow()">➕ TAMBAH PEMICU REAKSI BARU</button>`;
    
    } else if (GlobalMission.type === 'm5') {
        // --- MODE 5: STATE COUNTER ---
        let header = `<div style="background:#fdf2e9; padding:12px; border-radius:10px; margin-bottom:12px; font-size:11px; border:1px solid #f5cba7;">
            <strong style="color:#d35400;">⚙️ TRIGGER PINDAH STATE:</strong>
            <div style="display:flex; gap:5px; margin-top:8px; align-items:center;">
                <select onchange="GlobalMission.m5TriggerPort=this.value" style="padding:4px; font-size:10px;">
                    ${pOpts.replace(`value="${GlobalMission.m5TriggerPort}"`, `selected value="${GlobalMission.m5TriggerPort}"`)}
                </select>
                <select onchange="GlobalMission.m5SensorType=this.value; refreshGlobalRows();" style="padding:4px; font-size:10px;">
                    <option value="distance" ${GlobalMission.m5SensorType === 'distance' ? 'selected' : ''}>IR</option>
                    <option value="tilt" ${GlobalMission.m5SensorType === 'tilt' ? 'selected' : ''}>TLT</option>
                </select>
                <select onchange="GlobalMission.m5Operator=this.value" style="padding:4px; font-size:10px;">
                    <option value="<" ${GlobalMission.m5Operator === '<' ? 'selected' : ''}> < </option>
                    <option value="==" ${GlobalMission.m5Operator === '==' ? 'selected' : ''}> = </option>
                    <option value=">" ${GlobalMission.m5Operator === '>' ? 'selected' : ''}> > </option>
                </select>
                <select onchange="GlobalMission.m5TriggerVal=parseInt(this.value);" style="padding:4px; font-size:10px;">
                    ${GlobalMission.m5SensorType === 'distance' ? getIrOptions(GlobalMission.m5TriggerVal) : getTiltOptions(GlobalMission.m5TriggerVal)}
                </select>
            </div>
        </div>`;
        
        let statesHtml = '';
        for (let sIdx = 0; sIdx < GlobalMission.states.length; sIdx++) {
            let state = GlobalMission.states[sIdx];
            statesHtml += `
            <div style="background:white; border:1.5px solid #e67e22; padding:10px; margin-bottom:10px; border-radius:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="color:#d35400; font-size:12px;">STATE ${sIdx + 1}</strong>
                    <button onclick="removeState(${sIdx})" style="color:#c0392b; background:none; border:none; cursor:pointer; font-weight:bold; font-size:11px;">🗑️ HAPUS</button>
                </div>`;
            
            for (let aIdx = 0; aIdx < state.actions.length; aIdx++) {
                let act = state.actions[aIdx];
                statesHtml += `
                <div style="display:flex; gap:5px; align-items:center; margin-bottom:5px; padding:5px; background:#fef5ed; border-radius:6px; border:1px solid #f9e79f; font-size:11px;">
                    <select onchange="updateActionVal('m5', ${sIdx}, ${aIdx}, 'port', this.value)" style="font-size:10px;">
                        ${pOpts.replace(`value="${act.port}"`, `selected value="${act.port}"`)}
                    </select>
                    <select onchange="updateActionVal('m5', ${sIdx}, ${aIdx}, 'direction', parseInt(this.value))" style="font-size:10px;">
                        <option value="1" ${act.direction === 1 ? 'selected' : ''}>MAJU</option>
                        <option value="-1" ${act.direction === -1 ? 'selected' : ''}>MUNDUR</option>
                        <option value="0" ${act.direction === 0 ? 'selected' : ''}>STOP</option>
                    </select>
                    <input type="number" value="${act.speed}" style="width:35px; text-align:center; font-size:10px;" oninput="updateActionVal('m5', ${sIdx}, ${aIdx}, 'speed', parseInt(this.value))">
                    <span onclick="removeActionFromState(${sIdx}, ${aIdx})" style="cursor:pointer; color:red; font-weight:bold; margin-left:auto;">×</span>
                </div>`;
            }
            statesHtml += `<button style="font-size:9px; padding:4px 10px; background:white; border:1px solid #e67e22; color:#d35400; border-radius:5px; font-weight:bold; cursor:pointer;" onclick="addActionToState(${sIdx})">+ TAMBAH MOTOR</button></div>`;
        }
        container.innerHTML = header + statesHtml + `<button class="btn btn-success" style="width:100%; padding:12px; font-weight:bold; font-size:13px; border-radius:8px;" onclick="addState()">➕ TAMBAH TAHAP SIKLUS BARU</button>`;

    } else {
        // --- MODE 1, 2, 4 (SIMPLIFIED ROWS) ---
        let rowsHtml = '';
        for (let rIdx = 0; rIdx < GlobalMission.rows.length; rIdx++) {
            let row = GlobalMission.rows[rIdx];
            let triggerText = '';
            
            if (GlobalMission.type === 'm2') {
                triggerText = `<span style="font-size:10px;">⏱️ WAKTU: <input type="number" value="${row.time}" style="width:45px; padding:3px; font-size:10px;" oninput="updateActionVal('m2_time', '${rIdx}', null, 'time', parseFloat(this.value))"> s</span>`;
            } else if (GlobalMission.type === 'm4') {
                const vDrop = row.sensorType === 'distance' ? getIrOptions(row.threshold) : getTiltOptions(row.threshold);
                triggerText = `<div style="display:flex; gap:3px; align-items:center; font-size:10px;">
                    <strong style="color:#2980b9;">🔑 JIKA:</strong>
                    <select onchange="GlobalMission.rows[${rIdx}].sensorPort=this.value" style="font-size:9px;">${pOpts.replace(`value="${row.sensorPort}"`, `selected value="${row.sensorPort}"`)}</select>
                    <select onchange="GlobalMission.rows[${rIdx}].sensorType=this.value; refreshGlobalRows();" style="font-size:9px;"><option value="distance" ${row.sensorType === 'distance' ? 'selected' : ''}>IR</option><option value="tilt" ${row.sensorType === 'tilt' ? 'selected' : ''}>TLT</option></select>
                    <select onchange="GlobalMission.rows[${rIdx}].operator=this.value;" style="font-size:9px;"><option value="<" ${row.operator === '<' ? 'selected' : ''}> < </option><option value="==" ${row.operator === '==' ? 'selected' : ''}> = </option><option value=">" ${row.operator === '>' ? 'selected' : ''}> > </option></select>
                    <select onchange="GlobalMission.rows[${rIdx}].threshold=parseInt(this.value);" style="font-size:9px;">${vDrop}</select>
                </div>`;
            } else {
                triggerText = `<strong style="font-size:11px; color:#2c3e50;">BARIS AKSI ${rIdx + 1}</strong>`;
            }

            let motorRows = '';
            for (let aIdx = 0; aIdx < row.actions.length; aIdx++) {
                let act = row.actions[aIdx];
                motorRows += `
                <div style="display:flex; gap:5px; align-items:center; margin-bottom:5px; padding:5px; background:#fdfdfd; border-radius:6px; border:1px solid #eee; font-size:11px;">
                    <select onchange="updateActionVal('normal', '${rIdx}', ${aIdx}, 'port', this.value)" style="font-size:10px; border-radius:4px;">
                        ${pOpts.replace(`value="${act.port}"`, `selected value="${act.port}"`)}
                    </select>
                    <select onchange="updateActionVal('normal', '${rIdx}', ${aIdx}, 'direction', parseInt(this.value))" style="font-size:10px; border-radius:4px;">
                        <option value="1" ${act.direction === 1 ? 'selected' : ''}>MAJU</option>
                        <option value="-1" ${act.direction === -1 ? 'selected' : ''}>MUNDUR</option>
                        <option value="0" ${act.direction === 0 ? 'selected' : ''}>STOP</option>
                    </select>
                    <input type="number" step="10" value="${act.speed}" style="width:35px; padding:3px; font-size:10px; text-align:center; border:1px solid #ddd;" oninput="updateActionVal('normal', '${rIdx}', ${aIdx}, 'speed', parseInt(this.value))">
                    <span onclick="removeActionFromRow(${rIdx}, ${aIdx})" style="cursor:pointer; color:#e74c3c; font-weight:bold; margin-left:auto; padding:0 5px;">×</span>
                </div>`;
            }

            rowsHtml += `
            <div style="background:white; border:1px solid #bdc3c7; padding:10px; margin-bottom:10px; border-radius:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    ${triggerText}
                    <button onclick="removeGlobalRow(${rIdx})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-weight:bold; font-size:10px;">HAPUS</button>
                </div>
                <div style="padding:5px; background:#f4f6f7; border-radius:8px;">
                    ${motorRows}
                    <button style="font-size:9px; padding:4px 10px; background:#fff; border:1px solid #ccc; border-radius:5px; font-weight:bold; cursor:pointer;" onclick="addActionToRow(${rIdx})">+ MOTOR PARALEL</button>
                </div>
            </div>`;
        }
        container.innerHTML = rowsHtml + `<button class="btn btn-success" style="width:100%; padding:12px; font-weight:bold; font-size:13px; border-radius:8px; color:white;" onclick="addGlobalRow()">➕ TAMBAH BLOK LOGIKA BARU</button>`;
    }
};

// =========================================================
// VALUE UPDATE ENGINE (ANTI-RESET MEMORY)
// =========================================================
window.updateActionVal = function(mode, rIdxStr, aIdx, key, val, stepIdx) {
    let rIdx = (rIdxStr === 'def' || rIdxStr === 'null') ? rIdxStr : parseInt(rIdxStr);
    
    if (mode === 'm5') {
        GlobalMission.states[rIdx].actions[aIdx][key] = val;
    } else if (mode === 'm3_def') {
        GlobalMission.defaultActions[aIdx][key] = val;
    } else if (mode === 'm3_seq') {
        GlobalMission.rows[rIdx].steps[stepIdx].actions[aIdx][key] = val;
    } else if (mode === 'm3_time') {
        GlobalMission.rows[rIdx].steps[stepIdx][key] = val;
    } else if (mode === 'm2_time') {
        GlobalMission.rows[rIdx].time = val;
    } else {
        // Mode Normal (M1, M2 motor, M4 motor)
        GlobalMission.rows[rIdx].actions[aIdx][key] = val;
    }
};

window.updateGlobalType = function() {
    GlobalMission.type = document.getElementById('global-type').value;
    
    // Reset Data Structure sesuai Mode
    GlobalMission.defaultActions = [{ port: 'A', direction: 0, speed: 0 }];
    
    if (GlobalMission.type === 'm3') {
        GlobalMission.rows = [{ 
            sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, 
            steps: [{ time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }] 
        }];
    } else if (GlobalMission.type === 'm5') {
        GlobalMission.states = [{ actions: [{ port: 'A', direction: 1, speed: 100 }] }];
        GlobalMission.rows = GlobalMission.states; 
    } else {
        GlobalMission.rows = [{ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }];
    }
    
    renderMissionUI();
};

// =========================================================
// DATA LIST MANIPULATION
// =========================================================
window.addGlobalRow = () => { 
    if(GlobalMission.type === 'm3') {
        GlobalMission.rows.push({ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, steps: [{ time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }] });
    } else if(GlobalMission.type === 'm5') {
        GlobalMission.states.push({ actions: [{ port: 'A', direction: 1, speed: 100 }] });
    } else {
        GlobalMission.rows.push({ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }); 
    }
    refreshGlobalRows(); 
};

window.removeGlobalRow = (idx) => { 
    if(GlobalMission.rows.length > 1) { 
        GlobalMission.rows.splice(idx, 1); 
        refreshGlobalRows(); 
    } 
};

window.addActionToRow = (rIdx) => { 
    GlobalMission.rows[rIdx].actions.push({ port: 'A', direction: 1, speed: 100 }); 
    refreshGlobalRows(); 
};

window.removeActionFromRow = (rIdx, aIdx) => { 
    if(GlobalMission.rows[rIdx].actions.length > 1) { 
        GlobalMission.rows[rIdx].actions.splice(aIdx, 1); 
        refreshGlobalRows(); 
    } 
};

window.addStepToRow = (rIdx) => { 
    GlobalMission.rows[rIdx].steps.push({ time: 1, actions: [{ port: 'A', direction: 1, speed: 100 }] }); 
    refreshGlobalRows(); 
};

window.removeStepFromRow = (rIdx, sIdx) => { 
    if(GlobalMission.rows[rIdx].steps.length > 1) { 
        GlobalMission.rows[rIdx].steps.splice(sIdx, 1); 
        refreshGlobalRows(); 
    } 
};

window.addActionToStep = (rIdx, sIdx) => { 
    GlobalMission.rows[rIdx].steps[sIdx].actions.push({ port: 'A', direction: 1, speed: 100 }); 
    refreshGlobalRows(); 
};

window.removeActionFromStep = (rIdx, sIdx, aIdx) => { 
    if(GlobalMission.rows[rIdx].steps[sIdx].actions.length > 1) { 
        GlobalMission.rows[rIdx].steps[sIdx].actions.splice(aIdx, 1); 
        refreshGlobalRows(); 
    } 
};

window.addState = () => { 
    GlobalMission.states.push({ actions: [{ port: 'A', direction: 1, speed: 100 }] }); 
    refreshGlobalRows(); 
};

window.removeState = (idx) => { 
    if(GlobalMission.states.length > 1) { 
        GlobalMission.states.splice(idx, 1); 
        refreshGlobalRows(); 
    } 
};

window.addActionToState = (idx) => { 
    GlobalMission.states[idx].actions.push({ port: 'A', direction: 1, speed: 100 }); 
    refreshGlobalRows(); 
};

window.removeActionFromState = (sIdx, aIdx) => { 
    if(GlobalMission.states[sIdx].actions.length > 1) { 
        GlobalMission.states[sIdx].actions.splice(aIdx, 1); 
        refreshGlobalRows(); 
    } 
};

window.addDefaultAction = () => { 
    GlobalMission.defaultActions.push({ port: 'A', direction: 0, speed: 0 }); 
    refreshGlobalRows(); 
};

window.removeDefaultAction = (aIdx) => { 
    if(GlobalMission.defaultActions.length > 1) { 
        GlobalMission.defaultActions.splice(aIdx, 1); 
        refreshGlobalRows(); 
    } 
};

function getIrOptions(sel) { 
    let o = ''; 
    for(let i=0; i<=10; i++) {
        o += `<option value="${i}" ${sel===i?'selected':''}>${i}</option>`;
    }
    return o; 
}

function getTiltOptions(sel) { 
    return [0,3,5,7,9].map(v => `<option value="${v}" ${sel===v?'selected':''}>${v}</option>`).join(''); 
}

window.applyPresetColor = function(hex) { 
    document.getElementById('global-color').value = hex; 
    setGlobalColor(); 
};

window.setGlobalColor = async function() {
    const rgb = hexToRgb(document.getElementById('global-color').value);
    for (let r of AppState.robots) { 
        r.currentColor = rgb; 
        await setRGB(r.id, rgb.r, rgb.g, rgb.b); 
        await sleep(50); 
    }
};

window.setLocalColor = async function(entId, hex) {
    const rgb = hexToRgb(hex);
    const ent = getPlayableEntities().find(e => e.id === entId);
    const master = AppState.robots.find(r => r.id === ent.hub1);
    if (master) { 
        master.currentColor = rgb; 
        await setRGB(master.id, rgb.r, rgb.g, rgb.b); 
        if (ent.hub2) await setRGB(ent.hub2, rgb.r, rgb.g, rgb.b); 
    }
};

window.toggleReady = function(entId) {
    const master = AppState.robots.find(r => r.id === getPlayableEntities().find(e => e.id === entId).hub1);
    if (master) { 
        master.isReady = !master.isReady; 
        master.stateIndex = 0; 
        master.isDetecting = false; 
        renderMissionUI(); 
    }
};

window.executeHardware = async function(entId, portChar, val) {
    const ent = getPlayableEntities().find(e => e.id === entId);
    if (!ent) return;
    let targetHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
    let targetPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    if (targetHub) {
        await setMotor(targetHub, targetPort, val);
    }
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
    master.logicLock = false; 
    master.currentActions = []; 
    master.isDetecting = false;

    if (master.keepAlive) clearInterval(master.keepAlive);
    if (master.logicLoop) clearInterval(master.logicLoop);
    renderMissionUI();

    // CORE 1: KEEPALIVE WATCHDOG (400ms - Anti Motor Sleep)
    master.keepAlive = setInterval(async () => {
        if (!master.isRunning || !master.currentActions) return;
        for (let act of master.currentActions) {
            await executeHardware(entId, act.port, act.speed * act.direction);
        }
    }, 400);

    // CORE 2: LOGIC EVALUATOR (100ms - Decision Making)
    master.logicLoop = setInterval(async () => {
        if (!master.isRunning) return;
        if (master.logicLock) return; // Sequence Locking
        
        const txt = document.getElementById(`state-text-${ent.hub1}`);

        // --- MODE 1: DIRECT DRIVE ---
        if (GlobalMission.type === 'm1') {
            master.currentActions = GlobalMission.rows[0].actions;
            if (txt) txt.innerText = `STATUS: [ RUNNING ]`;
        }
        
        // --- MODE 2: TIMER SEQUENCE ---
        else if (GlobalMission.type === 'm2') {
            const row = GlobalMission.rows[master.stateIndex - 1];
            if (!row) { 
                stopLocal(entId); 
                return; 
            }
            
            master.logicLock = true; 
            if (txt) txt.innerText = `STATUS: [ STEP ${master.stateIndex} ]`;
            master.currentActions = row.actions;
            
            await sleep(row.time * 1000);
            
            if(master.isRunning) { 
                master.stateIndex++; 
                master.logicLock = false; 
                if(master.stateIndex > GlobalMission.rows.length) {
                    stopLocal(entId);
                }
            }
        }

        // --- MODE 3: IR SENSOR SEQUENCE ---
        else if (GlobalMission.type === 'm3') {
            let triggeredRow = null;
            for (let row of GlobalMission.rows) {
                const sHub = (row.sensorPort === 'A' || row.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                const val = getSensorVal(sHub, row.sensorPort, row.sensorType);
                
                let hit = false;
                if (row.operator === '<') hit = val < row.threshold;
                else if (row.operator === '==') hit = Math.round(val) === row.threshold;
                else if (row.operator === '>') hit = val > row.threshold;
                
                if (hit) { 
                    triggeredRow = row; 
                    break; 
                }
            }
            
            if (triggeredRow) {
                master.logicLock = true; 
                if (txt) txt.innerText = `STATUS: [ MANUVER REAKSI ]`;
                
                for (let step of triggeredRow.steps) {
                    if(!master.isRunning) break;
                    master.currentActions = step.actions;
                    await sleep(step.time * 1000); 
                }
                
                if(master.isRunning) master.logicLock = false; 
            } else {
                if (txt) txt.innerText = `STATUS: [ NORMAL ]`;
                master.currentActions = GlobalMission.defaultActions;
            }
        }

        // --- MODE 4: TILT MEMORI PERSNELING ---
        else if (GlobalMission.type === 'm4') {
            for (let row of GlobalMission.rows) {
                const sHub = (row.sensorPort === 'A' || row.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                const val = getSensorVal(sHub, row.sensorPort, row.sensorType);
                
                let hit = false;
                if (row.operator === '<') hit = val < row.threshold;
                else if (row.operator === '==') hit = Math.round(val) === row.threshold;
                else if (row.operator === '>') hit = val > row.threshold;
                
                if (hit) { 
                    master.currentActions = row.actions; 
                    break; 
                }
            }
            if (txt) {
                txt.innerText = master.currentActions.length > 0 ? `STATUS: [ LATCHED 🔒 ]` : `STATUS: [ EMPTY ]`;
            }
        }

        // --- MODE 5: STATE COUNTER (CYCLE) ---
        else if (GlobalMission.type === 'm5') {
            const state = GlobalMission.states[master.stateIndex - 1];
            if (!state) { 
                master.stateIndex = 1; 
                return; 
            }
            
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
                if (master.stateIndex > GlobalMission.states.length) {
                    master.stateIndex = 1;
                }
            } else if (!hit) {
                master.isDetecting = false;
            }
            
            if (txt) txt.innerText = `STATUS: [ STATE ${master.stateIndex} ]`;
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
    
    await executeHardware(entId, 'A', 0);
    await executeHardware(entId, 'B', 0);
    if(ent.hub2) {
        await executeHardware(entId, 'C', 0);
        await executeHardware(entId, 'D', 0);
    }
    
    const txt = document.getElementById(`state-text-${ent.hub1}`);
    if (txt) txt.innerText = `STATUS: [ STANDBY ]`;
    
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
        r.isRunning = false;
        if (r.keepAlive) clearInterval(r.keepAlive);
        if (r.logicLoop) clearInterval(r.logicLoop);
        await setMotor(r.id, 1, 0);
        await setMotor(r.id, 2, 0);
    }
    renderMissionUI();
};

window.renderDashboard = () => renderMissionUI();