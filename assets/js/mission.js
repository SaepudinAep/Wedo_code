/* =========================================================
   MODUL 5: MISSION.JS (v30.0 - PRO INDUSTRIAL EXPANDED)
   Status: 100% COMPLETE - NO CLEANING - NO COMPRESSION
   Volume: Expanded Explicit Structure (~600 Lines)
   Features: Dual-Core Engine, RSSI Tracker, Sensor Clamping,
             Ultra-Compact UI (Efficient Space), Anti-Reset.
========================================================= */

// 1. DATA STRUCTURE DEFINITION
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
            time: 2.5,
            actions: [{ port: 'A', direction: 1, speed: 100 }],
            steps: [
                { time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }
            ] 
        }
    ],
    isExecuting: false,
    activatedPorts: new Set() 
};

// 2. CONSTANTS & UTILITIES
const PRESET_COLORS = [
    { name: 'Red', hex: '#FF0000' }, 
    { name: 'Green', hex: '#00FF00' }, 
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Yellow', hex: '#FFFF00' }, 
    { name: 'Purple', hex: '#9966FF' }, 
    { name: 'Cyan', hex: '#00FFFF' }
];

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

window.hexToRgb = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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

// 3. ENRICHMENT: SENSOR CLAMPING ENGINE (ANTI -- ERROR)
window.getSensorVal = function(hubId, portChar, sType) {
    var pNum = 1;
    if (portChar === 'A' || portChar === 'C') {
        pNum = 1;
    } else {
        pNum = 2;
    }
    
    var div = document.getElementById('sens' + pNum + '-' + hubId);
    
    if (!div || div.innerText === '--' || div.innerText.trim() === '') {
        // Logika Pak Saepudin: Jika jauh/blank set Max, Jika dekat set Min
        if (sType === 'distance') {
            return 10; // Nilai aman (jauh)
        } else {
            return 0; // Nilai netral tilt
        }
    }
    
    var val = parseFloat(div.innerText);
    if (isNaN(val)) {
        if (sType === 'distance') return 10;
        return 0;
    }
    
    // Clamping Pro: Menjaga stabilitas input sensor
    if (sType === 'distance') {
        if (val > 10) {
            val = 10;
        }
        if (val < 0) {
            val = 0;
        }
    }
    
    return val;
};

// 4. PHYSICAL HUB INTERFACE
window.handlePhysicalButton = function(hubId) {
    var entities = [];
    if (typeof getPlayableEntities === 'function') {
        entities = getPlayableEntities();
    }
    
    var ent = null;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].hub1 === hubId || entities[i].hub2 === hubId) {
            ent = entities[i];
            break;
        }
    }
    
    if (!ent) return;

    var master = null;
    for (var j = 0; j < AppState.robots.length; j++) {
        if (AppState.robots[j].id === ent.hub1) {
            master = AppState.robots[j];
            break;
        }
    }
    
    if (master) {
        if (master.isRunning) {
            stopLocal(ent.id);
        } else {
            runLocal(ent.id);
        }
    }
};

window.setupGlobalSensor = async function(portChar, type, btnElem) {
    var entities = [];
    if (typeof getPlayableEntities === 'function') {
        entities = getPlayableEntities();
    }
    
    if (entities.length === 0) return;
    
    var originalText = btnElem.innerText;
    btnElem.innerText = "⏳";
    
    if (type === 'unset') {
        GlobalMission.activatedPorts.delete(portChar);
    } else {
        GlobalMission.activatedPorts.add(portChar);
    }

    for (var k = 0; k < entities.length; k++) {
        var ent = entities[k];
        var sHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
        var sPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
        
        if (sHub && typeof setupSensor === 'function') {
            if (type === 'unset') {
                var r = null;
                for (var m = 0; m < AppState.robots.length; m++) {
                    if (AppState.robots[m].id === sHub) {
                        r = AppState.robots[m];
                        break;
                    }
                }
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

// 5. ENRICHMENT: ULTRA-COMPACT UI (EFFICIENT SPACE)
window.renderMissionUI = function() {
    var container = document.getElementById('dashboard-list');
    if (!container) return;

    var paletteHtml = '';
    for (var p = 0; p < PRESET_COLORS.length; p++) {
        var c = PRESET_COLORS[p];
        paletteHtml += '<div onclick="applyPresetColor(\'' + c.hex + '\')" style="width:20px; height:20px; border-radius:50%; background:' + c.hex + '; cursor:pointer; border:1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"></div>';
    }

    var html = '<div class="card" style="padding:10px; border-top: 6px solid var(--primary); box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">';
    
    // Header Control
    html += '<div style="display:flex; justify-content:space-between; align-items:center;">';
    html += '<h3 style="margin:0; font-size:14px; color:#2c3e50;">🌍 MISSION CONTROL v30.0</h3>';
    html += '<div id="global-status-badge" style="background:' + (GlobalMission.isExecuting ? 'var(--warning)' : '#eee') + '; padding:4px 12px; border-radius:12px; font-size:10px; font-weight:bold; color:#2c3e50;">';
    html += (GlobalMission.isExecuting ? 'ACTIVE' : 'STANDBY') + '</div></div>';

    // Sensor Setup Grid (Compact)
    html += '<div style="margin-top:10px; background:#f0f8ff; padding:8px; border-radius:8px; border:1px solid #d1e9ff;">';
    html += '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:5px;">';
    var ports = ['A', 'B', 'C', 'D'];
    for (var pt = 0; pt < ports.length; pt++) {
        var pName = ports[pt];
        html += '<div style="background:white; padding:4px; border-radius:6px; border:1px solid #ddd; font-size:10px;">';
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">';
        html += '<strong style="color:#2980b9;">Port ' + pName + '</strong>';
        html += '<span style="cursor:pointer; color:#e74c3c; font-size:9px; font-weight:bold;" onclick="setupGlobalSensor(\'' + pName + '\',\'unset\',this)">OFF</span></div>';
        html += '<div style="display:flex; gap:3px;">';
        html += '<button style="flex:1; font-size:9px; padding:3px; background:#9B59B6; color:white; border:none; border-radius:3px;" onclick="setupGlobalSensor(\'' + pName + '\',\'distance\',this)">IR</button>';
        html += '<button style="flex:1; font-size:9px; padding:3px; background:#3498db; color:white; border:none; border-radius:3px;" onclick="setupGlobalSensor(\'' + pName + '\',\'tilt\',this)">TLT</button>';
        html += '</div></div>';
    }
    html += '</div></div>';

    // Mission Configuration Box
    html += '<div style="margin-top:10px; padding:10px; border-radius:8px; background:#fafafa; border:1px solid #eee;">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">';
    html += '<div style="display:flex; gap:4px; align-items:center;"><span style="font-size:10px; font-weight:bold; color:#7f8c8d;">LED:</span>' + paletteHtml + '</div>';
    html += '<div style="display:flex; gap:4px; align-items:center;"><input type="color" id="global-color" value="#9966FF" style="width:25px; height:25px; border:none; cursor:pointer;"><button class="btn btn-primary" style="padding:4px 8px; font-size:10px;" onclick="setGlobalColor()">SET</button></div></div>';
    
    html += '<select id="global-type" style="width:100%; margin-bottom:10px; padding:10px; border-radius:8px; font-weight:bold; font-size:13px; border:2px solid #bdc3c7;" onchange="updateGlobalType()">';
    html += '<option value="m1" ' + (GlobalMission.type === 'm1' ? 'selected' : '') + '>🕹️ 1. DIRECT DRIVE (Normal)</option>';
    html += '<option value="m2" ' + (GlobalMission.type === 'm2' ? 'selected' : '') + '>⏱️ 2. TIMER SEQUENCE (Waktu)</option>';
    html += '<option value="m3" ' + (GlobalMission.type === 'm3' ? 'selected' : '') + '>🧠 3. IR SENSOR (Reaksi Berantai)</option>';
    html += '<option value="m4" ' + (GlobalMission.type === 'm4' ? 'selected' : '') + '>📐 4. TILT SENSOR (Kunci Latch)</option>';
    html += '<option value="m5" ' + (GlobalMission.type === 'm5' ? 'selected' : '') + '>🔄 5. STATE COUNTER (Siklus)</option></select>';

    html += '<div id="global-rows-container"></div>';
    
    html += '<div style="display:flex; gap:8px; margin-top:15px;">';
    html += '<button id="btn-global-start" class="btn btn-warning" style="flex:2; padding:15px; font-weight:bold; font-size:13px;" onclick="broadcastMission()">🚀 JALANKAN SEMUA READY</button>';
    html += '<button class="btn btn-danger" style="flex:1; padding:15px; font-weight:bold; font-size:13px;" onclick="stopAllMissions()">🛑 STOP ALL</button></div></div></div>';
    
    // Robot Cards Section (RSSI Integrated)
    html += '<div id="individual-cards-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px; margin-top:10px;">';

    var entities = [];
    if (typeof getPlayableEntities === 'function') {
        entities = getPlayableEntities();
    }
    
    for (var n = 0; n < entities.length; n++) {
        var ent = entities[n];
        var master = null;
        for (var o = 0; o < AppState.robots.length; o++) {
            if (AppState.robots[o].id === ent.hub1) {
                master = AppState.robots[o];
                break;
            }
        }
        
        var isReady = (master && master.isReady);
        var isRun = (master && master.isRunning);
        var hexColor = "#0000ff";
        if (master && master.currentColor) {
            hexColor = rgbToHex(master.currentColor.r, master.currentColor.g, master.currentColor.b);
        }

        var sensorElements = '';
        if (GlobalMission.activatedPorts.has('A')) sensorElements += '<div style="background:#f8f9fa; padding:3px; border-radius:4px; font-size:10px;"><b>P1:</b> <span id="sens1-' + ent.hub1 + '">--</span></div>';
        if (GlobalMission.activatedPorts.has('B')) sensorElements += '<div style="background:#f8f9fa; padding:3px; border-radius:4px; font-size:10px;"><b>P2:</b> <span id="sens2-' + ent.hub1 + '">--</span></div>';
        if (ent.hub2) {
            if (GlobalMission.activatedPorts.has('C')) sensorElements += '<div style="background:#f8f9fa; padding:3px; border-radius:4px; font-size:10px;"><b>P3:</b> <span id="sens1-' + ent.hub2 + '">--</span></div>';
            if (GlobalMission.activatedPorts.has('D')) sensorElements += '<div style="background:#f8f9fa; padding:3px; border-radius:4px; font-size:10px;"><b>P4:</b> <span id="sens2-' + ent.hub2 + '">--</span></div>';
        }

        html += '<div class="card" style="padding:12px; border-left: 6px solid ' + (isReady ? '#2ecc71' : '#bdc3c7') + '; background:' + (isRun ? '#fffdf0' : '#fff') + '; transition: 0.2s;">';
        html += '<div style="display:flex; justify-content:space-between; align-items:flex-start;"><div>';
        html += '<div style="display:flex; align-items:center; gap:6px;"><strong style="font-size:14px;">🤖 ' + ent.name + '</strong>';
        html += '<input type="color" value="' + hexColor + '" onchange="setLocalColor(\'' + ent.id + '\', this.value)" style="width:18px; height:18px; border:none; border-radius:3px;"></div>';
        html += '<div id="rssi-' + ent.hub1 + '" style="font-size:9px; font-weight:bold; color:#7f8c8d; margin-top:2px;">📶 -- dBm (Standby)</div></div>';
        html += '<button class="btn" style="padding:6px 12px; font-size:10px; font-weight:bold; background:' + (isReady ? '#2ecc71' : '#34495e') + '; color:white; border-radius:6px;" onclick="toggleReady(\'' + ent.id + '\')">' + (isReady ? 'READY' : 'SET') + '</button></div>';
        html += '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap:5px; margin:10px 0;">' + sensorElements + '</div>';
        html += '<div id="state-text-' + ent.hub1 + '" style="font-size:10px; color:#d35400; margin-top:5px; text-align:center; font-weight:bold; background:#fff9e6; padding:6px; border-radius:6px; border:1px solid #f9e79f;">[ STANDBY ]</div>';
        html += '<div style="display:flex; gap:6px; margin-top:10px;">';
        html += '<button class="btn" style="flex:1; background:#f1c40f; color:#2c3e50; font-weight:bold; padding:10px; font-size:11px;" onclick="runLocal(\'' + ent.id + '\')">▶️ START</button>';
        html += '<button class="btn" style="flex:1; background:#e74c3c; color:white; font-weight:bold; padding:10px; font-size:11px;" onclick="stopLocal(\'' + ent.id + '\')">🛑 STOP</button></div></div>';
    }

    container.innerHTML = html + '</div>';
    refreshGlobalRows();
};

// 6. DETAILED ROW RENDERER (NO COMPRESSION)
window.refreshGlobalRows = function() {
    var container = document.getElementById('global-rows-container');
    if (!container) return;

    var entities = [];
    if (typeof getPlayableEntities === 'function') {
        entities = getPlayableEntities();
    }
    var hasGroup = false;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].type === 'group') {
            hasGroup = true;
            break;
        }
    }
    
    var pOpts = '<option value="A">Port A</option><option value="B">Port B</option>';
    if (hasGroup) {
        pOpts += '<option value="C">Port C</option><option value="D">Port D</option>';
    }

    // --- LOGIC PER MODE (EXPANDED) ---
    if (GlobalMission.type === 'm3') {
        // RENDERING MODE 3: IR SENSOR SEQUENCE
        var m3Html = '';
        
        // Block Default
        m3Html += '<div style="background:#e8f8f5; border:1.5px solid #1abc9c; border-radius:10px; padding:10px; margin-bottom:10px;">';
        m3Html += '<div style="font-size:11px; font-weight:bold; color:#16a085; margin-bottom:8px;">🟢 KONDISI NORMAL (BAWAAN):</div>';
        for (var d = 0; d < GlobalMission.defaultActions.length; d++) {
            var dAct = GlobalMission.defaultActions[d];
            m3Html += '<div style="display:flex; gap:5px; align-items:center; margin-bottom:5px; padding:5px; background:#fff; border-radius:6px; border:1px solid #d1f2eb;">';
            m3Html += '<select onchange="updateActionVal(\'m3_def\', \'def\', ' + d + ', \'port\', this.value)" style="font-size:10px;">' + pOpts.replace('value="' + dAct.port + '"', 'selected value="' + dAct.port + '"') + '</select>';
            m3Html += '<select onchange="updateActionVal(\'m3_def\', \'def\', ' + d + ', \'direction\', parseInt(this.value))" style="font-size:10px;">';
            m3Html += '<option value="1" ' + (dAct.direction === 1 ? 'selected' : '') + '>MAJU</option>';
            m3Html += '<option value="-1" ' + (dAct.direction === -1 ? 'selected' : '') + '>MUNDUR</option>';
            m3Html += '<option value="0" ' + (dAct.direction === 0 ? 'selected' : '') + '>STOP</option></select>';
            m3Html += '<input type="number" value="' + dAct.speed + '" style="width:35px; font-size:10px; text-align:center;" oninput="updateActionVal(\'m3_def\', \'def\', ' + d + ', \'speed\', parseInt(this.value))">';
            m3Html += '<span onclick="removeDefaultAction(' + d + ')" style="cursor:pointer; color:#e74c3c; font-weight:bold; margin-left:auto;">×</span></div>';
        }
        m3Html += '<button style="font-size:9px; padding:4px 10px; background:white; border:1px solid #1abc9c; color:#16a085; border-radius:5px; font-weight:bold;" onclick="addDefaultAction()">+ TAMBAH MOTOR</button></div>';

        // Block Reaksi
        for (var r = 0; r < GlobalMission.rows.length; r++) {
            var row = GlobalMission.rows[r];
            var vDrop = row.sensorType === 'distance' ? getIrOptions(row.threshold) : getTiltOptions(row.threshold);
            
            m3Html += '<div style="background:#fffafa; border:2px solid #e74c3c; border-radius:10px; padding:10px; margin-bottom:10px;">';
            m3Html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">';
            m3Html += '<div style="display:flex; gap:5px; align-items:center; font-size:11px;"><strong style="color:#c0392b;">⚡ JIKA:</strong>';
            m3Html += '<select onchange="GlobalMission.rows[' + r + '].sensorPort=this.value" style="font-size:10px;">' + pOpts.replace('value="' + row.sensorPort + '"', 'selected value="' + row.sensorPort + '"') + '</select>';
            m3Html += '<select onchange="GlobalMission.rows[' + r + '].sensorType=this.value; refreshGlobalRows();" style="font-size:10px;"><option value="distance" ' + (row.sensorType === 'distance' ? 'selected' : '') + '>IR</option><option value="tilt" ' + (row.sensorType === 'tilt' ? 'selected' : '') + '>TLT</option></select>';
            m3Html += '<select onchange="GlobalMission.rows[' + r + '].operator=this.value;" style="font-size:10px;"><option value="<" ' + (row.operator === '<' ? 'selected' : '') + '> < </option><option value="==" ' + (row.operator === '==' ? 'selected' : '') + '> = </option><option value=">" ' + (row.operator === '>' ? 'selected' : '') + '> > </option></select>';
            m3Html += '<select onchange="GlobalMission.rows[' + r + '].threshold=parseInt(this.value);" style="font-size:10px;">' + vDrop + '</select></div>';
            m3Html += '<button onclick="removeGlobalRow(' + r + ')" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer;">HAPUS</button></div>';
            
            for (var s = 0; s < row.steps.length; s++) {
                var step = row.steps[s];
                m3Html += '<div style="background:#fff; padding:8px; border-radius:8px; border:1px solid #ddd; margin-bottom:8px;">';
                m3Html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span style="font-size:10px; font-weight:bold;">LANGKAH ' + (s + 1) + ':</span>';
                m3Html += '<div style="font-size:10px;">⏱️ <input type="number" step="0.5" value="' + step.time + '" style="width:35px;" oninput="updateActionVal(\'m3_time\', \'' + r + '\', null, \'time\', parseFloat(this.value), ' + s + ')"> s <span onclick="removeStepFromRow(' + r + ',' + s + ')" style="cursor:pointer; color:red;">🗑️</span></div></div>';
                
                for (var a = 0; a < step.actions.length; a++) {
                    var sAct = step.actions[a];
                    m3Html += '<div style="display:flex; gap:5px; align-items:center; margin-bottom:4px; padding:4px; background:#f9f9f9; border-radius:5px;">';
                    m3Html += '<select onchange="updateActionVal(\'m3_seq\', \'' + r + '\', ' + a + ', \'port\', this.value, ' + s + ')" style="font-size:10px;">' + pOpts.replace('value="' + sAct.port + '"', 'selected value="' + sAct.port + '"') + '</select>';
                    m3Html += '<select onchange="updateActionVal(\'m3_seq\', \'' + r + '\', ' + a + ', \'direction\', parseInt(this.value), ' + s + ')" style="font-size:10px;"><option value="1" ' + (sAct.direction === 1 ? 'selected' : '') + '>MAJU</option><option value="-1" ' + (sAct.direction === -1 ? 'selected' : '') + '>MUNDUR</option><option value="0" ' + (sAct.direction === 0 ? 'selected' : '') + '>STOP</option></select>';
                    m3Html += '<input type="number" value="' + sAct.speed + '" style="width:35px; font-size:10px;" oninput="updateActionVal(\'m3_seq\', \'' + r + '\', ' + a + ', \'speed\', parseInt(this.value), ' + s + ')"><span onclick="removeActionFromStep(' + r + ',' + s + ',' + a + ')" style="cursor:pointer; color:red; margin-left:auto;">×</span></div>';
                }
                m3Html += '<button style="font-size:9px; padding:3px 8px; background:#f4f6f7; border:1px solid #ccc; border-radius:4px;" onclick="addActionToStep(' + r + ',' + s + ')">+ MOTOR</button></div>';
            }
            m3Html += '<button style="width:100%; font-size:10px; background:#fbeeee; border:1px dashed #e74c3c; color:#c0392b; padding:8px; border-radius:6px;" onclick="addStepToRow(' + r + ')">+ TAMBAH LANGKAH WAKTU</button></div>';
        }
        container.innerHTML = m3Html + '<button class="btn btn-danger" style="width:100%; padding:12px; font-weight:bold; font-size:12px;" onclick="addGlobalRow()">➕ TAMBAH PEMICU REAKSI BARU</button>';
    
    } else if (GlobalMission.type === 'm4') {
        // RENDERING MODE 4: TILT LATCH (Kunci Kondisi Terakhir)
        var m4Html = '';
        m4Html += '<div style="background:#e8f4f8; border:1.5px solid #3498db; border-radius:10px; padding:10px; margin-bottom:10px;"><div style="font-size:11px; font-weight:bold; color:#2980b9;">🟢 KONDISI AWAL (DEFAULT):</div>';
        for (var da4 = 0; da4 < GlobalMission.defaultActions.length; da4++) {
            var act4 = GlobalMission.defaultActions[da4];
            m4Html += '<div style="display:flex; gap:5px; align-items:center; margin-bottom:5px; padding:5px; background:#fff; border-radius:6px; border:1px solid #d6eaf8;">';
            m4Html += '<select onchange="updateActionVal(\'m4_def\', \'def\', ' + da4 + ', \'port\', this.value)" style="font-size:10px;">' + pOpts.replace('value="' + act4.port + '"', 'selected value="' + act4.port + '"') + '</select>';
            m4Html += '<select onchange="updateActionVal(\'m4_def\', \'def\', ' + da4 + ', \'direction\', parseInt(this.value))" style="font-size:10px;"><option value="1" ' + (act4.direction === 1 ? 'selected' : '') + '>MAJU</option><option value="-1" ' + (act4.direction === -1 ? 'selected' : '') + '>MUNDUR</option><option value="0" ' + (act4.direction === 0 ? 'selected' : '') + '>STOP</option></select>';
            m4Html += '<input type="number" value="' + act4.speed + '" style="width:35px; font-size:10px;" oninput="updateActionVal(\'m4_def\', \'def\', ' + da4 + ', \'speed\', parseInt(this.value))"><span onclick="removeDefaultAction(' + da4 + ')" style="cursor:pointer; color:red; margin-left:auto;">×</span></div>';
        }
        m4Html += '<button style="font-size:9px; padding:4px 10px; background:white; border:1px solid #3498db; color:#2980b9; border-radius:5px;" onclick="addDefaultAction()">+ TAMBAH MOTOR</button></div>';

        for (var r4 = 0; r4 < GlobalMission.rows.length; r4++) {
            var row4 = GlobalMission.rows[r4];
            var vDrop4 = row4.sensorType === 'distance' ? getIrOptions(row4.threshold) : getTiltOptions(row4.threshold);
            m4Html += '<div style="background:white; border:1.5px solid #bdc3c7; padding:10px; margin-bottom:8px; border-radius:10px;">';
            m4Html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
            m4Html += '<div style="display:flex; gap:3px; align-items:center; font-size:10px;"><strong style="color:#34495e;">🔑 JIKA:</strong>';
            m4Html += '<select onchange="GlobalMission.rows[' + r4 + '].sensorPort=this.value">' + pOpts.replace('value="' + row4.sensorPort + '"', 'selected value="' + row4.sensorPort + '"') + '</select>';
            m4Html += '<select onchange="GlobalMission.rows[' + r4 + '].sensorType=this.value; refreshGlobalRows();"><option value="distance" ' + (row4.sensorType === 'distance' ? 'selected' : '') + '>IR</option><option value="tilt" ' + (row4.sensorType === 'tilt' ? 'selected' : '') + '>TLT</option></select>';
            m4Html += '<select onchange="GlobalMission.rows[' + r4 + '].operator=this.value;"><option value="<" ' + (row4.operator === '<' ? 'selected' : '') + '> < </option><option value="==" ' + (row4.operator === '==' ? 'selected' : '') + '> = </option><option value=">" ' + (row4.operator === '>' ? 'selected' : '') + '> > </option></select>';
            m4Html += '<select onchange="GlobalMission.rows[' + r4 + '].threshold=parseInt(this.value);">' + vDrop4 + '</select></div>';
            m4Html += '<button onclick="removeGlobalRow(' + r4 + ')" style="background:none; border:none; color:red; font-weight:bold; cursor:pointer;">× HAPUS</button></div>';
            
            for (var a4 = 0; a4 < row4.actions.length; a4++) {
                var actRow4 = row4.actions[a4];
                m4Html += '<div style="display:flex; gap:5px; align-items:center; margin-bottom:4px; padding:4px; background:#f4f6f7; border-radius:5px;">';
                m4Html += '<select onchange="updateActionVal(\'m4\', \'' + r4 + '\', ' + a4 + ', \'port\', this.value)">' + pOpts.replace('value="' + actRow4.port + '"', 'selected value="' + actRow4.port + '"') + '</select>';
                m4Html += '<select onchange="updateActionVal(\'m4\', \'' + r4 + '\', ' + a4 + ', \'direction\', parseInt(this.value))"><option value="1" ' + (actRow4.direction === 1 ? 'selected' : '') + '>MAJU</option><option value="-1" ' + (actRow4.direction === -1 ? 'selected' : '') + '>MUNDUR</option><option value="0" ' + (actRow4.direction === 0 ? 'selected' : '') + '>STOP</option></select>';
                m4Html += '<input type="number" value="' + actRow4.speed + '" style="width:35px; text-align:center;" oninput="updateActionVal(\'m4\', \'' + r4 + '\', ' + a4 + ', \'speed\', parseInt(this.value))"><span onclick="removeActionFromRow(' + r4 + ',' + a4 + ')" style="cursor:pointer; color:red; margin-left:auto;">×</span></div>';
            }
            m4Html += '<button style="font-size:9px; padding:3px 8px; background:white; border:1px solid #bdc3c7; border-radius:4px;" onclick="addActionToRow(' + r4 + ')">+ MOTOR</button></div>';
        }
        container.innerHTML = m4Html + '<button class="btn btn-success" style="width:100%; padding:10px; font-weight:bold; font-size:12px;" onclick="addGlobalRow()">➕ TAMBAH BLOK LATCH BARU</button>';
    } else {
        // RENDERING MODE 1, 2, 5 (GENERIC ROWS)
        var genHtml = '';
        if (GlobalMission.type === 'm5') {
            genHtml += '<div style="background:#fdf2e9; padding:10px; border-radius:8px; margin-bottom:10px; font-size:11px; border:1px solid #f5cba7;"><strong>⚙️ TRIGGER PINDAH STATE:</strong> ';
            genHtml += '<select onchange="GlobalMission.m5TriggerPort=this.value">' + pOpts.replace('value="' + GlobalMission.m5TriggerPort + '"', 'selected value="' + GlobalMission.m5TriggerPort + '"') + '</select>';
            genHtml += '<select onchange="GlobalMission.m5SensorType=this.value; refreshGlobalRows();"><option value="distance" ' + (GlobalMission.m5SensorType === 'distance' ? 'selected' : '') + '>IR</option><option value="tilt" ' + (GlobalMission.m5SensorType === 'tilt' ? 'selected' : '') + '>TLT</option></select>';
            genHtml += '<select onchange="GlobalMission.m5Operator=this.value;"><option value="<" ' + (GlobalMission.m5Operator === '<' ? 'selected' : '') + '> < </option><option value="==" ' + (GlobalMission.m5Operator === '==' ? 'selected' : '') + '> = </option><option value=">" ' + (GlobalMission.m5Operator === '>' ? 'selected' : '') + '> > </option></select>';
            genHtml += '<select onchange="GlobalMission.m5TriggerVal=parseInt(this.value);">' + (GlobalMission.m5SensorType === 'distance' ? getIrOptions(GlobalMission.m5TriggerVal) : getTiltOptions(GlobalMission.m5TriggerVal)) + '</select></div>';
        }

        var targetData = (GlobalMission.type === 'm5' ? GlobalMission.states : GlobalMission.rows);
        for (var gr = 0; gr < targetData.length; gr++) {
            var gRow = targetData[gr];
            var trg = '';
            if (GlobalMission.type === 'm2') {
                trg = '⏱️ Waktu: <input type="number" value="' + gRow.time + '" style="width:35px; font-size:10px;" oninput="updateActionVal(\'m2_time\', \'' + gr + '\', null, \'time\', parseFloat(this.value))"> s';
            }
            
            genHtml += '<div style="background:white; border:1px solid #bdc3c7; padding:8px; margin-bottom:8px; border-radius:8px;">';
            genHtml += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">';
            genHtml += '<div style="font-size:11px; font-weight:bold;">' + (GlobalMission.type === 'm5' ? 'STATE ' + (gr + 1) : 'BARIS ' + (gr + 1)) + ' ' + trg + '</div>';
            genHtml += '<button onclick="' + (GlobalMission.type === 'm5' ? 'removeState(' + gr + ')' : 'removeGlobalRow(' + gr + ')') + '" style="background:none; border:none; color:red; font-size:10px;">🗑️ HAPUS</button></div>';
            
            for (var ga = 0; ga < gRow.actions.length; ga++) {
                var gAct = gRow.actions[ga];
                genHtml += '<div style="display:flex; gap:5px; align-items:center; margin-bottom:4px; padding:4px; background:#fdfdfd; border-radius:5px; border:1px solid #eee;">';
                genHtml += '<select onchange="updateActionVal(\'' + (GlobalMission.type === 'm5' ? 'm5' : 'normal') + '\', \'' + gr + '\', ' + ga + ', \'port\', this.value)">' + pOpts.replace('value="' + gAct.port + '"', 'selected value="' + gAct.port + '"') + '</select>';
                genHtml += '<select onchange="updateActionVal(\'' + (GlobalMission.type === 'm5' ? 'm5' : 'normal') + '\', \'' + gr + '\', ' + ga + ', \'direction\', parseInt(this.value))"><option value="1" ' + (gAct.direction === 1 ? 'selected' : '') + '>MAJU</option><option value="-1" ' + (gAct.direction === -1 ? 'selected' : '') + '>MUNDUR</option><option value="0" ' + (gAct.direction === 0 ? 'selected' : '') + '>STOP</option></select>';
                genHtml += '<input type="number" value="' + gAct.speed + '" style="width:35px; text-align:center;" oninput="updateActionVal(\'' + (GlobalMission.type === 'm5' ? 'm5' : 'normal') + '\', \'' + gr + '\', ' + ga + ', \'speed\', parseInt(this.value))"><span onclick="' + (GlobalMission.type === 'm5' ? 'removeActionFromState(' + gr + ',' + ga + ')' : 'removeActionFromRow(' + gr + ',' + ga + ')') + '" style="cursor:pointer; color:red; margin-left:auto;">×</span></div>';
            }
            genHtml += '<button style="font-size:9px; padding:4px 10px; background:#f8f9fa; border:1px solid #ccc; border-radius:4px;" onclick="' + (GlobalMission.type === 'm5' ? 'addActionToState(' + gr + ')' : 'addActionToRow(' + gr + ')') + '">+ MOTOR</button></div>';
        }
        container.innerHTML = genHtml + '<button class="btn btn-success" style="width:100%; padding:10px; font-weight:bold; font-size:12px;" onclick="addGlobalRow()">➕ TAMBAH BLOK LOGIKA BARU</button>';
    }
};

// 7. DATA HANDLERS (EXPLICIT FOR ANTI-RESET)
window.updateActionVal = function(mode, rIdxStr, aIdx, key, val, stepIdx) {
    var rIdx = 0;
    if (rIdxStr === 'def') {
        rIdx = 'def';
    } else {
        rIdx = parseInt(rIdxStr);
    }
    
    if (mode === 'm5') {
        GlobalMission.states[rIdx].actions[aIdx][key] = val;
    } else if (mode === 'm3_def' || mode === 'm4_def') {
        GlobalMission.defaultActions[aIdx][key] = val;
    } else if (mode === 'm3_seq') {
        GlobalMission.rows[rIdx].steps[stepIdx].actions[aIdx][key] = val;
    } else if (mode === 'm3_time') {
        GlobalMission.rows[rIdx].steps[stepIdx].time = val;
    } else if (mode === 'm2_time') {
        GlobalMission.rows[rIdx].time = val;
    } else {
        GlobalMission.rows[rIdx].actions[aIdx][key] = val;
    }
    // No full re-render here to keep focus/keyboard alive
};

window.updateGlobalType = function() {
    GlobalMission.type = document.getElementById('global-type').value;
    GlobalMission.defaultActions = [{ port: 'A', direction: 0, speed: 0 }];
    if (GlobalMission.type === 'm3') {
        GlobalMission.rows = [{ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, steps: [{ time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }] }];
    } else if (GlobalMission.type === 'm5') {
        GlobalMission.states = [{ actions: [{ port: 'A', direction: 1, speed: 100 }] }];
        GlobalMission.rows = GlobalMission.states; 
    } else {
        GlobalMission.rows = [{ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }];
    }
    renderMissionUI();
};

window.addGlobalRow = function() { 
    if(GlobalMission.type === 'm3') {
        GlobalMission.rows.push({ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, steps: [{ time: 1, actions: [{ port: 'A', direction: -1, speed: 100 }] }] });
    } else if(GlobalMission.type === 'm5') {
        GlobalMission.states.push({ actions: [{ port: 'A', direction: 1, speed: 100 }] });
    } else {
        GlobalMission.rows.push({ sensorPort: 'A', sensorType: 'distance', operator: '<', threshold: 5, time: 2.5, actions: [{ port: 'A', direction: 1, speed: 100 }] }); 
    }
    refreshGlobalRows(); 
};

window.removeGlobalRow = function(idx) { if(GlobalMission.rows.length > 1) { GlobalMission.rows.splice(idx, 1); refreshGlobalRows(); } };
window.addActionToRow = function(rIdx) { GlobalMission.rows[rIdx].actions.push({ port: 'A', direction: 1, speed: 100 }); refreshGlobalRows(); };
window.removeActionFromRow = function(rIdx, aIdx) { if(GlobalMission.rows[rIdx].actions.length > 1) { GlobalMission.rows[rIdx].actions.splice(aIdx, 1); refreshGlobalRows(); } };
window.addStepToRow = function(rIdx) { GlobalMission.rows[rIdx].steps.push({ time: 1, actions: [{ port: 'A', direction: 1, speed: 100 }] }); refreshGlobalRows(); };
window.removeStepFromRow = function(rIdx, sIdx) { if(GlobalMission.rows[rIdx].steps.length > 1) { GlobalMission.rows[rIdx].steps.splice(sIdx, 1); refreshGlobalRows(); } };
window.addActionToStep = function(rIdx, sIdx) { GlobalMission.rows[rIdx].steps[sIdx].actions.push({ port: 'A', direction: 1, speed: 100 }); refreshGlobalRows(); };
window.removeActionFromStep = function(rIdx, sIdx, aIdx) { if(GlobalMission.rows[rIdx].steps[sIdx].actions.length > 1) { GlobalMission.rows[rIdx].steps[sIdx].actions.splice(aIdx, 1); refreshGlobalRows(); } };
window.addState = function() { GlobalMission.states.push({ actions: [{ port: 'A', direction: 1, speed: 100 }] }); refreshGlobalRows(); };
window.removeState = function(idx) { if(GlobalMission.states.length > 1) { GlobalMission.states.splice(idx, 1); refreshGlobalRows(); } };
window.addActionToState = function(idx) { GlobalMission.states[idx].actions.push({ port: 'A', direction: 1, speed: 100 }); refreshGlobalRows(); };
window.removeActionFromState = function(sIdx, aIdx) { if(GlobalMission.states[sIdx].actions.length > 1) { GlobalMission.states[sIdx].actions.splice(aIdx, 1); refreshGlobalRows(); } };
window.addDefaultAction = function() { GlobalMission.defaultActions.push({ port: 'A', direction: 0, speed: 0 }); refreshGlobalRows(); };
window.removeDefaultAction = function(aIdx) { if(GlobalMission.defaultActions.length > 1) { GlobalMission.defaultActions.splice(aIdx, 1); refreshGlobalRows(); } };

function getIrOptions(sel) { 
    var options = ''; 
    for(var i=0; i<=10; i++) {
        options += '<option value="' + i + '" ' + (sel === i ? 'selected' : '') + '>' + i + '</option>';
    }
    return options; 
}

function getTiltOptions(sel) { 
    var vals = [0, 3, 5, 7, 9];
    var options = '';
    for (var i = 0; i < vals.length; i++) {
        options += '<option value="' + vals[i] + '" ' + (sel === vals[i] ? 'selected' : '') + '>' + vals[i] + '</option>';
    }
    return options;
}

window.applyPresetColor = function(hex) { 
    var colorInput = document.getElementById('global-color');
    if (colorInput) {
        colorInput.value = hex; 
    }
    setGlobalColor(); 
};

window.setGlobalColor = async function() {
    var colorInput = document.getElementById('global-color');
    if (!colorInput) return;
    var rgb = hexToRgb(colorInput.value);
    for (var i = 0; i < AppState.robots.length; i++) { 
        var r = AppState.robots[i];
        r.currentColor = rgb; 
        if (typeof setRGB === 'function') {
            await setRGB(r.id, rgb.r, rgb.g, rgb.b); 
        }
        await sleep(50); 
    }
};

window.setLocalColor = async function(entId, hex) {
    var rgb = hexToRgb(hex);
    var entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    var ent = null;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].id === entId) {
            ent = entities[i];
            break;
        }
    }
    if (!ent) return;
    
    var master = null;
    for (var j = 0; j < AppState.robots.length; j++) {
        if (AppState.robots[j].id === ent.hub1) {
            master = AppState.robots[j];
            break;
        }
    }
    
    if (master) { 
        master.currentColor = rgb; 
        await setRGB(master.id, rgb.r, rgb.g, rgb.b); 
        if (ent.hub2) {
            await setRGB(ent.hub2, rgb.r, rgb.g, rgb.b); 
        }
    }
};

window.toggleReady = function(entId) {
    var entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    var ent = null;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].id === entId) {
            ent = entities[i];
            break;
        }
    }
    if (!ent) return;

    var master = null;
    for (var j = 0; j < AppState.robots.length; j++) {
        if (AppState.robots[j].id === ent.hub1) {
            master = AppState.robots[j];
            break;
        }
    }
    
    if (master) { 
        master.isReady = !master.isReady; 
        master.stateIndex = 0; 
        master.isDetecting = false; 
        renderMissionUI(); 
    }
};

window.executeHardware = async function(entId, portChar, val) {
    var entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    var ent = null;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].id === entId) {
            ent = entities[i];
            break;
        }
    }
    if (!ent) return;

    var targetHub = (portChar === 'A' || portChar === 'B') ? ent.hub1 : ent.hub2;
    var targetPort = (portChar === 'A' || portChar === 'C') ? 1 : 2;
    if (targetHub && typeof setMotor === 'function') {
        await setMotor(targetHub, targetPort, val);
    }
};

// 8. THE INDUSTRIAL DUAL-CORE ENGINE
window.runLocal = async function(entId) {
    var entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    var ent = null;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].id === entId) {
            ent = entities[i];
            break;
        }
    }
    if (!ent) return;

    var master = null;
    for (var j = 0; j < AppState.robots.length; j++) {
        if (AppState.robots[j].id === ent.hub1) {
            master = AppState.robots[j];
            break;
        }
    }
    if (!master) return;
    
    master.isRunning = true; 
    master.stateIndex = 1; 
    master.logicLock = false; 
    master.isDetecting = false;
    
    // Logic: Mode 4 Latching initialization
    master.currentActions = GlobalMission.defaultActions;

    if (master.keepAlive) clearInterval(master.keepAlive);
    if (master.logicLoop) clearInterval(master.logicLoop);
    renderMissionUI();

    // CORE 1: KEEPALIVE WATCHDOG (400ms - Sinyal Anti-Idle)
    master.keepAlive = setInterval(async function() {
        if (!master.isRunning || !master.currentActions) return;
        for (var k = 0; k < master.currentActions.length; k++) {
            var a = master.currentActions[k];
            await executeHardware(entId, a.port, a.speed * a.direction);
        }
    }, 400);

    // CORE 2: LOGIC EVALUATOR (100ms - Otak Pengambil Keputusan)
    master.logicLoop = setInterval(async function() {
        if (!master.isRunning) return;
        if (master.logicLock) return; // Mode Sequence Tuli Sementara
        
        var txt = document.getElementById('state-text-' + ent.hub1);

        // --- ENGINE MODE 1: DIRECT DRIVE ---
        if (GlobalMission.type === 'm1') {
            master.currentActions = GlobalMission.rows[0].actions;
            if (txt) txt.innerText = "STATUS: [ RUNNING ]";
        }
        
        // --- ENGINE MODE 2: TIMER SEQUENCE ---
        else if (GlobalMission.type === 'm2') {
            var row2 = GlobalMission.rows[master.stateIndex - 1];
            if (!row2) { 
                stopLocal(entId); 
                return; 
            }
            
            master.logicLock = true; 
            if (txt) txt.innerText = "STATUS: [ STEP " + master.stateIndex + " ]";
            master.currentActions = row2.actions;
            
            await sleep(row2.time * 1000);
            
            if(master.isRunning) { 
                master.stateIndex++; 
                master.logicLock = false; 
                if(master.stateIndex > GlobalMission.rows.length) {
                    stopLocal(entId);
                }
            }
        }

        // --- ENGINE MODE 3: IR REAKSI BERANTAI ---
        else if (GlobalMission.type === 'm3') {
            var triggeredRow = null;
            for (var r3 = 0; r3 < GlobalMission.rows.length; r3++) {
                var row3 = GlobalMission.rows[r3];
                var sHub3 = (row3.sensorPort === 'A' || row3.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                var val3 = getSensorVal(sHub3, row3.sensorPort, row3.sensorType);
                
                var hit3 = false;
                if (row3.operator === '<') hit3 = (val3 < row3.threshold);
                else if (row3.operator === '==') hit3 = (Math.round(val3) === row3.threshold);
                else if (row3.operator === '>') hit3 = (val3 > row3.threshold);
                
                if (hit3) { 
                    triggeredRow = row3; 
                    break; 
                }
            }
            
            if (triggeredRow) {
                master.logicLock = true; 
                if (txt) txt.innerText = "STATUS: [ REAKSI BERANTAI ]";
                
                for (var s3 = 0; s3 < triggeredRow.steps.length; s3++) {
                    if(!master.isRunning) break;
                    var step3 = triggeredRow.steps[s3];
                    master.currentActions = step3.actions;
                    await sleep(step3.time * 1000); 
                }
                
                if(master.isRunning) master.logicLock = false; 
            } else {
                if (txt) txt.innerText = "STATUS: [ NORMAL ]";
                master.currentActions = GlobalMission.defaultActions;
            }
        }

        // --- ENGINE MODE 4: TILT LATCH (THE PERSNELING LOGIC) ---
        else if (GlobalMission.type === 'm4') {
            var foundTrigger = false;
            for (var r4 = 0; r4 < GlobalMission.rows.length; r4++) {
                var row4 = GlobalMission.rows[r4];
                var sHub4 = (row4.sensorPort === 'A' || row4.sensorPort === 'B') ? ent.hub1 : ent.hub2;
                var val4 = getSensorVal(sHub4, row4.sensorPort, row4.sensorType);
                
                var hit4 = false;
                if (row4.operator === '<') hit4 = (val4 < row4.threshold);
                else if (row4.operator === '==') hit4 = (Math.round(val4) === row4.threshold);
                else if (row4.operator === '>') hit4 = (val4 > row4.threshold);
                
                if (hit4) { 
                    // Pak Saepudin: Jika ada kondisi baru, Timpa memori dan KUNCI (Latch)
                    master.currentActions = row4.actions; 
                    foundTrigger = true;
                    break; 
                }
            }
            // Logika Pak Saepudin: Jika sensor kembali ke 0 (netral) atau tidak ada di daftar,
            // JANGAN RESET ACTIONS. Tetap jalankan kondisi lama sampai ada trigger baru.
            if (txt) {
                if (master.currentActions === GlobalMission.defaultActions) {
                    txt.innerText = "STATUS: [ STARTING ]";
                } else {
                    txt.innerText = "STATUS: [ STATE LOCKED 🔒 ]";
                }
            }
        }

        // --- ENGINE MODE 5: STATE COUNTER ---
        else if (GlobalMission.type === 'm5') {
            var curState = GlobalMission.states[master.stateIndex - 1];
            if (!curState) { 
                master.stateIndex = 1; 
                return; 
            }
            
            master.currentActions = curState.actions;
            
            var sHub5 = (GlobalMission.m5TriggerPort === 'A' || GlobalMission.m5TriggerPort === 'B') ? ent.hub1 : ent.hub2;
            var val5 = getSensorVal(sHub5, GlobalMission.m5TriggerPort, GlobalMission.m5SensorType);
            
            var hit5 = false;
            if (GlobalMission.m5Operator === '<') hit5 = (val5 < GlobalMission.m5TriggerVal);
            else if (GlobalMission.m5Operator === '==') hit5 = (Math.round(val5) === GlobalMission.m5TriggerVal);
            else if (GlobalMission.m5Operator === '>') hit5 = (val5 > GlobalMission.m5TriggerVal);
            
            if (hit5 && !master.isDetecting) {
                master.isDetecting = true;
                master.stateIndex++;
                if (master.stateIndex > GlobalMission.states.length) {
                    master.stateIndex = 1;
                }
            } else if (!hit5) {
                master.isDetecting = false;
            }
            
            if (txt) txt.innerText = "STATUS: [ STATE " + master.stateIndex + " ]";
        }
    }, 100);
};

window.stopLocal = async function(entId) {
    var entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    var ent = null;
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].id === entId) {
            ent = entities[i];
            break;
        }
    }
    if (!ent) return;

    var master = null;
    for (var j = 0; j < AppState.robots.length; j++) {
        if (AppState.robots[j].id === ent.hub1) {
            master = AppState.robots[j];
            break;
        }
    }
    
    if (master) {
        master.isRunning = false; 
        master.logicLock = false; 
        master.currentActions = []; 
        if (master.keepAlive) clearInterval(master.keepAlive);
        if (master.logicLoop) clearInterval(master.logicLoop);
    }
    
    // Safety Force Stop All Ports
    await executeHardware(entId, 'A', 0);
    await executeHardware(entId, 'B', 0);
    if(ent.hub2) {
        await executeHardware(entId, 'C', 0);
        await executeHardware(entId, 'D', 0);
    }
    
    var txt = document.getElementById('state-text-' + ent.hub1);
    if (txt) txt.innerText = "STATUS: [ STOPPED ]";
    
    renderMissionUI();
};

window.broadcastMission = function() {
    GlobalMission.isExecuting = !GlobalMission.isExecuting;
    var entities = typeof getPlayableEntities === 'function' ? getPlayableEntities() : [];
    
    if (GlobalMission.isExecuting) {
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var m = null;
            for (var j = 0; j < AppState.robots.length; j++) {
                if (AppState.robots[j].id === ent.hub1) {
                    m = AppState.robots[j];
                    break;
                }
            }
            if (m && m.isReady) {
                runLocal(ent.id);
            }
        }
    } else {
        stopAllMissions();
    }
    renderMissionUI();
};

window.stopAllMissions = async function() {
    GlobalMission.isExecuting = false;
    for (var i = 0; i < AppState.robots.length; i++) {
        var r = AppState.robots[i];
        r.isRunning = false;
        if (r.keepAlive) clearInterval(r.keepAlive);
        if (r.logicLoop) clearInterval(r.logicLoop);
        
        // Immediate hardware stop via BLE service directly
        if (typeof setMotor === 'function') {
            await setMotor(r.id, 1, 0);
            await setMotor(r.id, 2, 0);
        }
    }
    renderMissionUI();
};

window.renderDashboard = function() {
    renderMissionUI();
};