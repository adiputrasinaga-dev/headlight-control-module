# **AERI LIGHT - Custom Headlight Control Module**

Sebuah sistem kontrol lampu kendaraan (alis, shroud, demon eye) berbasis ESP32 yang dikontrol sepenuhnya melalui Progressive Web App (PWA) dari smartphone Anda.

---

## **✨ Fitur Utama**

- **Mode Access Point**: Perangkat membuat jaringan WiFi sendiri untuk kontrol langsung tanpa perlu router.
- **Kontrol Multi-Zona**: Pengaturan terpisah untuk Alis, Shroud, dan Demon Eye.
- **Efek Dinamis**: Berbagai macam mode lampu seperti Breathing, Rainbow, Comet, dll.
- **Integrasi Lampu Sein**: Lampu alis otomatis berubah menjadi lampu sein berjalan.
- **Animasi Selamat Datang**: Efek animasi keren saat pertama kali dinyalakan.
- **Kustomisasi Penuh**: Atur warna, kecerahan, dan kecepatan animasi.
- **Manajemen Preset**: Simpan dan muat 5 konfigurasi lampu favorit Anda.
- **Progressive Web App (PWA)**: Antarmuka kontrol yang cepat, responsif, dan bisa di-install di homescreen.

---

## **🛠️ Teknologi yang Digunakan**

- **Perangkat Keras**: ESP32, WS2812B
- **Firmware**: C++ (Arduino/PlatformIO), FastLED, ESPAsyncWebServer, ArduinoJson
- **Aplikasi Web**: HTML5, CSS3, JavaScript (Vanilla JS), iro.js

---

## **🚀 Instalasi & Setup**

### **1. Unggah Filesystem dan Firmware**

1.  **Unggah Filesystem**: Unggah seluruh isi folder `data/` ke memori SPIFFS ESP32.
    - **PlatformIO**: Jalankan task `Upload File System image`.
    - **Arduino IDE**: Gunakan plugin "ESP32 Sketch Data Upload".
2.  **Unggah Firmware**: Kompilasi dan unggah file `main.cpp` ke board ESP32 Anda.

### **2. Akses Aplikasi**

1.  Nyalakan perangkat AERI LIGHT.
2.  Buka pengaturan WiFi di ponsel atau laptop Anda.
3.  Hubungkan ke jaringan WiFi bernama **"AERI_LIGHT"**. Gunakan kata sandi: **`12345678`**.
4.  Setelah terhubung, buka browser dan akses alamat IP: **`192.168.4.1`**.
5.  Antarmuka kontrol akan muncul dan siap digunakan.
6.  (Opsional) Gunakan fitur "Add to Home Screen" di browser Anda untuk memasang PWA agar lebih mudah diakses di kemudian hari.
