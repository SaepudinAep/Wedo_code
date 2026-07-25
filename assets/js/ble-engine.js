/* =========================================================
   MODUL 4: BLE-ENGINE.JS (v23.0 - STABLE RESET)
   Status: No Cleaning - Code gen tanpa warna syntax - Reset ke versi stabil v23.0
========================================================= */

const HUB_SERVICE = '00001523-1212-efde-1523-785feabcd123';
const IO_SERVICE  = '00004f0e-1212-efde-1523-785feabcd123';
const CHAR_BUTTON = '00001526-1212-efde-1523-785feabcd123';
const CHAR_NAME   = '00001524-1212-efde-1523-785feabcd123';
const CHAR_PTYPE  = '00001527-1212-efde-1523-785feabcd123'; 

const CHAR_OUTPUT = '00001565-1212-efde-1523-785feabcd123';
const CHAR_SENSOR = '00001560-1212-efde-1523-785feabcd123';
const CHAR_IN_CMD = '00001563-1212-efde-1523-785feabcd123';

document.addEventListener('DOMContentLoaded', () => {
    const btnConnect = document.getElementById('btnConnect');
    if (btnConnect) {
        btnConnect.addEventListener('click', async () => {
            try {
                if (AppState.robots.length >= 3) {
                    return alert("Batas maksimal koneksi adalah 3 hub robot secara simultan demi kestabilan perangkat.");
                }

                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: [HUB_SERVICE] }],
                    optionalServices: [IO_SERVICE, 'battery_service']
                });

                if (AppState.robots.find(r => r.id === device.id)) {
                    return alert("Robot ini sudah terkoneksi!");
                }

                device.addEventListener('gattserverdisconnected', async () => {
                    const index = AppState.robots.findIndex(x => x.id === device.id);
                    if (index !== -1) {
                        const r = AppState.robots[index];
                        r.isReady = false;
                        r.isRunning = false;
                        if (r.programRunner) r.programRunner.stop();
                        
                        AppState.robots.splice(index, 1);

                        if (typeof updateRobotStatus === 'function') updateRobotStatus(r.id, 'disconnected');
                        if (typeof showAlert === 'function') showAlert(`Robot ${r.name} terputus dan dihapus dari daftar.`, 'warning');
                        updateUI();
                    }
                });

                const server = await device.gatt.connect();
                const hubSvc = await server.getPrimaryService(HUB_SERVICE);
                
                let ioSvc;
                let isClone = false;
                try {
                    ioSvc = await server.getPrimaryService(IO_SERVICE);
                    isClone = true;
                } catch (e) {
                    ioSvc = hubSvc; 
                    isClone = false;
                }

                const btnChar  = await hubSvc.getCharacteristic(CHAR_BUTTON);
                const nameChar = await hubSvc.getCharacteristic(CHAR_NAME);

                let outChar, cmdChar, sensChar;
                try {
                    outChar  = await ioSvc.getCharacteristic(CHAR_OUTPUT);
                    cmdChar  = await ioSvc.getCharacteristic(CHAR_IN_CMD);
                    sensChar = await ioSvc.getCharacteristic(CHAR_SENSOR);
                } catch (errRoute1) {
                    try {
                        outChar  = await hubSvc.getCharacteristic(CHAR_OUTPUT);
                        cmdChar  = await hubSvc.getCharacteristic(CHAR_IN_CMD);
                        sensChar = await hubSvc.getCharacteristic(CHAR_SENSOR);
                    } catch (errRoute2) {}
                }

                try {
                    await device.watchAdvertisements();
                    device.addEventListener('advertisementreceived', (event) => {
                        const r = AppState.robots.find(x => x.id === device.id);
                        if (r) {
                            r.rssi = event.rssi;
                            const signalEl = document.getElementById(`rssi-${device.id}`);
                            if (signalEl) {
                                let status = "Weak";
                                if (r.rssi > -60) status = "Excellent";
                                else if (r.rssi > -80) status = "Good";
                                signalEl.innerText = `${r.rssi} dBm (${status})`;
                            }
                        }
                    });
                } catch (rssiErr) {}

                await btnChar.startNotifications();
                btnChar.addEventListener('characteristicvaluechanged', async (e) => {
                    const pressed = e.target.value.getUint8(0) === 1;
                    const r = AppState.robots.find(x => x.id === device.id);
                    if (r) {
                        r.isButtonPressed = pressed;
                        if (pressed) {
                            const now = Date.now();
                            if (!r.lastBtnPress || now - r.lastBtnPress > 300) {
                                r.lastBtnPress = now;
                                if (typeof window.handlePhysicalButton === 'function') {
                                    window.handlePhysicalButton(r.id);
                                }
                            }
                        }
                        const btnLabel = document.getElementById(`btn-state-${r.id}`);
                        if (btnLabel) {
                            btnLabel.innerHTML = pressed ? '  FISIK DITEKAN' : '  FISIK LEPAS';
                            btnLabel.style.color = pressed ? 'red' : '#ccc';
                        }
                    }
                });

                try {
                    const pTypeChar = await hubSvc.getCharacteristic(CHAR_PTYPE);
                    await pTypeChar.startNotifications();
                    pTypeChar.addEventListener('characteristicvaluechanged', (e) => {
                        const data = e.target.value;
                        if (data.byteLength >= 5) {
                            const channel = data.getUint8(1);
                            const action  = data.getUint8(2); 
                            const devType = data.getUint8(4); 
                            const r = AppState.robots.find(x => x.id === device.id);
                            if (r) {
                                if (action === 0x01) {
                                    r.portMap[channel] = devType;
                                    if (devType === 0x23) setupSensor(r.id, channel, 'ultrasonic');
                                    if (devType === 0x22) setupSensor(r.id, channel, 'tilt');
                                } else {
                                    delete r.portMap[channel];
                                }
                            }
                        }
                    });
                } catch (e) {}

                try {
                    const batterySvc  = await server.getPrimaryService('battery_service');
                    const batteryChar = await batterySvc.getCharacteristic('battery_level');
                    await batteryChar.startNotifications();
                    batteryChar.addEventListener('characteristicvaluechanged', (e) => {
                        const level = e.target.value.getUint8(0);
                        const r = AppState.robots.find(x => x.id === device.id);
                        if (r) {
                            r.battery = level;
                            if (typeof updateBatteryUI === 'function') updateBatteryUI(r.id, level);
                        }
                    });
                    const initialBat = await batteryChar.readValue();
                    const r = AppState.robots.find(x => x.id === device.id);
                    if (r) r.battery = initialBat.getUint8(0);
                } catch (e) {}

                if (sensChar) {
                    await sensChar.startNotifications();
                    sensChar.addEventListener('characteristicvaluechanged', (e) => {
                        const data = e.target.value;
                        const now = Date.now();
                        const r = AppState.robots.find(x => x.id === device.id);
                        
                        if (r && data.byteLength >= 3 && (!r.lastSensorUpdate || now - r.lastSensorUpdate >= 80)) {
                            const port = data.getUint8(1);
                            let val = 0;
                            if (data.byteLength >= 6) {
                                val = Math.round(data.getFloat32(2, true) * 10) / 10;
                            } else {
                                val = data.getUint8(2);
                            }
                            r.lastSensorVal = val;
                            r.sensorValues[port] = val;
                            r.lastSensorUpdate = now;
                            const el = document.getElementById(`sens${(port === 1 ? '1' : '2')}-${device.id}`);
                            if (el) el.innerText = val;
                        }
                    });
                }

                AppState.robots.push({ 
                    id: device.id, 
                    name: device.name || (isClone ? "Robopanda Clone" : "Robopanda Hub"), 
                    device: device,
                    out: outChar, 
                    cmd: cmdChar, 
                    nameC: nameChar,
                    isReady: false,
                    isRunning: false,
                    rssi: -100, 
                    currentColor: {r:0, g:0, b:255}, 
                    lastSensorVal: 0,
                    battery: 100,
                    portMap: {},
                    sensorValues: {},
                    programRunner: null,
                    lastBtnPress: 0
                });
                updateUI();
            } catch (err) { console.error("Koneksi gagal:", err); }
        });
    }
});

window.setMotor = async function(rid, port, speed) {
    const r = AppState.robots.find(x => x.id === rid);
    if (!r || !r.out) return;
    
    const safeSpeed = Math.max(-100, Math.min(100, speed));
    let speedByte;
    if (safeSpeed === 0) {
        speedByte = 0x7f; 
    } else if (safeSpeed > 0) {
        speedByte = Math.round((safeSpeed / 100) * 0x64); 
    } else {
        speedByte = 256 - Math.round((Math.abs(safeSpeed) / 100) * 0x64);
    }
    
    try { await r.out.writeValue(new Uint8Array([port, 0x01, 0x01, speedByte])); } catch(e) {}
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
        }, 150);
    } catch(e) {}
};

window.disconnectRobot = function(rid) {
    const r = AppState.robots.find(x => x.id === rid);
    if (r && r.device.gatt.connected) {
        setMotor(rid, 1, 0); setTimeout(() => setMotor(rid, 2, 0), 30);
        setTimeout(() => r.device.gatt.disconnect(), 100);
    }
};

window.identifyRobot = async function(rid) {
    await setRGB(rid, 255, 0, 0); await new Promise(r => setTimeout(r, 250));
    await setRGB(rid, 0, 0, 255); await new Promise(r => setTimeout(r, 250));
    await setRGB(rid, 255, 0, 0); await new Promise(r => setTimeout(r, 250));
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