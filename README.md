---

# **AERI LIGHT \- Custom Headlight Control Module**

Sebuah sistem kontrol lampu kendaraan (alis, shroud, demon eye) berbasis ESP32 yang dikontrol sepenuhnya melalui Progressive Web App (PWA) dari smartphone Anda.

---

## **✨ Fitur Utama**

* **Kontrol Multi-Zona**: Pengaturan terpisah untuk Alis, Shroud, dan Demon Eye, termasuk target kiri, kanan, atau keduanya.  
* **Efek Dinamis**: Berbagai macam mode lampu seperti Breathing, Rainbow, Comet, Twinkle, Fire, dan Gradient.  
* **Sinkronisasi Musik (Audio Visualizer)**: Sinkronkan lampu dengan musik di sekitar Anda menggunakan mikrofon smartphone.  
* **Integrasi Lampu Sein**: Lampu alis otomatis berubah menjadi lampu sein berjalan (sequential) saat diaktifkan.  
* **Animasi Selamat Datang (Welcome Animation)**: Efek animasi keren saat pertama kali dinyalakan.  
* **Kustomisasi Penuh**: Atur warna (Roda Warna & RGB), kecerahan, dan kecepatan animasi.  
* **Manajemen Preset**: Simpan dan muat konfigurasi lampu favorit Anda dalam 5 slot preset.  
* **Progressive Web App (PWA)**: Antarmuka kontrol yang cepat, responsif, bisa di-install di homescreen, dan dapat diakses bahkan saat offline.  
* **Setup Mudah**: Konfigurasi WiFi awal yang mudah melalui captive portal.

---

## **🛠️ Teknologi yang Digunakan**

Proyek ini terbagi menjadi dua bagian utama: Firmware (backend) dan Aplikasi Web (frontend).

### **Perangkat Keras (Hardware)**

* Mikrokontroler: **ESP32**  
* LED: **WS2812B** (Neopixel)  
* Modul Lain: Regulator tegangan, logic level shifter (direkomendasikan).

### **Firmware (Backend)**

* Framework: **Arduino / PlatformIO**  
* Bahasa: **C++**  
* Library Utama:  
  * FastLED: Untuk kontrol strip LED.  
  * ESPAsyncWebServer: Untuk web server yang efisien.  
  * ArduinoJson: Untuk parsing dan serialisasi data JSON.  
  * Preferences: Untuk menyimpan konfigurasi ke memori non-volatile.  
  * SPIFFS: Untuk menyimpan file aplikasi web di dalam chip ESP32.

### **Aplikasi Web (Frontend)**

* Bahasa: **HTML5, CSS3, JavaScript (Vanilla JS)**  
* Fitur: **Progressive Web App (PWA)** dengan Service Worker untuk fungsionalitas offline.  
* Library:  
  * iro.js: Untuk antarmuka color picker yang interaktif.

---

## **🚀 Instalasi & Setup**

### **Kebutuhan**

1. Arduino IDE atau PlatformIO (VS Code) yang sudah ter-setup untuk ESP32.  
2. Hardware yang sudah dirakit sesuai skema.  
3. Library-library yang disebutkan di atas sudah ter-install.

### **Langkah-langkah Firmware**

1. Buka proyek ini di Arduino IDE atau VS Code (PlatformIO).  
2. Pastikan pin GPIO di dalam file `src/main.cpp` atau `src/main.ino` sudah sesuai dengan rangkaian perangkat keras Anda.  
3. **Penting**: Unggah file sistem (SPIFFS) terlebih dahulu. Ini akan mengunggah seluruh isi folder `data/` ke memori ESP32.  
   * Di PlatformIO: Jalankan task Upload File System image.  
   * Di Arduino IDE: Gunakan plugin "ESP32 Sketch Data Upload".  
4. Unggah kode utama (`main.cpp` atau `main.ino`) ke board ESP32 Anda.

### **Setup Awal Pengguna**

1. Nyalakan perangkat. ESP32 akan membuat WiFi Access Point dengan SSID **"AERI_LIGHT_SETUP"**.  
2. Hubungkan smartphone Anda ke jaringan tersebut. Sebuah halaman login (captive portal) akan muncul secara otomatis.  
3. Pindai dan pilih jaringan WiFi rumah Anda, masukkan password, lalu simpan.  
4. Perangkat akan restart dan terhubung ke WiFi Anda. Buka browser dan akses alamat IP perangkat untuk mulai mengontrol lampu.

---

## **📁 Struktur Folder**

```
headlight-control-module/
├── data/                  # Berisi semua file untuk Aplikasi Web (PWA)
│   ├── icons/             # Koleksi ikon untuk PWA
│   ├── app.js             # Logika utama JavaScript untuk frontend
│   ├── index.html         # Halaman antarmuka kontrol utama
│   ├── iro.min.js         # Library JavaScript untuk color picker
│   ├── login.html         # Halaman login/password
│   ├── manifest.json      # File konfigurasi standar PWA
│   ├── orbitron.ttf       # Font untuk tampilan
│   ├── service-worker.js  # Script yang memungkinkan fungsionalitas offline
│   ├── setup.html         # Halaman untuk setup WiFi awal (Captive Portal)
│   └── style.css          # File styling untuk semua halaman web
│
├── src/
│   ├── main.cpp           # Kode sumber utama firmware untuk ESP32 (PlatformIO)
│   └── main.ino           # Alternatif kode utama (Arduino IDE, jika diperlukan)
│
├── platformio.ini         # Konfigurasi project PlatformIO
├── README.md              # File dokumentasi yang sedang Anda baca
└── ... (file lain jika ada)
```

---

## **📄 Lisensi**

Proyek ini dilisensikan di bawah \[Isi dengan Lisensi Anda, misal: MIT License\].

---

## **🙌 Kontribusi**

Kontribusi, isu, dan permintaan fitur sangat diterima. Jangan ragu untuk membuat *pull request* atau membuka *issue* baru.

---

## Ringkasan Proyek

ESP32 RGB LED Controller (AERI LIGHT MEDAN) adalah sistem pengendali lampu RGB berbasis ESP32 untuk otomotif (alis, shroud, demon eye) dengan antarmuka web progresif (PWA). Proyek ini memungkinkan pengguna mengatur warna, efek, dan preset lampu secara real-time melalui WiFi, baik dari smartphone maupun komputer.

**Fitur Utama:**
- Kontrol multi-zona: Alis, Shroud, Demon Eye (kiri, kanan, atau keduanya)
- Efek animasi dinamis: Breathing, Rainbow, Comet, Twinkle, Fire, Gradient
- Preset konfigurasi lampu (simpan/muat)
- Setup WiFi mudah via captive portal
- Web UI responsif, bisa diakses offline (PWA)
- Proteksi akses dengan password/PIN
- Sinkronisasi efek sein dan animasi selamat datang

## Arsitektur Sistem

```
+-------------------+         +-------------------+         +---------------------+
|   Pengguna (Web)  | <--->   |   ESP32 Firmware  | <--->   |   Hardware LED      |
|  (Smartphone/PC)  |  WiFi   | (AsyncWebServer)  |  GPIO   |  (WS2812B, relay)   |
+-------------------+         +-------------------+         +---------------------+
```

**Alur Data:**
1. Pengguna mengakses Web UI via WiFi (AP/STA).
2. Permintaan dikirim ke ESP32 (REST API/WebSocket).
3. Firmware memproses perintah, mengatur LED via FastLED.
4. Status dan feedback dikirim balik ke Web UI.

**Timing Kritis:**
- Efek LED berjalan di loop utama dengan interval ~16ms (60 FPS).
- Respons UI real-time, update status via AJAX/fetch.

## Spesifikasi Hardware

### Daftar Komponen
- ESP32 Dev Board (rekomendasi: ESP32-WROOM-32)
- LED Strip WS2812B (jumlah sesuai kebutuhan)
- Resistor 330Ω (pada data line LED)
- Kapasitor 1000µF (pada VCC LED)
- Regulator 5V (jika sumber >5V)
- Logic Level Shifter (jika supply LED 5V)
- Tombol reset (opsional)

### Tabel Pinout

| Fungsi         | GPIO ESP32 | Keterangan         |
|----------------|------------|--------------------|
| Alis Kiri      | 5          | Data WS2812B       |
| Alis Kanan     | 19         | Data WS2812B       |
| Shroud Kiri    | 18         | Data WS2812B       |
| Shroud Kanan   | 4          | Data WS2812B       |
| Demon Kiri     | 17         | Data WS2812B       |
| Demon Kanan    | 16         | Data WS2812B       |
| Sein Kiri      | 23         | Input sein         |
| Sein Kanan     | 26         | Input sein         |

### Konsumsi Daya
- Tegangan kerja LED: 5V
- Arus per LED: ~60mA (putih penuh)
- Catatan: Pastikan catu daya cukup untuk total LED. Gunakan kabel tebal dan solder koneksi dengan baik.

## Persiapan Lingkungan Pengembangan

### IDE & Kompiler
1. PlatformIO (VS Code): Direkomendasikan untuk workflow modern.
2. Arduino IDE: Alternatif, pastikan plugin ESP32 terpasang.

### Library yang Dibutuhkan
- FastLED
- ESPAsyncWebServer
- AsyncTCP
- ArduinoJson
- Preferences
- SPIFFS (built-in ESP32 core)

### Kloning Repositori & Struktur Folder

```sh
git clone https://github.com/username/aeri-light-medan.git
cd aeri-light-medan
```

Struktur Folder:
```
headlight-control-module/
├── data/                  # Web UI (PWA)
├── src/                   # Firmware (main.cpp/main.ino)
├── platformio.ini
└── README.md
```

## Cara Instalasi Firmware

### Build & Flash

#### PlatformIO (VS Code)
1. Buka folder project di VS Code.
2. Pilih board ESP32 di platformio.ini.
3. Klik Build (ikon centang) untuk kompilasi.
4. Klik Upload (ikon panah) untuk flash firmware ke ESP32.

#### Arduino IDE
1. Buka src/main.ino.
2. Pilih board ESP32 dan port yang sesuai.
3. Klik Upload.

### Upload File Sistem (SPIFFS/Web UI)
1. Pastikan folder data/ berisi file web.
2. PlatformIO:
   Jalankan:
   ```
   pio run --target uploadfs
   ```
3. Arduino IDE:
   Install plugin "ESP32 Sketch Data Upload", lalu pilih menu Tools > ESP32 Sketch Data Upload.

### Troubleshooting Upload

| Error                        | Solusi                                    |
|------------------------------|--------------------------------------------|
| Serial port not found        | Cek kabel USB, driver, pilih port benar    |
| SPIFFS upload failed         | Pastikan board support & plugin terpasang  |
| Out of memory                | Kurangi jumlah LED, optimasi kode          |

## Deploy File Web UI

### Struktur /data
- index.html : Halaman utama kontrol
- app.js : Logika frontend
- style.css : Tampilan
- login.html : Halaman login/password
- manifest.json : Konfigurasi PWA
- service-worker.js : Offline support
- setup.html : Setup WiFi awal
- iro.min.js : Color picker
- icons/ : Ikon aplikasi

### Cara Upload
1. Kompres file jika perlu (opsional, untuk optimasi).
2. Upload ke ESP32 menggunakan langkah di atas (SPIFFS).

## Konfigurasi & Pengoperasian

### Setup Awal
1. Nyalakan ESP32, akan muncul WiFi AERI_LIGHT_SETUP.
2. Hubungkan smartphone ke WiFi tersebut.
3. Captive portal akan muncul otomatis.
4. Pilih WiFi rumah, masukkan password, klik simpan.
5. ESP32 restart dan terhubung ke WiFi rumah.

### Penggunaan Web UI
- Akses IP ESP32 dari browser.
- Menu Utama: Kontrol zona, warna, efek, preset.
- Mode Custom: Atur efek, warna, kecepatan, kecerahan.
- Setting: Ganti password, konfigurasi LED, reset.
- Informasi: Status firmware, WiFi, bantuan.

### Sinkronisasi Zona
- Alis, Shroud, Demon dapat diatur terpisah atau serempak.
- Gunakan menu target (kiri/kanan/keduanya) untuk sinkronisasi.

## API & Protokol

### REST Endpoint

| Metode | Path                | Deskripsi                |
|--------|---------------------|--------------------------|
| GET    | /get-state          | Ambil status lampu       |
| POST   | /set-config         | Set jumlah LED           |
| POST   | /set-mode-alis      | Set mode alis            |
| POST   | /set-mode-shroud    | Set mode shroud          |
| POST   | /set-mode-demon     | Set mode demon           |
| POST   | /set-mode-sein      | Set mode sein            |
| POST   | /set-mode-welcome   | Set animasi welcome      |
| POST   | /save-preset        | Simpan preset            |
| POST   | /load-preset        | Muat preset              |
| POST   | /preview-led-count  | Preview jumlah LED       |

### Contoh Request

curl:
```sh
curl -X POST http://<ip-esp32>/set-mode-alis -H "X-Auth-Password: <password>" -d "mode=2&r=255&g=0&b=0"
```

JavaScript fetch:
```js
fetch('/set-mode-alis', {
  method: 'POST',
  headers: { 'X-Auth-Password': 'password' },
  body: new URLSearchParams({ mode: 2, r: 255, g: 0, b: 0 })
});
```

## Pengembangan Lanjutan

### Struktur Kode Utama

- src/main.cpp atau src/main.ino:
  - Setup WiFi, SPIFFS, endpoint web
  - Loop utama: polling input, update animasi LED
  - Handler endpoint: parsing request, update konfigurasi

### Menambah Efek FastLED

1. Tambahkan case baru di fungsi animasi (misal: runAnimation).
2. Gunakan API FastLED, contoh:
   ```cpp
   case 8: // Efek baru
     fill_rainbow(leds, count, step, 10);
     break;
   ```
3. Update UI jika perlu.

### Panduan Kontribusi

1. Fork repositori.
2. Buat branch fitur/bugfix.
3. Commit perubahan dengan deskripsi jelas.
4. Pull request ke branch utama.

## Pemecahan Masalah (FAQ)

| Masalah                        | Solusi/Tips                                 |
|--------------------------------|---------------------------------------------|
| LED tidak menyala              | Cek wiring, catu daya, pinout, jumlah LED   |
| Tidak bisa upload firmware     | Cek port, driver, board, kabel USB          |
| Web UI tidak muncul            | Pastikan upload SPIFFS berhasil, refresh    |
| Efek tidak berubah             | Cek parameter API, restart ESP32            |
| Warna tidak sesuai             | Kalibrasi urutan warna (GRB/RGB) di kode    |

Checklist LED:
- Catu daya cukup & stabil
- Data line ada resistor 330Ω
- Ground ESP32 & LED terhubung
- Jumlah LED di firmware sesuai fisik

## Lisensi & Kredit

Proyek ini dilisensikan di bawah MIT License.

**Kontributor Utama:**
- Tim AERI LIGHT Medan
- [Daftar kontributor GitHub]

**Library Pihak Ketiga:**
- FastLED (https://fastled.io/)
- ESPAsyncWebServer (https://github.com/me-no-dev/ESPAsyncWebServer)
- ArduinoJson (https://arduinojson.org/)
- iro.js (https://iro.js.org/)

Catatan:
Selalu matikan catu daya sebelum mengubah wiring. Pastikan firmware dan file web selalu versi terbaru untuk stabilitas optimal.