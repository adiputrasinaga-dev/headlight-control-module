/*
 * ===================================================================
 * AERI LIGHT v18.0 - APP.JS (RELIABILITY & OFFLINE REVISION)
 * ===================================================================
 * Rilis Perbaikan oleh Fullstack & UI/UX Expert
 *
 * DESKRIPSI PERUBAHAN UTAMA:
 * 1.  [LOGIKA INTI] Penghapusan Mode Uji:
 * - Konsep "Mode Uji" (Demo Mode) telah dihapus sepenuhnya.
 * - Aplikasi kini hanya memiliki dua status: "Connected" dan "Disconnected".
 *
 * 2.  [LOGIKA INTI] Fungsionalitas Offline Penuh:
 * - Jika aplikasi gagal terhubung ke ESP32, ia akan masuk ke mode "Disconnected".
 * - Dalam mode ini, aplikasi tetap berfungsi penuh menggunakan data simulasi,
 * sehingga pengguna tetap bisa mencoba semua fitur.
 *
 * 3.  [LOGIKA INTI] Sinkronisasi Otomatis Saat Terhubung:
 * - Saat koneksi berhasil terjalin (atau pulih), aplikasi akan secara otomatis
 * mengambil state (semua pengaturan warna, mode, dll.) dari firmware.
 * - Tampilan akan langsung diperbarui untuk mencerminkan kondisi nyata perangkat.
 *
 * 4.  [FITUR] Upaya Koneksi Ulang Otomatis:
 * - Jika koneksi awal gagal, aplikasi akan secara otomatis mencoba
 * menyambung kembali ke perangkat setiap 5 detik di latar belakang.
 *
 * ===================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  const App = {
    // --- STATE & KONFIGURASI APLIKASI ---
    state: {
      isConnected: false, // Menggantikan isDemoMode
      isSyncEnabled: false,
      activeSystemForModal: null,
      activeColorSlot: 1,
      activeColorContext: "static",
      activeToastTimer: null,
      authPin: "",
      appState: {},
      isUnlocked: false,
      unlockTimer: null,
      reconnectInterval: null, // Untuk menyimpan interval koneksi ulang
    },
    config: {
      debounceDelay: 250,
      reconnectDelay: 5000, // Coba konek ulang setiap 5 detik
      systems: ["alis", "shroud", "demon"],
      modeOptions: {
        static: [{ name: "Static", value: 0, colorSlots: 1 }],
        dynamic: [
          { name: "Breathing", value: 1, colorSlots: 1 },
          { name: "Rainbow", value: 2, colorSlots: 0 },
          { name: "Comet", value: 3, colorSlots: 1 },
          { name: "Cylon Scanner", value: 4, colorSlots: 1 },
          { name: "Twinkle", value: 5, colorSlots: 2 },
          { name: "Fire", value: 6, colorSlots: 0 },
          { name: "Gradient Shift", value: 7, colorSlots: 3 },
        ],
        welcome: [
          { name: "Power-On Scan", value: 0 },
          { name: "Ignition Burst", value: 1 },
          { name: "Spectrum Resolve", value: 2 },
          { name: "Theater Chase", value: 3 },
        ],
        sein: [
          { name: "Sequential", value: 0 },
          { name: "Pulsing Arrow", value: 1 },
          { name: "Fill & Flush", value: 2 },
          { name: "Comet Trail", value: 3 },
        ],
      },
    },

    elements: {},
    modalColorPicker: null,

    // --- INISIALISASI ---
    init() {
      this.cacheInitialElements();
      this.modalColorPicker = new iro.ColorPicker(
        "#modalColorPickerContainer",
        {
          width: 280,
          color: "#ff0000",
          borderWidth: 1,
          borderColor: "var(--border-color)",
          layout: [{ component: iro.ui.Wheel }],
        }
      );
      this.generateControlTemplates();
      this.cacheDynamicElements();
      this.bindEvents();
      this.loadTheme();
      this.populateDropdowns();
      this.fetchInitialState(); // Memulai proses koneksi
    },

    // --- Logika Koneksi & State ---
    async fetchInitialState() {
      try {
        const response = await fetch("/get-state");
        if (!response.ok) throw new Error("Koneksi gagal");
        const data = await response.json();

        // Jika berhasil terhubung:
        this.stopReconnectListener(); // Hentikan upaya koneksi ulang jika ada
        this.state.isConnected = true;
        this.state.appState = data; // Gunakan state asli dari firmware
        this.elements.authPinInput.value = "";
        this.state.authPin = "";
        this.updateConnectionStatus(true);
        this.showToast("Terhubung ke Perangkat", "success");
        this.renderUI();
      } catch (error) {
        // Jika gagal terhubung:
        if (this.state.isConnected) {
          // Jika sebelumnya terhubung, tampilkan pesan
          this.showToast("Koneksi terputus. Beralih ke mode simulasi.", "info");
        }
        this.state.isConnected = false;
        this.updateConnectionStatus(false);

        // Hanya generate state dummy jika belum ada
        if (Object.keys(this.state.appState).length === 0) {
          this.state.appState = this.generateDummyState();
          this.showToast(
            "Gagal terhubung. Aplikasi berjalan dalam mode simulasi.",
            "info"
          );
        }

        this.renderUI();
        this.startReconnectListener(); // Mulai mencoba konek ulang
      }
    },

    startReconnectListener() {
      if (!this.state.reconnectInterval) {
        console.log("Memulai upaya koneksi ulang...");
        this.state.reconnectInterval = setInterval(
          () => this.fetchInitialState(),
          this.config.reconnectDelay
        );
      }
    },

    stopReconnectListener() {
      if (this.state.reconnectInterval) {
        console.log("Koneksi berhasil, menghentikan upaya koneksi ulang.");
        clearInterval(this.state.reconnectInterval);
        this.state.reconnectInterval = null;
      }
    },

    // --- API & DATA ---
    api: {
      post: async (endpoint, body) => {
        // Jika tidak terhubung, simulasikan sukses & jangan kirim apapun
        if (!App.state.isConnected) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("OK (Simulasi)"),
          });
        }

        if (!App.state.isUnlocked && !endpoint.includes("/update-auth")) {
          const pin = prompt("Masukkan PIN untuk melanjutkan:");
          if (!pin) {
            App.showToast("Aksi dibatalkan", "info");
            throw new Error("Aksi dibatalkan");
          }
          App.state.authPin = pin;
        }

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Auth-PIN": App.state.authPin,
            },
            body: new URLSearchParams(body).toString(),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let userMessage = errorText;

            switch (response.status) {
              case 401:
                userMessage = "PIN Salah atau Sesi Habis.";
                App.state.isUnlocked = false;
                break;
              case 400:
                userMessage = `Permintaan tidak valid: ${errorText}`;
                break;
              case 500:
                userMessage = "Terjadi error di sisi perangkat. Coba lagi.";
                break;
            }
            throw new Error(userMessage);
          }

          App.state.isUnlocked = true;
          clearTimeout(App.state.unlockTimer);
          App.state.unlockTimer = setTimeout(() => {
            App.state.isUnlocked = false;
            App.state.authPin = "";
            App.showToast("Sesi terkunci otomatis", "info");
          }, 300000);

          return response;
        } catch (error) {
          App.showToast(`Gagal: ${error.message}`, "error");
          App.fetchInitialState(); // Coba sinkronisasi ulang jika ada error
          throw error;
        }
      },
    },

    // --- UI & UX ---
    renderUI() {
      if (!this.state.appState || Object.keys(this.state.appState).length === 0)
        return;

      // Selalu aktifkan semua kontrol
      document.querySelectorAll("input, select, button").forEach((el) => {
        if (!el.closest(".modal-content") && !el.closest(".setup-body")) {
          el.disabled = false;
        }
      });

      this.config.systems.forEach((sys) => this.renderSystem(sys));
      this.renderSein();
      this.renderWelcomeSettings();
      this.renderLedCountSettings();
      this.renderActiveControl();
    },

    updateConnectionStatus(isConnected) {
      if (isConnected) {
        this.elements.statusIcon.className = "connected";
        this.elements.statusText.textContent = "Connected";
      } else {
        this.elements.statusIcon.className = "disconnected";
        this.elements.statusText.textContent = "Disconnected";
      }
    },

    // --- Bagian sisa dari kode (tidak ada perubahan signifikan dari versi sebelumnya) ---
    // ... (Salin sisa kode dari `cacheInitialElements` sampai akhir dari versi sebelumnya) ...
    // ... Pastikan Anda menyalin SEMUA fungsi yang tersisa termasuk:
    // cacheInitialElements, generateControlTemplates, getControlSetHTML, getSeinControlHTML,
    // cacheDynamicElements, bindEvents, bindControlEvents, bindSeinEvents,
    // renderSystem, renderSein, renderWelcomeSettings, renderLedCountSettings,
    // updateEffectTypeUI, updateDynamicColorPreviews, renderActiveControl, showToast,
    // toggleTheme, loadTheme, updateThemeMeta, saveNewAuthPin, util, handleTabClick,
    // openColorPicker, updateModalInputs, handleModalSlider, handleModalHexInput, handleModalRgbInput,
    // handleColorPickerSave, closeResetModal, handleResetConfirm, generateDummyState, populateDropdowns.
    cacheInitialElements() {
      this.elements = {
        toastContainer: document.getElementById("toast-container"),
        themeSwitcher: document.getElementById("theme-switcher"),
        themeColorMeta: document.getElementById("theme-color-meta"),
        statusIcon: document.getElementById("statusIcon"),
        statusText: document.getElementById("statusText"),
        hamburgerBtn: document.getElementById("hamburger-btn"),
        mobileMenu: document.getElementById("mobile-menu"),
        tabButtons: document.querySelectorAll(".tab-btn, .mobile-nav-link"),
        tabContents: document.querySelectorAll(".tab-content"),
        syncSwitch: document.getElementById("syncSwitch"),
        systemSelector: document.querySelectorAll(
          'input[name="controlTarget"]'
        ),
        authPinInput: document.getElementById("authPin"),
        btnSaveAuthPin: document.getElementById("btnSaveAuthPin"),
        resetModal: {
          backdrop: document.getElementById("reset-modal"),
          cancelBtn: document.getElementById("reset-cancel-btn"),
          confirmBtn: document.getElementById("reset-confirm-btn"),
          input: document.getElementById("reset-confirm-input"),
        },
        colorPickerModal: {
          backdrop: document.getElementById("color-picker-modal"),
          btnBatal: document.getElementById("btnModalBatal"),
          btnSimpan: document.getElementById("btnModalSimpan"),
          preview: document.getElementById("modalColorPreview"),
          brightnessSlider: document.getElementById("modalBrightnessSlider"),
          hexInput: document.getElementById("modalHexInput"),
          redInput: document.getElementById("modalRedInput"),
          greenInput: document.getElementById("modalGreenInput"),
          blueInput: document.getElementById("modalBlueInput"),
        },
      };
    },

    generateControlTemplates() {
      this.config.systems.forEach((sysKey) => {
        const container = document.getElementById(
          `${sysKey}-controls-container`
        );
        if (container) container.innerHTML = this.getControlSetHTML(sysKey);
      });
      const seinContainer = document.getElementById("sein-controls-container");
      if (seinContainer) seinContainer.innerHTML = this.getSeinControlHTML();
    },

    getControlSetHTML(sysKey) {
      const sysName = sysKey.charAt(0).toUpperCase() + sysKey.slice(1);
      const panelInfoHTML = `<div class="panel-info"><span id="${sysKey}LedCountInfo">--</span> LED</div>`;
      const svgLeft =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.25 4.75a.75.75 0 00-1.06 0L8.72 10.22a.75.75 0 000 1.06l5.47 5.47a.75.75 0 101.06-1.06L10.31 11l5.94-5.19a.75.75 0 000-1.06z"></path></svg>';
      const svgBoth =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 4.75a.75.75 0 00-1.06 0L2.22 10.22a.75.75 0 000 1.06l5.47 5.47a.75.75 0 101.06-1.06L3.31 11l5.94-5.19a.75.75 0 000-1.06zm6.5 0a.75.75 0 011.06 0l5.47 5.47a.75.75 0 010 1.06l-5.47 5.47a.75.75 0 11-1.06-1.06L20.69 11l-5.94-5.19a.75.75 0 010-1.06z"></path></svg>';
      const svgRight =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 4.75a.75.75 0 011.06 0l5.47 5.47a.75.75 0 010 1.06l-5.47 5.47a.75.75 0 11-1.06-1.06L13.69 11l-5.94-5.19a.75.75 0 010-1.06z"></path></svg>';
      return `
            <div id="${sysKey}-controls" class="control-set">
              ${panelInfoHTML}
              <div class="control-group">
                <label class="control-label">TARGET</label>
                <div class="segmented-control" data-target-group="${sysKey}">
                  <button class="sg-btn" data-value="kiri" title="Hanya Kiri">${svgLeft}</button>
                  <button class="sg-btn active" data-value="keduanya" title="Kiri & Kanan">${svgBoth}</button>
                  <button class="sg-btn" data-value="kanan" title="Hanya Kanan">${svgRight}</button>
                </div>
              </div>
              <div class="control-group">
                <label class="control-label">TIPE EFEK</label>
                <div class="radio-group" data-type-group="${sysKey}">
                    <input type="radio" id="${sysKey}EffectTypeStatic" name="${sysKey}EffectType" value="static" checked/><label for="${sysKey}EffectTypeStatic">Statis</label>
                    <input type="radio" id="${sysKey}EffectTypeDynamic" name="${sysKey}EffectType" value="dynamic"/><label for="${sysKey}EffectTypeDynamic">Dinamis</label>
                </div>
              </div>
              <div class="effect-details-wrapper">
                  <div class="static-color-section">
                      <div class="control-group">
                          <label>WARNA SOLID</label>
                          <div id="${sysKey}ColorPreviewStatic" class="color-preview-box" title="Klik untuk mengubah warna"><span id="${sysKey}ColorHexStatic" class="color-hex-value">#RRGGBB</span></div>
                      </div>
                  </div>
                  <div class="dynamic-controls">
                      <div class="dynamic-color-previews-container">
                          <div class="control-group" id="${sysKey}-dynamic-color-group-1" style="display: none;"><label>WARNA 1</label><div id="${sysKey}ColorPreviewDynamic1" class="color-preview-box" title="Klik untuk mengubah Warna 1"><span id="${sysKey}ColorHexDynamic1" class="color-hex-value">#RRGGBB</span></div></div>
                          <div class="control-group" id="${sysKey}-dynamic-color-group-2" style="display: none;"><label>WARNA 2</label><div id="${sysKey}ColorPreviewDynamic2" class="color-preview-box" title="Klik untuk mengubah Warna 2"><span id="${sysKey}ColorHexDynamic2" class="color-hex-value">#RRGGBB</span></div></div>
                          <div class="control-group" id="${sysKey}-dynamic-color-group-3" style="display: none;"><label>WARNA 3</label><div id="${sysKey}ColorPreviewDynamic3" class="color-preview-box" title="Klik untuk mengubah Warna 3"><span id="${sysKey}ColorHexDynamic3" class="color-hex-value">#RRGGBB</span></div></div>
                      </div>
                      <div class="control-group"><label>MODE EFEK</label><select id="${sysKey}Mode" class="cyber-input" disabled></select></div>
                      <div class="control-group speed-group"><div class="slider-label-container"><label>SPEED</label><span id="${sysKey}SpeedValue">--%</span></div><input type="range" id="${sysKey}Speed" class="local-slider" min="0" max="100" value="50" disabled /></div>
                  </div>
              </div>
              <div class="control-group"><div class="slider-label-container"><label>BRIGHTNESS</label><span id="${sysKey}BrightnessValue">--%</span></div><input type="range" id="${sysKey}Brightness" class="local-slider" min="0" max="100" value="80" disabled /></div>
            </div>`;
    },

    getSeinControlHTML() {
      return `
        <div id="sein-controls" class="control-set">
            <div class="static-color-section" style="display: block;">
                <div class="control-group"><label>WARNA SOLID</label><div id="seinColorPreview" class="color-preview-box" title="Klik untuk mengubah warna"><span id="seinColorHex" class="color-hex-value">#RRGGBB</span></div></div>
            </div>
            <div class="control-group"><label>PILIH EFEK SEIN</label><select id="seinModeSettings" class="cyber-input" disabled></select></div>
            <div class="control-group"><div class="slider-label-container"><label>SPEED</label><span id="seinSpeedValue">--%</span></div><input type="range" id="seinSpeed" class="local-slider" min="0" max="100" value="50" disabled /></div>
        </div>`;
    },

    cacheDynamicElements() {
      const allSystems = [...this.config.systems, "sein"];
      allSystems.forEach((sys) => {
        this.elements[sys] = {};
        const controlSet = document.getElementById(`${sys}-controls`);
        if (!controlSet) return;
        controlSet.querySelectorAll("[id]").forEach((el) => {
          const key =
            el.id.replace(sys, "").charAt(0).toLowerCase() +
            el.id.replace(sys, "").slice(1);
          this.elements[sys][key] = el;
        });
      });
    },

    bindEvents() {
      this.elements.themeSwitcher.addEventListener("change", () =>
        this.toggleTheme()
      );
      this.elements.authPinInput.addEventListener(
        "input",
        (e) => (this.state.authPin = e.target.value)
      );
      this.elements.btnSaveAuthPin.addEventListener("click", () =>
        this.saveNewAuthPin()
      );

      this.elements.syncSwitch.addEventListener("change", (e) => {
        this.state.isSyncEnabled = e.target.checked;
        const syncClass = "synced-panel";
        const panels = document.querySelectorAll(
          "#alis-controls, #shroud-controls, #demon-controls"
        );
        if (this.state.isSyncEnabled) {
          panels.forEach((p) => p.classList.add(syncClass));
          this.showToast("Sinkronisasi Aktif", "info");
        } else {
          panels.forEach((p) => p.classList.remove(syncClass));
        }
      });

      this.elements.systemSelector.forEach((radio) =>
        radio.addEventListener("change", () => this.renderActiveControl())
      );
      this.elements.tabButtons.forEach((btn) =>
        btn.addEventListener("click", (e) => this.handleTabClick(e))
      );
      this.elements.hamburgerBtn.addEventListener("click", () =>
        this.elements.mobileMenu.classList.toggle("open")
      );

      this.elements.colorPickerModal.btnBatal.addEventListener(
        "click",
        () => (this.elements.colorPickerModal.backdrop.style.display = "none")
      );
      this.elements.colorPickerModal.btnSimpan.addEventListener("click", () =>
        this.handleColorPickerSave()
      );
      this.elements.resetModal.cancelBtn.addEventListener("click", () =>
        this.closeResetModal()
      );
      this.elements.resetModal.input.addEventListener(
        "input",
        (e) =>
          (this.elements.resetModal.confirmBtn.disabled =
            e.target.value !== "RESET")
      );
      this.elements.resetModal.confirmBtn.addEventListener("click", () =>
        this.handleResetConfirm()
      );

      this.config.systems.forEach((sys) => this.bindControlEvents(sys));
      this.bindSeinEvents();

      const presetSlotSelect = document.getElementById("presetSlot");
      const presetPreviewContainer = document.getElementById("preset-preview");
      presetSlotSelect.addEventListener("change", async (e) => {
        const slot = e.target.value;
        if (!slot) {
          presetPreviewContainer.innerHTML =
            "<p>Pilih slot untuk melihat pratinjau...</p>";
          return;
        }
        presetPreviewContainer.innerHTML = "<p>Memuat pratinjau...</p>";
        try {
          const response = await fetch(`/get-preset-details?slot=${slot}`);
          if (!response.ok) throw new Error("Preset kosong atau gagal dimuat");
          const presetData = await response.json();
          presetPreviewContainer.innerHTML = `<h4>Pratinjau: "${
            presetData.name || `Preset ${slot}`
          }"</h4><p>${presetData.summary || "Tidak ada ringkasan."}</p>`;
        } catch (error) {
          presetPreviewContainer.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
      });
    },

    bindControlEvents(sys) {
      const instantUpdate = (payload) => {
        const updateAndRender = (targetSystem, data) => {
          Object.assign(this.state.appState[targetSystem], data);
          if (data.mode !== undefined) {
            this.state.appState[targetSystem].stateKiri.modeEfek = data.mode;
          }
          this.renderSystem(targetSystem);
        };

        if (this.state.isSyncEnabled && this.config.systems.includes(sys)) {
          this.config.systems.forEach((targetSys) =>
            updateAndRender(targetSys, payload)
          );
          this.showToast("Pengaturan disinkronkan", "info");
        } else {
          updateAndRender(sys, payload);
        }

        if (this.state.isSyncEnabled && this.config.systems.includes(sys)) {
          const updatePromises = this.config.systems.map((targetSys) =>
            this.api.post(`/set-mode-${targetSys}`, payload)
          );
          Promise.all(updatePromises).catch((err) => {
            console.error("Sync failed", err);
          });
        } else {
          this.api.post(`/set-mode-${sys}`, payload).catch((err) => {
            console.error("Update failed", err);
          });
        }
      };

      const debouncedUpdate = this.util.debounce(
        instantUpdate,
        this.config.debounceDelay
      );
      const elements = this.elements[sys];
      if (!elements || Object.keys(elements).length === 0) return;

      const targetButtons = document.querySelectorAll(
        `[data-target-group="${sys}"] .sg-btn`
      );
      targetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const newTarget = button.dataset.value;
          instantUpdate({ target: newTarget });
        });
      });

      document
        .querySelectorAll(`input[name="${sys}EffectType"]`)
        .forEach((radio) => {
          radio.addEventListener("change", (e) => {
            this.updateEffectTypeUI(sys);
            if (e.target.value === "static") {
              instantUpdate({ mode: 0 });
            }
          });
        });

      elements.mode.addEventListener("change", (e) => {
        this.updateDynamicColorPreviews(sys, e.target.value);
        instantUpdate({ mode: parseInt(e.target.value, 10) });
      });

      elements.brightness.addEventListener("input", () => {
        elements.brightnessValue.textContent = `${elements.brightness.value}%`;
        debouncedUpdate({
          brightness: parseInt(elements.brightness.value, 10),
        });
      });

      elements.speed.addEventListener("input", () => {
        elements.speedValue.textContent = `${elements.speed.value}%`;
        debouncedUpdate({ speed: parseInt(elements.speed.value, 10) });
      });

      elements.colorPreviewStatic.addEventListener("click", () =>
        this.openColorPicker(sys, 1, "static")
      );
      for (let i = 1; i <= 3; i++) {
        const preview = document.getElementById(
          `${sys}ColorPreviewDynamic${i}`
        );
        if (preview)
          preview.addEventListener("click", () =>
            this.openColorPicker(sys, i, "dynamic")
          );
      }
    },

    bindSeinEvents() {
      const seinElements = this.elements.sein;
      if (!seinElements || !seinElements.controls) return;
      const debouncedUpdate = this.util.debounce(
        (payload) =>
          this.api
            .post(`/set-mode-sein`, payload)
            .catch((err) => console.error("Sein update failed", err)),
        this.config.debounceDelay
      );
      seinElements.modeSettings.addEventListener("change", () =>
        debouncedUpdate({ mode: seinElements.modeSettings.value })
      );
      seinElements.speed.addEventListener("input", () => {
        seinElements.speedValue.textContent = `${seinElements.speed.value}%`;
        debouncedUpdate({ speed: seinElements.speed.value });
      });
      seinElements.colorPreview.addEventListener("click", () =>
        this.openColorPicker("sein", 1, "static")
      );
    },

    renderSystem(sys) {
      const config = this.state.appState[sys];
      const elements = this.elements[sys];
      if (!config || !elements || Object.keys(elements).length === 0) return;

      const currentTarget = config.target || "keduanya";
      const targetButtons = document.querySelectorAll(
        `[data-target-group="${sys}"] .sg-btn`
      );
      targetButtons.forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.value === currentTarget
        );
      });

      const ledCountInfo = document.getElementById(`${sys}LedCountInfo`);
      if (ledCountInfo) ledCountInfo.textContent = config.ledCount;

      elements.brightness.value = config.brightness;
      elements.brightnessValue.textContent = `${config.brightness}%`;
      elements.speed.value = config.speed;
      elements.speedValue.textContent = `${config.speed}%`;

      const isStatic = config.stateKiri.modeEfek === 0;
      const staticRadio = document.getElementById(`${sys}EffectTypeStatic`);
      const dynamicRadio = document.getElementById(`${sys}EffectTypeDynamic`);
      if (staticRadio) staticRadio.checked = isStatic;
      if (dynamicRadio) dynamicRadio.checked = !isStatic;
      this.updateEffectTypeUI(sys);

      elements.mode.value = config.stateKiri.modeEfek;
      const staticColor = config.stateKiri.warna;
      const staticHex = this.util.rgbToHex(
        staticColor[0],
        staticColor[1],
        staticColor[2]
      );
      elements.colorPreviewStatic.style.backgroundColor = staticHex;
      elements.colorHexStatic.textContent = staticHex;

      this.updateDynamicColorPreviews(sys, config.stateKiri.modeEfek);
    },

    renderSein() {
      const seinConfig = this.state.appState.sein;
      const seinElements = this.elements.sein;
      if (!seinConfig || !seinElements || !seinElements.controls) return;
      seinElements.modeSettings.value = seinConfig.mode;
      seinElements.speed.value = seinConfig.speed;
      seinElements.speedValue.textContent = `${seinConfig.speed}%`;
      const color = seinConfig.warna;
      const hex = this.util.rgbToHex(color[0], color[1], color[2]);
      seinElements.colorPreview.style.backgroundColor = hex;
      seinElements.colorHex.textContent = hex;
    },

    renderWelcomeSettings() {
      const welcomeConfig = this.state.appState.global;
      const welcomeModeSelect = document.getElementById("welcomeMode");
      const welcomeDurationInput = document.getElementById("welcomeDuration");
      if (welcomeConfig && welcomeModeSelect && welcomeDurationInput) {
        welcomeModeSelect.value = welcomeConfig.modeWelcome;
        welcomeDurationInput.value = welcomeConfig.durasiWelcome;
      }
    },

    renderLedCountSettings() {
      const ledTarget = document.querySelector(
        'input[name="ledTarget"]:checked'
      )?.value;
      const ledCountInput = document.getElementById("ledCount");
      if (ledTarget && ledCountInput && this.state.appState[ledTarget]) {
        ledCountInput.value = this.state.appState[ledTarget].ledCount;
      }
    },

    updateEffectTypeUI(sys) {
      const controlSet = document.getElementById(`${sys}-controls`);
      if (!controlSet) return;
      const isStatic =
        document.querySelector(`input[name="${sys}EffectType"]:checked`)
          .value === "static";
      controlSet.querySelector(".static-color-section").style.display = isStatic
        ? "block"
        : "none";
      controlSet.querySelector(".dynamic-controls").style.display = isStatic
        ? "none"
        : "flex";
    },

    updateDynamicColorPreviews(sys, modeValue) {
      const mode = this.config.modeOptions.dynamic.find(
        (m) => m.value == modeValue
      );
      if (!mode) return;
      for (let i = 1; i <= 3; i++) {
        const group = document.getElementById(
          `${sys}-dynamic-color-group-${i}`
        );
        if (!group) continue;
        const isVisible = i <= mode.colorSlots;
        group.style.display = isVisible ? "block" : "none";
        if (isVisible) {
          const previewBox = document.getElementById(
            `${sys}ColorPreviewDynamic${i}`
          );
          const hexSpan = document.getElementById(`${sys}ColorHexDynamic${i}`);
          const colorKey = i === 1 ? "warna" : `warna${i}`;
          const color = this.state.appState[sys].stateKiri[colorKey] || [
            0, 0, 0,
          ];
          const hex = this.util.rgbToHex(color[0], color[1], color[2]);
          previewBox.style.backgroundColor = hex;
          hexSpan.textContent = hex;
        }
      }
    },

    renderActiveControl() {
      const activeControl = document.querySelector(
        'input[name="controlTarget"]:checked'
      ).value;
      this.config.systems.forEach((sys) => {
        const container = document.getElementById(`${sys}-controls`);
        if (container)
          container.style.display = sys === activeControl ? "flex" : "none";
      });
      const seinContainer = document.getElementById("sein-controls");
      if (seinContainer)
        seinContainer.style.display =
          activeControl === "sein" ? "flex" : "none";
    },

    showToast(message, type = "success") {
      const container = this.elements.toastContainer;
      if (container.querySelector(".toast")) {
        return;
      }

      if (this.state.activeToastTimer)
        clearTimeout(this.state.activeToastTimer);
      let toastElement = document.createElement("div");
      toastElement.className = `toast ${type}`;
      toastElement.textContent = message;
      toastElement.style.animation = "slideInFadeOut 4s ease-in-out forwards";
      if (type === "error") toastElement.style.animation += ", shake 0.5s ease";
      container.appendChild(toastElement);

      this.state.activeToastTimer = setTimeout(() => {
        if (toastElement && toastElement.parentElement) toastElement.remove();
        this.state.activeToastTimer = null;
      }, 4000);
    },

    toggleTheme() {
      const newTheme = this.elements.themeSwitcher.checked ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("aeriTheme", newTheme);
      this.updateThemeMeta();
    },

    loadTheme() {
      const savedTheme = localStorage.getItem("aeriTheme") || "dark";
      document.documentElement.setAttribute("data-theme", savedTheme);
      this.elements.themeSwitcher.checked = savedTheme === "light";
      this.updateThemeMeta();
    },

    updateThemeMeta() {
      setTimeout(() => {
        const themeColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary-accent")
          .trim();
        this.elements.themeColorMeta.setAttribute("content", themeColor);
      }, 50);
    },

    saveNewAuthPin() {
      const currentPin =
        this.state.authPin ||
        prompt("Untuk keamanan, masukkan PIN Anda saat ini (jika ada):", "");
      if (currentPin === null) return;
      const newPin = prompt("Masukkan PIN baru (6 digit angka):", "");
      if (!newPin || !/^\d{6}$/.test(newPin)) {
        this.showToast("PIN baru tidak valid. Harus 6 digit angka.", "error");
        return;
      }
      this.api.post("/update-auth", { currentPin, newPin }).then(() => {
        this.state.authPin = newPin;
        this.elements.authPinInput.value = "";
        this.showToast("PIN berhasil diperbarui.", "success");
      });
    },

    util: {
      debounce(func, delay) {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), delay);
        };
      },
      rgbToHex(r, g, b) {
        return (
          "#" +
          ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()
        );
      },
    },

    handleTabClick(e) {
      const tabId = e.currentTarget.dataset.tab;
      this.elements.tabContents.forEach((c) => c.classList.remove("active"));
      this.elements.tabButtons.forEach((b) => b.classList.remove("active"));
      document.getElementById(`tab${tabId}`).classList.add("active");
      e.currentTarget.classList.add("active");
      this.elements.mobileMenu.classList.remove("open");
    },

    openColorPicker(sys, slot, context) {
      this.state.activeSystemForModal = sys;
      this.state.activeColorSlot = slot;
      this.state.activeColorContext = context;

      let currentColor = { h: 0, s: 100, v: 100 };
      const systemState = this.state.appState[sys];
      let currentBrightness = 100;

      if (systemState) {
        const stateSource = systemState.stateKiri;
        currentBrightness = systemState.brightness;
        let colorArray;
        if (sys === "sein") {
          this.state.activeColorContext = "static";
          colorArray = systemState.warna;
        } else if (context === "static") {
          colorArray = stateSource.warna;
        } else {
          // dynamic
          const colorKey = slot === 1 ? "warna" : `warna${slot}`;
          colorArray = stateSource[colorKey] || [255, 0, 0];
        }
        currentColor = iro.Color.rgbToHsv({
          r: colorArray[0],
          g: colorArray[1],
          b: colorArray[2],
        });
      }

      this.modalColorPicker.color.set({
        h: currentColor.h,
        s: currentColor.s,
        v: currentBrightness,
      });

      this.updateModalInputs(this.modalColorPicker.color);

      this.modalColorPicker.off("color:change");
      this.elements.colorPickerModal.brightnessSlider.removeEventListener(
        "input",
        this.handleModalSlider
      );
      this.elements.colorPickerModal.hexInput.removeEventListener(
        "change",
        this.handleModalHexInput
      );
      this.elements.colorPickerModal.redInput.removeEventListener(
        "change",
        this.handleModalRgbInput
      );
      this.elements.colorPickerModal.greenInput.removeEventListener(
        "change",
        this.handleModalRgbInput
      );
      this.elements.colorPickerModal.blueInput.removeEventListener(
        "change",
        this.handleModalRgbInput
      );

      this.modalColorPicker.on(
        "color:change",
        this.updateModalInputs.bind(this)
      );

      this.handleModalSlider = this.handleModalSlider.bind(this);
      this.handleModalHexInput = this.handleModalHexInput.bind(this);
      this.handleModalRgbInput = this.handleModalRgbInput.bind(this);

      this.elements.colorPickerModal.brightnessSlider.addEventListener(
        "input",
        this.handleModalSlider
      );
      this.elements.colorPickerModal.hexInput.addEventListener(
        "change",
        this.handleModalHexInput
      );
      this.elements.colorPickerModal.redInput.addEventListener(
        "change",
        this.handleModalRgbInput
      );
      this.elements.colorPickerModal.greenInput.addEventListener(
        "change",
        this.handleModalRgbInput
      );
      this.elements.colorPickerModal.blueInput.addEventListener(
        "change",
        this.handleModalRgbInput
      );

      this.elements.colorPickerModal.backdrop.style.display = "flex";
    },

    updateModalInputs(color) {
      if (!color) return;
      const {
        preview,
        hexInput,
        redInput,
        greenInput,
        blueInput,
        brightnessSlider,
      } = this.elements.colorPickerModal;
      preview.style.backgroundColor = color.hexString;
      hexInput.value = color.hexString.toUpperCase();
      redInput.value = color.rgb.r;
      greenInput.value = color.rgb.g;
      blueInput.value = color.rgb.b;
      brightnessSlider.value = color.hsv.v;
    },

    handleModalSlider(e) {
      const hsv = this.modalColorPicker.color.hsv;
      this.modalColorPicker.color.set({
        h: hsv.h,
        s: hsv.s,
        v: parseInt(e.target.value, 10),
      });
    },

    handleModalHexInput(e) {
      const hex = e.target.value;
      if (/^#?[0-9A-F]{6}$/i.test(hex)) {
        this.modalColorPicker.color.hexString = hex;
      }
    },

    handleModalRgbInput() {
      const { redInput, greenInput, blueInput } =
        this.elements.colorPickerModal;
      this.modalColorPicker.color.rgb = {
        r: parseInt(redInput.value, 10),
        g: parseInt(greenInput.value, 10),
        b: parseInt(blueInput.value, 10),
      };
    },

    handleColorPickerSave() {
      const { activeSystemForModal, activeColorSlot, activeColorContext } =
        this.state;
      if (!activeSystemForModal) return;

      const newColor = this.modalColorPicker.color.rgb;
      const newBrightness = this.modalColorPicker.color.hsv.v;
      const newColorArray = [newColor.r, newColor.g, newColor.b];
      let payload = {};

      const updateLocalState = (system, data) => {
        const stateToUpdate = this.state.appState[system].stateKiri;
        this.state.appState[system].brightness = data.brightness;
        if (data.context === "static") {
          stateToUpdate.warna = newColorArray;
          stateToUpdate.modeEfek = 0;
        } else {
          const key = `warna${data.slot > 1 ? data.slot : ""}`;
          stateToUpdate[key] = newColorArray;
        }
        this.renderSystem(system);
      };

      const systemToUpdate = {
        context: activeColorContext,
        slot: activeColorSlot,
        brightness: newBrightness,
      };

      if (activeSystemForModal === "sein") {
        payload = { r: newColor.r, g: newColor.g, b: newColor.b };
      } else {
        payload.brightness = newBrightness;
        if (activeColorContext === "static") {
          payload = {
            ...payload,
            mode: 0,
            r: newColor.r,
            g: newColor.g,
            b: newColor.b,
          };
        } else {
          const suffix = activeColorSlot > 1 ? activeColorSlot : "";
          payload[`r${suffix}`] = newColor.r;
          payload[`g${suffix}`] = newColor.g;
          payload[`b${suffix}`] = newColor.b;
        }
      }

      if (
        this.state.isSyncEnabled &&
        this.config.systems.includes(activeSystemForModal)
      ) {
        this.config.systems.forEach((targetSys) =>
          updateLocalState(targetSys, systemToUpdate)
        );
      } else {
        updateLocalState(activeSystemForModal, systemToUpdate);
      }

      if (
        this.state.isSyncEnabled &&
        this.config.systems.includes(activeSystemForModal)
      ) {
        const syncPromises = this.config.systems.map((targetSys) =>
          this.api.post(`/set-mode-${targetSys}`, payload)
        );
        Promise.all(syncPromises).then(() => {
          this.showToast("Warna & Kecerahan disinkronkan", "success");
        });
      } else {
        this.api.post(`/set-mode-${activeSystemForModal}`, payload).then(() => {
          this.showToast(
            `${activeSystemForModal.toUpperCase()} warna & kecerahan diperbarui`,
            "success"
          );
        });
      }
      this.elements.colorPickerModal.backdrop.style.display = "none";
    },

    closeResetModal() {
      this.elements.resetModal.backdrop.style.display = "none";
      this.elements.resetModal.input.value = "";
      this.elements.resetModal.confirmBtn.disabled = true;
    },

    handleResetConfirm() {
      this.api.post("/reset-to-default").then(() => {
        this.showToast(
          "Perangkat berhasil direset. Halaman akan dimuat ulang.",
          "success"
        );
        setTimeout(() => window.location.reload(), 4000);
      });
    },

    generateDummyState() {
      const defaultLightState = {
        stateKiri: {
          warna: [230, 0, 35],
          warna2: [0, 246, 255],
          warna3: [0, 255, 0],
          modeEfek: 1,
        },
        stateKanan: {
          warna: [230, 0, 35],
          warna2: [0, 246, 255],
          warna3: [0, 255, 0],
          modeEfek: 1,
        },
        ledCount: 50,
        brightness: 85,
        speed: 60,
        target: "keduanya",
      };
      return {
        alis: { ...defaultLightState },
        shroud: {
          ...defaultLightState,
          ledCount: 40,
          stateKiri: {
            warna: [191, 193, 194],
            warna2: [230, 0, 35],
            warna3: [0, 255, 0],
            modeEfek: 5,
          },
        },
        demon: {
          ...defaultLightState,
          ledCount: 1,
          stateKiri: {
            warna: [230, 0, 35],
            warna2: [0, 0, 0],
            warna3: [0, 0, 0],
            modeEfek: 0,
          },
        },
        sein: { ledCount: 50, mode: 0, warna: [255, 100, 0], speed: 50 },
        global: { modeWelcome: 2, durasiWelcome: 5 },
      };
    },

    populateDropdowns() {
      const createOptions = (opts) =>
        opts
          .map((opt) => `<option value="${opt.value}">${opt.name}</option>`)
          .join("");
      this.config.systems.forEach((sys) => {
        const modeSelect = document.getElementById(`${sys}Mode`);
        if (modeSelect)
          modeSelect.innerHTML = createOptions(this.config.modeOptions.dynamic);
      });
      const welcomeSelect = document.getElementById("welcomeMode");
      if (welcomeSelect)
        welcomeSelect.innerHTML = createOptions(
          this.config.modeOptions.welcome
        );
      const seinSelect = document.getElementById("seinModeSettings");
      if (seinSelect)
        seinSelect.innerHTML = createOptions(this.config.modeOptions.sein);
    },
  };

  App.init();
});
