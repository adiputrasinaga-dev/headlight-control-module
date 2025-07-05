/*
 * ===================================================================
 * AERI LIGHT v17.2 - APP.JS FINAL (LENGKAP DAN UTUH)
 * ===================================================================
 * Deskripsi Perubahan:
 * 1.  Implementasi Penuh: Semua fungsi, termasuk yang sebelumnya kosong, kini telah
 * diisi dengan logika yang benar dan fungsional.
 * 2.  Inisialisasi iro.js: Color picker diinisialisasi dengan benar.
 * 3.  Refactor: Logika utilitas (debounce, rgbToHex) dipindahkan ke dalam
 * sub-objek `App.util` untuk kerapian.
 * 4.  Stabilitas: Menambahkan pemeriksaan null-safety untuk elemen dinamis
 * untuk mencegah error.
 * ===================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  const App = {
    // --- STATE & KONFIGURASI APLIKASI ---
    state: {
      isSyncEnabled: false,
      isDemoMode: false,
      activeSystemForModal: null,
      activeColorSlot: 1,
      activeToastTimer: null,
      authPin: "",
      appState: {},
    },
    config: {
      debounceDelay: 200, // Penundaan dalam ms untuk mengirim data slider
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

    elements: {}, // Cache untuk elemen DOM
    modalColorPicker: null, // Placeholder untuk iro.js

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
      this.loadPin();
      this.populateDropdowns();
      this.fetchInitialState();
    },

    // --- PENGATURAN AWAL & PEMBUATAN UI ---
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
      const svgLeft =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.25 4.75a.75.75 0 00-1.06 0L8.72 10.22a.75.75 0 000 1.06l5.47 5.47a.75.75 0 101.06-1.06L10.31 11l5.94-5.19a.75.75 0 000-1.06z"></path></svg>';
      const svgBoth =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 4.75a.75.75 0 00-1.06 0L2.22 10.22a.75.75 0 000 1.06l5.47 5.47a.75.75 0 101.06-1.06L3.31 11l5.94-5.19a.75.75 0 000-1.06zm6.5 0a.75.75 0 011.06 0l5.47 5.47a.75.75 0 010 1.06l-5.47 5.47a.75.75 0 11-1.06-1.06L20.69 11l-5.94-5.19a.75.75 0 010-1.06z"></path></svg>';
      const svgRight =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 4.75a.75.75 0 011.06 0l5.47 5.47a.75.75 0 010 1.06l-5.47 5.47a.75.75 0 11-1.06-1.06L13.69 11l-5.94-5.19a.75.75 0 010-1.06z"></path></svg>';
      return `
        <div id="${sysKey}-controls" class="control-set">
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
      // Event listener statis
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
      this.elements.syncSwitch.addEventListener(
        "change",
        (e) => (this.state.isSyncEnabled = e.target.checked)
      );
      this.elements.systemSelector.forEach((radio) =>
        radio.addEventListener("change", () => this.renderActiveControl())
      );
      this.elements.tabButtons.forEach((btn) =>
        btn.addEventListener("click", (e) => this.handleTabClick(e))
      );
      this.elements.hamburgerBtn.addEventListener("click", () =>
        this.elements.mobileMenu.classList.toggle("open")
      );

      // Event listener modals
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

      // Event listener untuk elemen dinamis
      this.config.systems.forEach((sys) => this.bindControlEvents(sys));
      this.bindSeinEvents();
    },

    bindControlEvents(sys) {
      const debouncedUpdate = this.util.debounce((payload) => {
        // Cek jika sinkronisasi aktif dan sistem ini adalah bagian dari yang bisa disinkronkan
        if (this.state.isSyncEnabled && this.config.systems.includes(sys)) {
          // Kirim pembaruan ke semua sistem yang bisa disinkronkan
          this.config.systems.forEach((targetSys) => {
            this.api.post(`/set-mode-${targetSys}`, payload);
          });
          this.showToast(
            "Pengaturan disinkronkan ke Alis, Shroud, & Demon",
            "info"
          );
          // Muat ulang state setelah beberapa saat untuk memastikan UI terupdate
          setTimeout(() => this.fetchInitialState(), 500);
        } else {
          // Jika sinkronisasi mati, hanya perbarui sistem saat ini
          this.api.post(`/set-mode-${sys}`, payload);
        }
      }, this.config.debounceDelay);

      const elements = this.elements[sys];
      if (!elements || Object.keys(elements).length === 0) return;

      // Effect Type Radio
      document
        .querySelectorAll(`input[name="${sys}EffectType"]`)
        .forEach((radio) => {
          radio.addEventListener("change", () => this.updateEffectTypeUI(sys));
        });

      // Sliders
      elements.brightness.addEventListener("input", () => {
        elements.brightnessValue.textContent = `${elements.brightness.value}%`;
        debouncedUpdate({ brightness: elements.brightness.value });
      });
      elements.speed.addEventListener("input", () => {
        elements.speedValue.textContent = `${elements.speed.value}%`;
        debouncedUpdate({ speed: elements.speed.value });
      });

      // Mode dropdown
      elements.mode.addEventListener("change", (e) => {
        this.updateDynamicColorPreviews(sys, e.target.value);
        debouncedUpdate({ mode: e.target.value });
      });

      // Color Previews
      elements.colorPreviewStatic.addEventListener("click", () =>
        this.openColorPicker(sys, 1)
      );
      for (let i = 1; i <= 3; i++) {
        const preview = document.getElementById(
          `${sys}ColorPreviewDynamic${i}`
        );
        if (preview)
          preview.addEventListener("click", () => this.openColorPicker(sys, i));
      }
    },

    bindSeinEvents() {
      const seinElements = this.elements.sein;
      if (!seinElements || !seinElements.controls) return;
      const debouncedUpdate = this.util.debounce(
        (payload) => this.api.post(`/set-mode-sein`, payload),
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
        this.openColorPicker("sein", 1)
      );
    },

    // --- API & DATA ---
    api: {
      post: async (endpoint, body) => {
        if (App.state.isDemoMode) {
          console.log("DEMO MODE POST:", endpoint, body);
          App.showToast("Pengaturan diubah (Mode Uji)", "info");
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("OK (Demo)"),
          });
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
            throw new Error(
              response.status === 401 ? `PIN Salah atau hilang` : errorText
            );
          }
          return response;
        } catch (error) {
          App.showToast(`Gagal: ${error.message}`, "error");
          throw error;
        }
      },
    },

    async fetchInitialState() {
      try {
        const response = await fetch("/get-state");
        if (!response.ok) throw new Error("Koneksi gagal");
        const data = await response.json();
        this.state.appState = data;
        // Gunakan PIN dari localStorage jika ada, jika tidak gunakan dari device, fallback ke default
        this.state.authPin =
          localStorage.getItem("aeriAuthPin") ||
          data.authPinDefault ||
          "123456";
        this.elements.authPinInput.value = this.state.authPin;

        this.state.isDemoMode = false;
        this.updateConnectionStatus(true);
        this.renderUI();
      } catch (error) {
        console.error("Inisialisasi gagal, masuk ke mode demo:", error);
        this.state.isDemoMode = true;
        this.state.appState = this.generateDummyState();
        this.updateConnectionStatus(false, true);
        this.showToast(
          "Gagal terhubung. Aplikasi berjalan dalam Mode Uji.",
          "info"
        );
        this.renderUI();
      }
    },

    // --- UI & UX ---
    renderUI() {
      if (!this.state.appState || Object.keys(this.state.appState).length === 0)
        return;
      document.querySelectorAll("input, select, button").forEach((el) => {
        if (!el.closest(".modal-content")) el.disabled = this.state.isDemoMode;
      });

      this.config.systems.forEach((sys) => this.renderSystem(sys));
      this.renderSein();
      this.renderWelcomeSettings();
      this.renderLedCountSettings();

      this.renderActiveControl();
    },

    renderSystem(sys) {
      const config = this.state.appState[sys];
      const elements = this.elements[sys];
      if (!config || !elements || Object.keys(elements).length === 0) return;

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

    updateConnectionStatus(isConnected, isTesting = false) {
      if (isTesting) {
        this.elements.statusIcon.className = "testing";
        this.elements.statusText.textContent = "Mode Uji";
      } else if (isConnected) {
        this.elements.statusIcon.className = "connected";
        this.elements.statusText.textContent = "Connected";
      } else {
        this.elements.statusIcon.className = "disconnected";
        this.elements.statusText.textContent = "Disconnected";
      }
    },

    showToast(message, type = "success") {
      const container = this.elements.toastContainer;
      if (this.state.activeToastTimer)
        clearTimeout(this.state.activeToastTimer);
      let toastElement = container.querySelector(".toast");
      if (toastElement) toastElement.remove();

      toastElement = document.createElement("div");
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

    // --- MANAJEMEN TEMA & PIN ---
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

    loadPin() {
      this.state.authPin = localStorage.getItem("aeriAuthPin") || "123456";
      this.elements.authPinInput.value = this.state.authPin;
    },

    saveNewAuthPin() {
      const newPin = prompt("Masukkan PIN baru (6 digit):", this.state.authPin);
      if (!newPin || newPin.length !== 6 || isNaN(newPin)) {
        this.showToast("PIN baru tidak valid. Harus 6 digit angka.", "error");
        return;
      }
      this.api.post("/update-auth", { newPin }).then(() => {
        localStorage.setItem("aeriAuthPin", newPin);
        this.state.authPin = newPin; // Perbarui state internal
        this.elements.authPinInput.value = newPin;
        this.showToast("PIN berhasil diperbarui.", "success");
      });
    },

    // --- UTILITAS & EVENT HANDLERS LAIN ---
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

    openColorPicker(sys, slot) {
      this.state.activeSystemForModal = sys;
      this.state.activeColorSlot = slot;

      let currentColor = [255, 0, 0];
      const systemState = this.state.appState[sys];

      if (systemState) {
        if (sys === "sein") {
          currentColor = systemState.warna;
        } else {
          const colorKey = slot === 1 ? "warna" : `warna${slot}`;
          currentColor = systemState.stateKiri[colorKey] || [255, 0, 0];
        }
      }

      this.modalColorPicker.color.set({
        r: currentColor[0],
        g: currentColor[1],
        b: currentColor[2],
      });
      this.elements.colorPickerModal.backdrop.style.display = "flex";
    },

    handleColorPickerSave() {
      const { activeSystemForModal, activeColorSlot } = this.state;
      if (!activeSystemForModal) return;

      const newColor = this.modalColorPicker.color.rgb;
      let payload = {};
      let endpoint = `/set-mode-${activeSystemForModal}`;

      if (activeSystemForModal === "sein") {
        payload = { r: newColor.r, g: newColor.g, b: newColor.b };
      } else {
        const isStatic =
          document.querySelector(
            `input[name="${activeSystemForModal}EffectType"]:checked`
          ).value === "static";
        if (isStatic) {
          payload = { mode: 0, r: newColor.r, g: newColor.g, b: newColor.b };
        } else {
          const suffix = activeColorSlot > 1 ? activeColorSlot : "";
          payload[`r${suffix}`] = newColor.r;
          payload[`g${suffix}`] = newColor.g;
          payload[`b${suffix}`] = newColor.b;
        }
      }

      // Cek apakah sistem ini bisa disinkronkan dan apakah mode sinkronisasi aktif
      const isSyncableSystem =
        this.config.systems.includes(activeSystemForModal);
      if (this.state.isSyncEnabled && isSyncableSystem) {
        // Jika ya, kirim payload ke semua sistem
        const updatePromises = this.config.systems.map((targetSys) => {
          const syncEndpoint = `/set-mode-${targetSys}`;
          return this.api.post(syncEndpoint, payload);
        });

        Promise.all(updatePromises)
          .then(() => {
            this.showToast("Warna berhasil disinkronkan", "success");
            this.fetchInitialState(); // Muat ulang state untuk memperbarui UI
            this.elements.colorPickerModal.backdrop.style.display = "none";
          })
          .catch((err) => {
            this.showToast(`Gagal sinkronisasi: ${err.message}`, "error");
          });
      } else {
        // Jika tidak, kirim hanya ke sistem yang aktif
        this.api.post(endpoint, payload).then(() => {
          this.showToast(
            `${activeSystemForModal.toUpperCase()} warna diperbarui`,
            "success"
          );
          this.fetchInitialState();
          this.elements.colorPickerModal.backdrop.style.display = "none";
        });
      }
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
