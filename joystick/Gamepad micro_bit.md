# Ringkasan Web App Gamepad micro:bit (BLE UART)

Dokumen ini merangkum kondisi web app **sebelum pengembangan lanjutan**. Tujuannya sebagai acuan bagi manusia atau AI agent yang akan melanjutkan pekerjaan.

- **File**: `microbit-gamepad.html` (satu file HTML + CSS + JavaScript, tanpa library)
- **Tautan publikasi**: https://claude.ai/artifact/6R2MZ3Zvw17wwQschn3dt9
- **Bahasa antarmuka**: Indonesia
- **Status**: berjalan. Terhubung ke micro:bit, mengirim perintah, dan menerima balasan `Mbit:...` sudah terbukti.

## 1. Tujuan

Mengendalikan satu micro:bit dari browser lewat Bluetooth Low Energy dengan tampilan gamepad. Pengguna utama adalah murid TK sampai SD yang didampingi guru robotik, jadi tombol dibuat besar dan sederhana.

## 2. Syarat dan batasan platform

- Browser: **Chrome atau Edge** (komputer dan Android). Firefox, Safari, dan iPhone tidak mendukung Web Bluetooth.
- Harus dibuka lewat **HTTPS** atau `localhost`.
- `requestDevice()` hanya boleh dipanggil dari klik pengguna.
- Di dalam pratinjau chat Bluetooth bisa dibatasi; buka tautan langsung di tab browser.
- micro:bit hanya menerima **satu koneksi BLE** pada satu waktu.
- Halaman yang sudah dipublikasikan bisa tertahan di cache browser; muat ulang dengan Ctrl+Shift+R setelah ada perubahan.

## 3. Protokol komunikasi

Memakai **Nordic UART Service (NUS)** di atas GATT/ATT. micro:bit adalah GATT server (Peripheral), browser adalah GATT client (Central).

| Item | Nilai |
|---|---|
| Nama perangkat | diawali `BBC micro:bit` (misalnya `BBC micro:bit [zevag]`) |
| Service UUID | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Karakteristik `6e400002-...` | micro:bit **mengirim** data (notify) |
| Karakteristik `6e400003-...` | micro:bit **menerima** data (write) |
| Pairing | No Pairing Required (Project Settings MakeCode) |

**Penting**: arah UUID micro:bit terbalik dari standar Nordic. Karena itu aplikasi **tidak memilih karakteristik berdasarkan UUID**, melainkan berdasarkan propertinya:
- karakteristik dengan `notify` atau `indicate` dipakai untuk menerima,
- karakteristik dengan `write` atau `writeWithoutResponse` dipakai untuk mengirim.

**Format pesan**
- Web app ke micro:bit: teks ASCII diakhiri `#`, misalnya `1#`.
- micro:bit ke web app: satu baris berakhir newline, misalnya `Mbit:1`.
- Data dikirim dalam potongan maksimal 20 byte lewat antrian (tidak ada penulisan bertumpuk).
- Notifikasi masuk dirakit di buffer lalu dipecah per baris.

## 4. Firmware micro:bit referensi (MakeCode)

```typescript
bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Yes)
})
bluetooth.onBluetoothDisconnected(function () {
    basic.showIcon(IconNames.No)
})
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Hash), function () {
    cmd = bluetooth.uartReadUntil(serial.delimiters(Delimiters.Hash))
    if (cmd == "1") {
        basic.showIcon(IconNames.Heart)
    } else if (cmd == "2") {
        basic.clearScreen()
    }
    bluetooth.uartWriteLine("Mbit:" + cmd)
})
let cmd = ""
bluetooth.startUartService()
```

Catatan:
- Gunakan event `onUartDataReceived`, bukan loop `while` di dalam `onBluetoothConnected`.
- Firmware contoh baru menangani `1` dan `2`. Perintah `0` sampai `8` lainnya perlu ditambahkan sendiri.
- Di micro:bit V1, jangan tambahkan extension radio (bisa memicu error 020/021).
- Sebaiknya tambahkan `.trim()` pada `uartReadUntil` agar tahan terhadap CR/LF.

## 5. Pemetaan perintah

Pemetaan ada di blok `MAP` di bagian atas script.

| Perintah | Tombol di gamepad | Keyboard |
|---|---|---|
| `0#` | STOP | Spasi |
| `1#` | D-pad atas | Panah atas |
| `2#` | D-pad bawah | Panah bawah |
| `3#` | D-pad kiri | Panah kiri |
| `4#` | D-pad kanan | Panah kanan |
| `5#` | W | W |
| `6#` | A | A |
| `7#` | S | S |
| `8#` | D | D |

Nilai `5#` sampai `8#` adalah asumsi awal dan bisa diubah di `MAP`.

## 6. Perilaku kontrol

Logika berbasis **peristiwa tekan dan lepas tombol** (press/release).

- **Tombol arah (D-pad atau joystick)**: tekan mengirim perintahnya; lepas mengirim `0#` bila opsi "Lepas D-pad/joystick = kirim stop" dicentang (aktif secara default).
- **W A S D**: hanya mengirim perintah saat ditekan. **Tidak mengirim apa pun saat dilepas**, karena dipakai untuk kode lain.
- **STOP**: hanya mengirim `0#` saat ditekan.
- **Keyboard**: tombol yang ditahan tidak dikirim berulang (`repeat` diabaikan). Saat jendela kehilangan fokus (`blur`), semua tombol yang sedang ditekan dilepas.
- **Joystick**:
  - Mode 4 arah. Arah ditentukan dari sumbu yang geserannya lebih dominan.
  - Ada zona mati di tengah (sekitar 45% dari jarak geser maksimum).
  - Perintah hanya dikirim saat arah **berubah**; berpindah arah langsung mengirim perintah baru tanpa `0#` di antaranya.
  - Dikembalikan ke tengah atau dilepas mengirim `0#` (mengikuti opsi di atas).
- **Pilihan mode arah** (D-pad atau Joystick) disimpan di `localStorage` dengan kunci `dirMode`.

## 7. Antarmuka

- Bagian atas: judul, indikator status (titik berwarna + teks), tombol **Hubungkan**, **Sambung ulang**, **Putuskan**. Tombol Hubungkan tampil saat belum terhubung; Putuskan tampil saat terhubung; Sambung ulang tampil setelah koneksi terputus dan perangkat pernah dipilih.
- Kotak peringatan merah untuk browser yang tidak didukung atau koneksi gagal.
- Gamepad: D-pad atau joystick di kiri, panel tengah (pilihan mode, tombol STOP, opsi lepas = stop), empat tombol W A S D berbentuk diamond di kanan.
- Tombol dinonaktifkan sampai terhubung.
- Panel **Log** (maksimal 80 baris): `Kirim:` (biru), `Balasan:` (hijau), error (merah), info (abu-abu).
- Tema terang dan gelap otomatis mengikuti sistem. Font Fredoka dengan cadangan font sistem.
- **Responsif**: tampilan besar di layar lebar (900 px ke atas), HP portrait menyusun D-pad dan WASD berdampingan dengan STOP di bawah, HP landscape dipadatkan.

## 8. Struktur kode

Seluruhnya di satu file. Urutan di dalam `<script>`:

1. **Pengaturan**: `MAP`, `STOP_CMD`, `KEYS` (pemetaan keyboard).
2. **Bluetooth**: kelas `BleUart` (turunan `EventTarget`).
   - Metode: `connect()`, `reconnect()`, `attach()`, `onData()`, `send()`, `disconnect()`.
   - Event: `connected`, `disconnected`, `line` (satu baris balasan), `diag` (info diagnostik atau peringatan).
   - Properti `stage` mencatat tahap koneksi terakhir untuk pesan error.
3. **UI**: `log()`, `setState()`, `showNotice()`, `sendCmd()`, `doConnect()`, handler tombol koneksi.
4. **Tombol layar**: `press()` dan `release()` dengan pointer events, kumpulan `held`.
5. **Joystick dan mode**: `setStickDir()`, `moveStick()`, `endStick()`, `setMode()`.
6. **Keyboard**: `keydown`, `keyup`, `blur`.

Status koneksi: `idle`, `connecting`, `connected`, `disconnected`.

## 9. Penanganan error

- Browser tanpa Web Bluetooth: pesan petunjuk, tombol Hubungkan dinonaktifkan.
- Pemilihan perangkat dibatalkan (`NotFoundError`): kembali ke `idle` tanpa error merah.
- Gagal terhubung: pesan petunjuk (program UART berjalan, tidak terhubung ke perangkat lain, Bluetooth aktif) dan baris `Gagal di tahap [...]` di Log.
- **Toleran terhadap notifikasi**: bila pengaktifan notifikasi gagal, status tetap **Terhubung** dan perintah tetap bisa dikirim; hanya muncul peringatan di Log.
- Gagal kirim: dicatat di Log, antrian tidak macet.
- Pemutusan manual lewat tombol Putuskan dicatat sebagai info ("Koneksi diputus."), bukan error.

## 10. Riwayat masalah yang sudah diselesaikan

| Masalah | Penyebab | Solusi |
|---|---|---|
| `GATT Error: Not supported` | UUID TX/RX diasumsikan sama dengan standar Nordic padahal terbalik | Pilih karakteristik berdasarkan properti; jangan batalkan koneksi bila notifikasi gagal |
| Perbaikan tidak terlihat | Halaman versi lama tertahan di cache | Muat ulang dengan Ctrl+Shift+R |
| Koneksi terlihat gagal padahal micro:bit sudah menampilkan centang | Langkah lanjutan (notifikasi) dianggap kegagalan koneksi | Kegagalan notifikasi hanya menjadi peringatan |

Catatan kecil: baris diagnostik `Karakteristik: 0002 () | 0003 ()` menampilkan tanda kurung kosong karena cara membaca properti di diagnostik; ini hanya soal tampilan dan tidak memengaruhi koneksi.

## 11. Keterbatasan saat ini

- Hanya **satu micro:bit** sekaligus.
- Joystick hanya 4 arah (tanpa diagonal dan tanpa kecepatan proporsional).
- Tidak ada sambung ulang otomatis; harus menekan Sambung ulang.
- Pemetaan perintah hanya bisa diubah lewat kode (belum ada pengaturan di antarmuka).
- Opsi "Lepas D-pad/joystick = kirim stop" tidak disimpan setelah halaman dimuat ulang.
- Log hanya di layar, tidak bisa disalin atau diekspor.
- Belum ada tampilan khusus untuk data sensor dari micro:bit; balasan hanya masuk ke Log.

## 12. Gagasan pengembangan lanjutan (belum diputuskan)

- Kontrol beberapa micro:bit (daftar perangkat dan pilihan target perintah) atau versi pemancar-radio untuk kelas besar.
- Joystick 8 arah atau kecepatan proporsional (butuh perintah baru di firmware, misalnya format `X50Y80#`).
- Pengaturan pemetaan perintah di antarmuka dan disimpan di browser.
- Panel balasan terakhir yang besar, kolom kirim teks bebas, dan tampilan data sensor.
- Sambung ulang otomatis.
- Firmware lengkap untuk `0#` sampai `8#` (motor, sensor).
- Hosting di domain sendiri agar Web Bluetooth tidak terkendala pratinjau.

## 13. Checklist uji cepat

1. Buka di Chrome atau Edge, klik Hubungkan, pilih `BBC micro:bit`. Layar micro:bit menampilkan centang dan status berubah menjadi Terhubung.
2. Tekan tiap tombol arah; Log menampilkan `Kirim: N#` lalu `Balasan: Mbit:N`. Saat dilepas, `0#` terkirim.
3. Tekan W A S D; perintah terkirim hanya saat ditekan, tidak ada `0#` saat dilepas.
4. Tekan panah dan Spasi di keyboard; perilakunya sama dengan tombol di layar.
5. Ganti ke mode Joystick; geser ke empat arah dan kembalikan ke tengah (`0#` terkirim).
6. Klik tombol berulang dengan cepat; tidak ada error `GATT operation already in progress`.
7. Tekan Putuskan; status Terputus dan tombol nonaktif. Tekan Sambung ulang; perintah berfungsi lagi tanpa memuat ulang halaman.
8. Uji tampilan di laptop, tablet, dan HP (portrait dan landscape).
