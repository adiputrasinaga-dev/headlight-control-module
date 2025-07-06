/*
 * ===================================================================
 * AERI LIGHT - CONFIGURATION FILE (MODULAR & EXPANDED)
 * ===================================================================
 * Deskripsi:
 * File ini berfungsi sebagai pusat konfigurasi untuk semua mode efek
 * yang tersedia di aplikasi. Untuk menambah atau mengubah mode,
 * Anda hanya perlu mengedit file ini.
 *
 * v19.2: Menambahkan 10 mode efek utama dan 2 mode welcome baru.
 * ===================================================================
 */

const AppConfig = {
  debounceDelay: 250,
  systems: ["alis", "shroud", "demon"],

  effectModes: [
    { name: "Solid", value: 0, colorSlots: 1, hasSpeed: false },
    { name: "Breathing", value: 1, colorSlots: 1, hasSpeed: true },
    { name: "Rainbow", value: 2, colorSlots: 0, hasSpeed: true },
    { name: "Comet", value: 3, colorSlots: 1, hasSpeed: true },
    { name: "Cylon Scanner", value: 4, colorSlots: 1, hasSpeed: true },
    { name: "Twinkle", value: 5, colorSlots: 2, hasSpeed: true },
    { name: "Fire", value: 6, colorSlots: 0, hasSpeed: true },
    { name: "Gradient Shift", value: 7, colorSlots: 3, hasSpeed: true },
    { name: "Plasma Ball", value: 8, colorSlots: 2, hasSpeed: true },
    { name: "Theater Chase", value: 9, colorSlots: 1, hasSpeed: true },
    { name: "Color Wipe", value: 10, colorSlots: 2, hasSpeed: true },
    { name: "Pride", value: 11, colorSlots: 0, hasSpeed: true },
    { name: "Pacifica", value: 12, colorSlots: 0, hasSpeed: false },
    { name: "Bouncing Balls", value: 13, colorSlots: 3, hasSpeed: true },
    { name: "Meteor", value: 14, colorSlots: 1, hasSpeed: true },
    { name: "Confetti", value: 15, colorSlots: 0, hasSpeed: true },
    { name: "Juggle", value: 16, colorSlots: 0, hasSpeed: true },
    { name: "Sinelon", value: 17, colorSlots: 1, hasSpeed: true },
    { name: "Noise", value: 18, colorSlots: 0, hasSpeed: true },
    { name: "Matrix", value: 19, colorSlots: 0, hasSpeed: true },
    { name: "Ripple", value: 20, colorSlots: 1, hasSpeed: true },
    { name: "Larson Scanner", value: 21, colorSlots: 1, hasSpeed: true },
    { name: "Two-Color Wipe", value: 22, colorSlots: 2, hasSpeed: true },
    { name: "Lightning", value: 23, colorSlots: 0, hasSpeed: true },
  ],

  welcomeModes: [
    { name: "Power-On Scan", value: 0 },
    { name: "Ignition Burst", value: 1 },
    { name: "Spectrum Resolve", value: 2 },
    { name: "Theater Chase", value: 3 },
    { name: "Dual Comet", value: 4 },
    { name: "Center Fill", value: 5 },
    { name: "Charging", value: 6 },
    { name: "Glitch", value: 7 },
    { name: "Sonar", value: 8 },
    { name: "Burning", value: 9 },
    { name: "Warp Speed", value: 10 },
    { name: "DNA", value: 11 },
    { name: "Laser", value: 12 },
    { name: "Heartbeat", value: 13 },
    { name: "Liquid", value: 14 },
    { name: "Spotlights", value: 15 },
  ],

  seinModes: [
    { name: "Sequential", value: 0 },
    { name: "Pulsing Arrow", value: 1 },
    { name: "Fill & Flush", value: 2 },
    { name: "Comet Trail", value: 3 },
  ],
};
