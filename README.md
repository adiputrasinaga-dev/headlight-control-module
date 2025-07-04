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
2. Pastikan pin GPIO di dalam file .cpp sudah sesuai dengan rangkaian perangkat keras Anda.  
3. **Penting**: Unggah file sistem (SPIFFS) terlebih dahulu. Ini akan mengunggah seluruh isi folder data/ ke memori ESP32.  
   * Di PlatformIO: Jalankan task Upload File System image.  
   * Di Arduino IDE: Gunakan plugin "ESP32 Sketch Data Upload".  
4. Unggah kode utama (.cpp) ke board ESP32 Anda.

### **Setup Awal Pengguna**

1. Nyalakan perangkat. ESP32 akan membuat WiFi Access Point dengan SSID **"AERI\_LIGHT\_SETUP"**.  
2. Hubungkan smartphone Anda ke jaringan tersebut. Sebuah halaman login (captive portal) akan muncul secara otomatis.  
3. Pindai dan pilih jaringan WiFi rumah Anda, masukkan password, lalu simpan.  
4. Perangkat akan restart dan terhubung ke WiFi Anda. Buka browser dan akses alamat IP perangkat untuk mulai mengontrol lampu.

---

## **📁 Struktur Folder**

.  
├── data/                  \# Berisi semua file untuk Aplikasi Web (PWA)  
│   ├── icons/             \# Koleksi ikon untuk PWA (add to homescreen, dll.)  
│   ├── app.js             \# Logika utama JavaScript untuk frontend  
│   ├── index.html         \# Halaman antarmuka kontrol utama  
│   ├── iro.min.js         \# Library JavaScript untuk color picker  
│   ├── manifest.json      \# File konfigurasi standar PWA  
│   ├── service-worker.js  \# Script yang memungkinkan fungsionalitas offline  
│   ├── setup.html         \# Halaman untuk setup WiFi awal (Captive Portal)  
│   └── style.css          \# File styling untuk semua halaman web  
│  
├── alisbelangcostum-sv.cpp  \# Kode sumber utama firmware untuk ESP32  
└── README.md              \# File dokumentasi yang sedang Anda baca

---

## **📄 Lisensi**

Proyek ini dilisensikan di bawah \[Isi dengan Lisensi Anda, misal: MIT License\].

---

## **🙌 Kontribusi**

Kontribusi, isu, dan permintaan fitur sangat diterima. Jangan ragu untuk membuat *pull request* atau membuka *issue* baru.