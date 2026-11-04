# Ringkasan Tahap: Kernel, Ping Pong, dan Monitor Masukan

Ringkasan hasil tahap ini, sebagai acuan sebelum pengembangan berikutnya. Lanjutan dari `microbit-gamepad-ringkasan.md` dan `rancangan-kernel-game-tank.md`.

- **File**: `pingpong-kernel.html` (satu file HTML + CSS + JavaScript, tanpa library; hanya font Fredoka dari Google Fonts)
- **Tautan publikasi**: https://claude.ai/artifact/TdWzWhWZxs5sj8A2YSRZVM
- **Status**: berjalan. Terhubung ke micro:bit dengan baik dan monitor masukan sudah dicoba.
- **Code for Microbit**: https://makecode.microbit.org/S15098-10437-36050-01415
- **Website Webapp** : code.robopanda.my.id/game/pingpong

## 1. Yang sudah dibangun

1. **Kernel** untuk beberapa micro:bit lewat BLE UART, slot pemain, dan keyboard sebagai sumber masukan.
2. **Tiga menu**: Home, Hubungkan pemain, dan pilihan jumlah pemain.
3. **Game ping pong** dengan mode 1 Player (lawan komputer) dan 2 Player.
4. **Monitor masukan**: panel log untuk melihat nilai yang dikirim micro:bit.

## 2. Syarat dan batasan platform

- Chrome atau Edge (komputer dan Android), lewat HTTPS. Safari dan iPhone tidak mendukung Web Bluetooth.
- `requestDevice()` hanya bisa dipanggil dari klik pengguna.
- Di pratinjau chat Bluetooth bisa dibatasi; buka tautan langsung di tab browser.
- Satu micro:bit hanya menerima satu koneksi BLE pada satu waktu.
- Setelah halaman diperbarui, muat ulang dengan Ctrl+Shift+R agar tidak tertahan di cache.

## 3. Alur layar

1. **Home**: tombol Mulai.
2. **Hubungkan pemain**: slot Player 1 dan 2. Tiap slot kosong punya tombol "Hubungkan micro:bit" dan "Pakai keyboard"; slot terisi punya tombol "Lepas" dan menampilkan perintah terakhir yang masuk. Tombol Lanjut aktif bila ada minimal satu pemain.
3. **Berapa pemain?**: "1 Player" aktif bila ada minimal satu pemain, "2 Player" bila ada dua. Bila pemain kurang, tampil petunjuk untuk kembali ke layar koneksi.
4. **Game**: ping pong sampai ada pemenang. Setelah itu, tombol kembali ke lobi (layar Hubungkan pemain).

## 4. Kernel

Kernel hidup di dalam file yang sama dengan game, sebagai objek `Kernel`. Game hanya menerima kejadian standar dan tidak tahu apa pun soal Bluetooth.

**Konfigurasi**
- `MAX_PLAYERS = 4` slot, dan `Kernel.limit = 2` slot yang ditampilkan untuk ping pong.

**Metode**
| Metode | Fungsi |
|---|---|
| `addMicrobit(n)` | Memilih perangkat `BBC micro:bit`, menyambung, dan mengisi slot `n` |
| `addKeyboard(n)` | Mengisi slot `n` dengan keyboard |
| `release(n)` | Melepas slot `n` (memutus micro:bit bila ada) |
| `send(n, teks)` | Mengirim `teks#` ke micro:bit di slot `n` (disiapkan untuk game berikutnya, belum dipakai) |
| `visible()`, `filled()` | Slot yang tampil, dan slot yang terisi |
| `on(kejadian, fungsi)` | Berlangganan kejadian |

**Kejadian**
| Kejadian | Isi |
|---|---|
| `input` | `{player, cmd, source}`: perintah standar berlabel pemain (`source` = `microbit` atau `keyboard`) |
| `players` | Daftar slot berubah (terhubung, terputus, dilepas) |
| `raw` | `{player, text, bytes}`: data mentah dari micro:bit (dipakai monitor) |
| `warn` | Peringatan, misalnya notifikasi balasan tidak aktif |

**Cara kerja koneksi**
- Memakai Nordic UART Service `6e400001-b5a3-f393-e0a9-e50e24dcca9e`.
- Karakteristik dipilih **berdasarkan properti** (notify atau indicate untuk menerima, write untuk mengirim), karena UUID TX/RX micro:bit terbalik dari standar Nordic.
- Bila pengaktifan notifikasi gagal, slot tetap terisi dan hanya muncul peringatan.
- Bila micro:bit terputus, slotnya dikosongkan otomatis.

**Pembacaan pesan micro:bit**
- Data diterima per potongan, digabung di buffer, lalu dipecah pada karakter `#` atau newline.
- Angka di akhir tiap potongan dibaca sebagai perintah. Jadi `3#` dan baris seperti `Mbit:3` sama-sama terbaca sebagai perintah `3`, tanpa mengubah firmware yang sudah ada.

**Keyboard sebagai sumber masukan**
| Kondisi | Tombol |
|---|---|
| Satu slot keyboard | panah **atau** WASD, keduanya aktif |
| Dua slot keyboard | Player 1 memakai tombol panah, Player 2 memakai WASD |

- Atas atau W = `1`, bawah atau S = `2`, kiri atau A = `3`, kanan atau D = `4`.
- Saat tombol dilepas dikirim `0`. Bila ada tombol lain yang masih ditahan, perintah tombol itu yang dikirim.
- Saat jendela kehilangan fokus, tombol yang tertahan dilepas otomatis.

## 5. Kontrak perintah

Sama dengan gamepad dan rancangan sebelumnya. Format: angka lalu `#`.

| Perintah | Arti | Di ping pong |
|---|---|---|
| `0#` | berhenti | paddle berhenti |
| `1#` | maju | paddle naik |
| `2#` | mundur | paddle turun |
| `3#` | belok kiri | paddle naik |
| `4#` | belok kanan | paddle turun |
| `5#` | tembak | belum dipakai |
| `6#` sampai `9#` | belum dipakai | diabaikan |

Perintah selain `0` sampai `4` diabaikan oleh ping pong.

## 6. Ping pong

- Layar kanvas 800 x 480, dengan ukuran tampilan menyesuaikan lebar perangkat.
- **Pemetaan pemain**: 2 Player: slot 1 memegang paddle kiri dan slot 2 paddle kanan. 1 Player: slot pertama yang terisi memegang paddle kiri, paddle kanan dikendalikan komputer.
- **Gerak paddle**: bergerak terus ke arah perintah terakhir sampai menerima `0#`. Kecepatan 420 px per detik.
- **Komputer**: mengikuti posisi bola hanya saat bola bergerak ke arahnya, dengan kecepatan 250 px per detik dan zona toleransi, sehingga bisa dikalahkan.
- **Bola**: mulai 380 px per detik, setiap pantulan paddle kecepatannya naik 6 persen (maksimal 760), dan sudut pantul bergantung pada titik pukul di paddle. Ada jeda 1 detik sebelum bola dilepas.
- **Menang**: yang pertama mencapai **5 poin**. Layar pemenang tampil, lalu tombol kembali ke lobi.
- **Terputus saat bermain**: game berhenti, kembali ke layar koneksi dengan pesan.

Angka-angka kecepatan dan batas skor adalah pilihan awal dan mudah diubah di bagian atas kode game.

## 7. Monitor masukan

- Tampil di bawah layar koneksi, pilihan pemain, dan game (tidak di Home).
- **Baris abu-abu `RX`**: data mentah dari micro:bit, berupa teks dengan `↵` untuk newline, plus byte heksadesimal. Contoh: `"1#"  [31 23]`.
- **Baris hijau**: perintah yang dibaca kernel dari micro:bit, misalnya `→ P1  cmd 3#  (microbit)`.
- **Baris biru**: perintah dari keyboard.
- Juga mencatat perubahan pemain dan peringatan. Tiap baris memiliki jam beserta milidetik.
- Tombol **Jeda** dan **Bersihkan**; tersimpan maksimal 150 baris terakhir.
- Data BLE bisa datang terpotong, jadi satu perintah kadang tampil di dua baris RX lalu muncul sebagai satu baris hijau. Ini normal.

## 8. Keputusan yang masih berlaku

- Firmware micro:bit satu program untuk semua perangkat dan hanya melaporkan masukan mentah; kernel yang memberi label pemain.
- Sepuluh perintah dikunci (`0#` sampai `9#`).
- Batas **4 pemain** per permainan, disesuaikan dengan kemampuan perangkat; perlu diuji di laptop dan tablet kelas.
- Game tank 2 lawan 2 (menara, power-up, respawn, dan seterusnya) **ditunda**. Semua rancangannya tetap tersimpan di `rancangan-kernel-game-tank.md`.

## 9. Keterbatasan dan perbedaan dari rancangan

- Slot pemain **dipilih pengguna lewat tombol di tiap slot**, bukan otomatis berdasarkan urutan sambung seperti pada rancangan awal. Alasannya lebih jelas untuk tes dan sudah berfungsi baik.
- Kernel masih satu file dengan game. Perlu dipisah menjadi file sendiri saat game kedua dibuat.
- `Kernel.send` belum memakai antrian dan pemecahan 20 byte seperti di gamepad.
- Tidak ada sambung ulang otomatis; slot yang terputus dihubungkan lagi lewat layar koneksi.
- Pengujian stabilitas 4 micro:bit sekaligus belum dilakukan (ping pong hanya memakai 2).
- Log monitor belum bisa disalin atau diekspor ke file lewat tombol (teksnya bisa diseleksi manual).

## 10. Langkah berikutnya (usulan)

1. Pisahkan kernel dari game menjadi file tersendiri.
2. Tambahkan antrian kirim di `Kernel.send`, dan sambung ulang bila diperlukan.
3. Uji koneksi 3 sampai 4 micro:bit sekaligus di laptop dan tablet kelas.
4. Mulai game tank di atas kernel (arena, tank, peluru, tembok, menara, power-up).
5. Tambahkan tombol salin atau ekspor pada monitor bila dibutuhkan.

## 11. Checklist uji cepat

1. Buka di Chrome atau Edge, klik Mulai, lalu di Player 1 klik Hubungkan micro:bit. Slot terisi dan monitor mencatat pemain.
2. Tekan tombol di micro:bit; baris RX dan baris hijau muncul di monitor, dan "Perintah terakhir" di slot berubah.
3. Pilih "Pakai keyboard" di slot kosong; tekan panah dan WASD, baris biru muncul.
4. Lanjut, pilih 1 Player; paddle kiri mengikuti masukan dan komputer bermain di kanan.
5. Kembali, isi dua slot, pilih 2 Player; kedua paddle bergerak sendiri-sendiri.
6. Cabut atau matikan micro:bit saat bermain; game berhenti dan kembali ke layar koneksi dengan pesan.
7. Mainkan sampai 5 poin; layar pemenang tampil dan tombol lobi berfungsi.
