/* =========================================================
   MODUL 4: BLE-ENGINE.JS (v22.0 - SIGNAL MONITORING UPDATE)
   Status: No Cleaning - RSSI Added - 300ms Button Debounce
   Features: Signal Strength Tracker, Real-time RSSI, Sync 100ms
========================================================= */

const HUB_SERVICE = '00001523-1212-efde-1523-785feabcd123';
const IO_SERVICE  = '00004f0e-1212-efde-1523-785feabcd123';
const CHAR_BUTTON = '00001526-1212-efde-1523-785feabcd123';
const CHAR_NAME   = '00001524-1212-efde-1523-785feabcd123';
const CHAR_OUTPUT = '00001565-1212-efde-1523-785feabcd123';
const CHAR_SENSOR = '00001560-1212-efde-1523-785feabcd123';
const CHAR_IN_CMD = '00001563-1212-efde-1523-785feabcd123';

document.addEventListener('DOMContentLoaded', () => {
    const btnConnect = document.getElementById('btnConnect');
    if (btnConnect) {
        btnConnect.addEventListener('click', async () => {
            try {
                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: [HUB_SERVICE] }],
                    optionalServices: [IO_SERVICE]
                });

                if (AppState.robots.find(r => r.id === device.id)) {
                    return alert("Robot ini sudah terkoneksi!");
                }

                const server = await device.gatt.connect();
                const hubSvc = await server.getPrimaryService(HUB_SERVICE);
                const ioSvc  = await server.getPrimaryService(IO_SERVICE);

                const btnChar  = await hubSvc.getCharacteristic(CHAR_BUTTON);
                const nameChar = await hubSvc.getCharacteristic(CHAR_NAME);
                const outChar  = await ioSvc.getCharacteristic(CHAR_OUTPUT);
                const cmdChar  = await ioSvc.getCharacteristic(CHAR_IN_CMD);
                const sensChar = await ioSvc.getCharacteristic(CHAR_SENSOR);

                // ENRICHMENT: MONITORING RSSI (SIGNAL STRENGTH)
                try {
                    await device.watchAdvertisements();
                    device.addEventListener('advertisementreceived', (event) => {
                        const r = AppState.robots.find(x => x.id === device.id);
                        if (r) {
                            r.rssi = event.rssi;
                            // Update label sinyal jika ada di UI
                            const signalEl = document.getElementById(`rssi-${device.id}`);
                            if (signalEl) {
                                let status = "Weak";
                                if (r.rssi > -60) status = "Excellent";
                                else if (r.rssi > -80) status = "Good";
                                signalEl.innerText = `${r.rssi} dBm (${status})`;
                                signalEl.style.color = status === "Excellent" ? "#2ecc71" : (status === "Good" ? "#f1c40f" : "#e74c3c");
                            }
                        }
                    });
                } catch (rssiErr) { console.warn("RSSI monitoring tidak didukung di browser ini."); }

                await btnChar.startNotifications();
                btnChar.addEventListener('characteristicvaluechanged', async (e) => {
                    const pressed = e.target.value.getUint8(0) === 1;
                    const r = AppState.robots.find(x => x.id === device.id);
                    if (r) {
                        r.isButtonPressed = pressed;
                        if (pressed) {
                            const now = Date.now();
                            // FIX DEBOUNCE: Dari 1000ms ke 300ms agar lebih responsif
                            if (!r.lastBtnPress || now - r.lastBtnPress > 300) {
                                r.lastBtnPress = now;
                                if (typeof window.handlePhysicalButton === 'function') {
                                    window.handlePhysicalButton(r.id);
                                }
                            }
                        }
                        const btnLabel = document.getElementById(`btn-state-${r.id}`);
                        if (btnLabel) {
                            btnLabel.innerHTML = pressed ? ' FISIK DITEKAN' : ' FISIK LEPAS';
                            btnLabel.style.color = pressed ? 'red' : '#ccc';
                        }
                    }
                });

                await sensChar.startNotifications();
                sensChar.addEventListener('characteristicvaluechanged', (e) => {
                    const data = e.target.value;
                    const now = Date.now();
                    const r = AppState.robots.find(x => x.id === device.id);
                    
                    // SYNC RATE: Pastikan minimal secepat Logic Engine (100ms)
                    if (r && data.byteLength >= 3 && (!r.lastSensorUpdate || now - r.lastSensorUpdate >= 100)) {
                        const port = data.getUint8(1);
                        let val = 0;
                        if (data.byteLength >= 6) {
                            val = Math.round(data.getFloat32(2, true) * 10) / 10;
                        } else {
                            val = data.getUint8(2);
                        }
                        r.lastSensorVal = val;
                        r.lastSensorUpdate = now;
                        const el = document.getElementById(`sens${(port === 1 ? '1' : '2')}-${device.id}`);
                        if (el) el.innerText = val;
                    }
                });

                AppState.robots.push({ 
                    id: device.id, 
                    name: device.name || "Robopanda Hub", 
                    device: device,
                    out: outChar, 
                    cmd: cmdChar, 
                    nameC: nameChar,
                    isReady: false,
                    isRunning: false,
                    rssi: -100, // Default nilai lemah
                    currentColor: {r:0, g:0, b:255}, 
                    lastSensorVal: 0
                });
                updateUI();
            } catch (err) { console.error("Koneksi gagal:", err); }
        });
    }
});

window.setMotor = async function(rid, port, speed) {
    const r = AppState.robots.find(x => x.id === rid);
    if (!r || !r.out) return;
    const b = speed == 0 ? 0 : (speed > 0 ? speed : 256 - Math.abs(speed));
    try { await r.out.writeValue(new Uint8Array([port, 0x01, 0x01, b])); } catch(e) {}
};

window.setRGB = async function(rid, red, green, blue) {
    const r = AppState.robots.find(x => x.id === rid);
    if (r && r.out) {
        try { await r.out.writeValue(new Uint8Array([0x06, 0x04, 0x03, red, green, blue])); } catch(e) {}
    }
};

window.setupSensor = async function(rid, port, type) {
    const r = AppState.robots.find(x => x.id === rid);
    if (!r || !r.cmd) return;
    const payload = type === 'tilt' 
        ? [0x01, 0x02, port, 0x22, 0x01, 0x01, 0x00, 0x00, 0x00, 0x02, 0x01]
        : [0x01, 0x02, port, 0x23, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x01];
    try {
        await r.cmd.writeValue(new Uint8Array(payload));
        setTimeout(async () => {
            try { await r.cmd.writeValue(new Uint8Array([0x00, 0x01, port])); } catch(e) {}
        }, 200);
    } catch(e) {}
};

window.disconnectRobot = function(rid) {
    const r = AppState.robots.find(x => x.id === rid);
    if (r && r.device.gatt.connected) {
        setMotor(rid, 1, 0); setTimeout(() => setMotor(rid, 2, 0), 50);
        setTimeout(() => r.device.gatt.disconnect(), 150);
    }
};

window.identifyRobot = async function(rid) {
    await setRGB(rid, 255, 0, 0); await new Promise(r => setTimeout(r, 300));
    await setRGB(rid, 0, 0, 255); await new Promise(r => setTimeout(r, 300));
    await setRGB(rid, 255, 0, 0); await new Promise(r => setTimeout(r, 300));
    await setRGB(rid, 0, 0, 255);
};

window.renameRobot = async function(rid) {
    const r = AppState.robots.find(x => x.id === rid);
    if(!r || !r.nameC) return;
    const n = prompt("Ganti nama robot:", r.name);
    if (n && n !== r.name) {
        try {
            await r.nameC.writeValue(new TextEncoder().encode(n.substring(0, 14)));
            r.name = n.substring(0, 14);
            updateUI();
        } catch(e) { alert("Gagal."); }
    }
};