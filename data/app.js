/*
 * ===================================================================
 * AERI LIGHT v19.5 - APP.JS (OFFLINE SIMULATION FIX)
 * ===================================================================
 * Deskripsi Perubahan:
 * - FIX: Bug di mana aplikasi tidak interaktif saat "Disconnected".
 * - REWORK: Mengimplementasikan pola "Optimistic UI" dengan benar.
 * Perubahan pada UI kini diterapkan secara lokal terlebih dahulu,
 * kemudian perintah dikirim ke perangkat hanya jika terhubung.
 * - Ini membuat mode offline berfungsi penuh sebagai simulator.
 * ===================================================================
 */

import AppConfig from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const App = {
    // --- STATE & KONFIGURASI APLIKASI ---
    state: {
      isConnected: false,
      isSyncEnabled: false,
      activeSystemForModal: null,
      activeColorSlot: 1,
      activeColorContext: "static",
      activeToastTimer: null,
      appState: {},
      presets: [],
    },
    config: AppConfig,

    elements: {},
    modalColorPicker: null,

    async init() {
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
      this.populateDropdowns();

      await Promise.all([this.fetchInitialState(), this.populatePresetSlots()]);
    },

    cacheInitialElements() {
      this.elements = {
        toastContainer: document.getElementById("toast-container"),
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
        presetSlot: document.getElementById("presetSlot"),
        presetName: document.getElementById("presetName"),
        presetPreview: document.getElementById("preset-preview"),
        btnLoadPreset: document.getElementById("btnLoadPreset"),
        btnSavePreset: document.getElementById("btnSavePreset"),
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
      const panelInfoHTML = `<div class="panel-info"><span id="${sysKey}LedCountInfo">--</span> LED</div>`;
      const svgLeft = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.25 4.75a.75.75 0 00-1.06 0L8.72 10.22a.75.75 0 000 1.06l5.47 5.47a.75.75 0 101.06-1.06L10.31 11l5.94-5.19a.75.75 0 000-1.06z"></path></svg>`;
      const svgBoth = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 4.75a.75.75 0 00-1.06 0L2.22 10.22a.75.75 0 000 1.06l5.47 5.47a.75.75 0 101.06-1.06L3.31 11l5.94-5.19a.75.75 0 000-1.06zm6.5 0a.75.75 0 011.06 0l5.47 5.47a.75.75 0 010 1.06l-5.47 5.47a.75.75 0 11-1.06-1.06L20.69 11l-5.94-5.19a.75.75 0 010-1.06z"></path></svg>`;
      const svgRight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 4.75a.75.75 0 011.06 0l5.47 5.47a.75.75 0 010 1.06l-5.47 5.47a.75.75 0 11-1.06-1.06L13.69 11l-5.94-5.19a.75.75 0 010-1.06z"></path></svg>`;
      return `
        <div id="${sysKey}-controls" class="control-set">
          ${panelInfoHTML}
          <div class="control-group"><label class="control-label">TARGET</label><div class="segmented-control" data-target-group="${sysKey}"><button class="sg-btn" data-value="kiri" title="Hanya Kiri">${svgLeft}</button><button class="sg-btn active" data-value="keduanya" title="Kiri & Kanan">${svgBoth}</button><button class="sg-btn" data-value="kanan" title="Hanya Kanan">${svgRight}</button></div></div>
          
          <div class="control-group">
            <label>MODE EFEK</label>
            <select id="${sysKey}Mode" class="cyber-input"></select>
          </div>
          
          <div class="control-group">
            <label>WARNA</label>
            <div id="${sysKey}-color-bar" class="color-bar-container"></div>
          </div>
          
          <div id="${sysKey}-speed-control-wrapper" class="control-group">
            <div class="slider-label-container"><label>SPEED</label><span id="${sysKey}SpeedValue">--%</span></div>
            <input type="range" id="${sysKey}Speed" class="local-slider" min="0" max="100" value="50" />
          </div>

          <div class="control-group">
            <div class="slider-label-container"><label>BRIGHTNESS</label><span id="${sysKey}BrightnessValue">--%</span></div>
            <input type="range" id="${sysKey}Brightness" class="local-slider" min="0" max="100" value="80" />
          </div>
        </div>`;
    },

    getSeinControlHTML() {
      return `<div id="sein-controls" class="control-set"><div class="control-group"><label>WARNA</label><div id="sein-color-bar" class="color-bar-container"><div id="seinColorPreview" class="color-segment" title="Klik untuk mengubah warna"><span id="seinColorHex" class="color-hex-value">#RRGGBB</span></div></div></div><div class="control-group"><label>PILIH EFEK SEIN</label><select id="seinModeSettings" class="cyber-input"></select></div><div class="control-group"><div class="slider-label-container"><label>SPEED</label><span id="seinSpeedValue">--%</span></div><input type="range" id="seinSpeed" class="local-slider" min="0" max="100" value="50" /></div></div>`;
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

    updateLocalState(sys, payload) {
      if (!this.state.appState[sys]) return;
      const systemsToUpdate =
        this.state.isSyncEnabled && this.config.systems.includes(sys)
          ? this.config.systems
          : [sys];
      systemsToUpdate.forEach((currentSys) => {
        const systemState = this.state.appState[currentSys];
        Object.assign(systemState, payload);
        if (payload.mode !== undefined)
          systemState.stateKiri.modeEfek = payload.mode;
        this.renderSystem(currentSys);
      });
    },

    bindEvents() {
      this.elements.syncSwitch.addEventListener("change", (e) => {
        this.state.isSyncEnabled = e.target.checked;
        this.showToast(
          e.target.checked ? "Sinkronisasi Aktif" : "Sinkronisasi Nonaktif",
          "info"
        );
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
      const btnReset = document.getElementById("btnReset");
      if (btnReset) {
        btnReset.addEventListener(
          "click",
          () => (this.elements.resetModal.backdrop.style.display = "flex")
        );
      }
      this.config.systems.forEach((sys) => this.bindControlEvents(sys));
      this.bindSeinEvents();
      this.elements.presetSlot.addEventListener("change", () =>
        this.updatePresetPreview()
      );
      this.elements.btnSavePreset.addEventListener("click", () =>
        this.handleSavePreset()
      );
      this.elements.btnLoadPreset.addEventListener("click", () =>
        this.handleLoadPreset()
      );
    },

    bindControlEvents(sys) {
      const createUpdateHandler = (isDebounced) => (payload) => {
        this.updateLocalState(sys, payload);
        const apiCall = () => {
          const systemsToUpdate =
            this.state.isSyncEnabled && this.config.systems.includes(sys)
              ? this.config.systems
              : [sys];
          systemsToUpdate.forEach((targetSys) =>
            this.api.post(`/set-mode-${targetSys}`, payload)
          );
        };
        if (isDebounced) {
          this.util.debounce(apiCall, this.config.debounceDelay)();
        } else {
          apiCall();
        }
      };

      const instantUpdate = createUpdateHandler(false);
      const debouncedUpdate = createUpdateHandler(true);
      const elements = this.elements[sys];
      if (!elements || !Object.keys(elements).length) return;

      const targetButtons = document.querySelectorAll(
        `[data-target-group="${sys}"] .sg-btn`
      );
      targetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          instantUpdate({ target: button.dataset.value });
        });
      });

      elements.mode.addEventListener("change", (e) => {
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
    },

    bindSeinEvents() {
      const seinElements = this.elements.sein;
      if (!seinElements || !seinElements.controls) return;
      const debouncedUpdate = this.util.debounce((payload) => {
        this.api.post(`/set-mode-sein`, payload);
      }, this.config.debounceDelay);
      seinElements.modeSettings.addEventListener("change", () =>
        debouncedUpdate({ mode: seinElements.modeSettings.value })
      );
      seinElements.speed.addEventListener("input", () => {
        seinElements.speedValue.textContent = `${seinElements.speed.value}%`;
        debouncedUpdate({ speed: seinElements.speed.value });
      });
      document
        .getElementById("seinColorPreview")
        .addEventListener("click", () =>
          this.openColorPicker("sein", 1, "static")
        );
    },

    api: {
      post: async (endpoint, body) => {
        if (!App.state.isConnected) return Promise.resolve({ ok: true });
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(body).toString(),
          });
          if (!response.ok) throw new Error(await response.text());
          return response;
        } catch (error) {
          App.showToast(`Gagal: ${error.message}`, "error");
          throw error;
        }
      },
      get: async (endpoint) => {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error(await response.text());
          return response;
        } catch (error) {
          throw error;
        }
      },
    },

    async fetchInitialState() {
      try {
        const response = await App.api.get("/get-state");
        const data = await response.json();
        this.state.appState = data;
        this.updateConnectionStatus(true);
      } catch (error) {
        console.error("Inisialisasi gagal, memuat data dummy:", error);
        this.state.appState = this.generateDummyState();
        this.updateConnectionStatus(false);
        this.showToast("Gagal terhubung. Menampilkan mode offline.", "info");
      }
      this.renderUI();
    },

    renderUI() {
      if (!this.state.appState || Object.keys(this.state.appState).length === 0)
        return;
      document.querySelectorAll("input, select, button").forEach((el) => {
        if (!el.closest(".modal-content")) el.disabled = false;
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
      const currentTarget = config.target || "keduanya";
      const targetButtons = document.querySelectorAll(
        `[data-target-group="${sys}"] .sg-btn`
      );
      targetButtons.forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.value === currentTarget
        )
      );
      const ledCountInfo = document.getElementById(`${sys}LedCountInfo`);
      if (ledCountInfo) ledCountInfo.textContent = config.ledCount;
      elements.brightness.value = config.brightness;
      elements.brightnessValue.textContent = `${config.brightness}%`;
      elements.speed.value = config.speed;
      elements.speedValue.textContent = `${config.speed}%`;
      elements.mode.value = config.stateKiri.modeEfek;
      this.updateDynamicControlsUI(sys);
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
      const preview = document.getElementById("seinColorPreview");
      if (preview) {
        preview.style.backgroundColor = hex;
        const hexSpan = preview.querySelector(".color-hex-value");
        if (hexSpan) hexSpan.textContent = hex;
      }
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

    updateDynamicControlsUI(sys) {
      const modeValue = document.getElementById(`${sys}Mode`).value;
      const mode = this.config.effectModes.find((m) => m.value == modeValue);
      if (!mode) return;

      const speedControlWrapper = document.getElementById(
        `${sys}-speed-control-wrapper`
      );
      const colorBar = document.getElementById(`${sys}-color-bar`);

      speedControlWrapper.style.display = mode.hasSpeed ? "block" : "none";
      colorBar.style.display = mode.colorSlots > 0 ? "flex" : "none";
      colorBar.innerHTML = "";

      for (let i = 1; i <= mode.colorSlots; i++) {
        const segment = document.createElement("div");
        segment.className = "color-segment";
        segment.dataset.slot = i;
        segment.title = `Klik untuk mengubah Warna ${i}`;

        const colorKey = i === 1 ? "warna" : `warna${i}`;
        const color = this.state.appState[sys].stateKiri[colorKey] || [0, 0, 0];
        const hex = this.util.rgbToHex(color[0], color[1], color[2]);
        segment.style.backgroundColor = hex;

        segment.addEventListener("click", () =>
          this.openColorPicker(sys, i, mode.value === 0 ? "static" : "dynamic")
        );
        colorBar.appendChild(segment);
      }
    },

    renderActiveControl() {
      const activeControl = document.querySelector(
        'input[name="controlTarget"]:checked'
      ).value;
      const allControlSystems = [...this.config.systems, "sein"];
      allControlSystems.forEach((sys) => {
        const container = document.getElementById(`${sys}-controls-container`);
        if (container) {
          container.style.display = sys === activeControl ? "block" : "none";
        }
      });
    },

    updateConnectionStatus(isConnected) {
      this.state.isConnected = isConnected;
      this.elements.statusIcon.className = isConnected
        ? "connected"
        : "disconnected";
      this.elements.statusText.textContent = isConnected
        ? "Connected"
        : "Disconnected";
    },

    showToast(message, type = "success") {
      clearTimeout(this.state.activeToastTimer);
      const container = this.elements.toastContainer;
      container.innerHTML = "";
      const toastElement = document.createElement("div");
      toastElement.className = `toast ${type}`;
      toastElement.textContent = message;
      container.appendChild(toastElement);
      this.state.activeToastTimer = setTimeout(() => {
        if (toastElement.parentElement) toastElement.remove();
        this.state.activeToastTimer = null;
      }, 4000);
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
        return `#${((1 << 24) + (r << 16) + (g << 8) + b)
          .toString(16)
          .slice(1)
          .toUpperCase()}`;
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
      let currentColor = [255, 0, 0];
      const systemState = this.state.appState[sys];
      if (systemState) {
        if (sys === "sein") {
          currentColor = systemState.warna;
        } else {
          const colorKey =
            context === "static" || slot === 1 ? "warna" : `warna${slot}`;
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
      const { activeSystemForModal, activeColorSlot, activeColorContext } =
        this.state;
      if (!activeSystemForModal) return;
      const newColor = this.modalColorPicker.color.rgb;
      let payload = {};
      if (activeSystemForModal === "sein") {
        payload = { r: newColor.r, g: newColor.g, b: newColor.b };
      } else {
        if (activeColorContext === "static") {
          payload = { mode: 0, r: newColor.r, g: newColor.g, b: newColor.b };
        } else {
          const suffix = activeColorSlot > 1 ? activeColorSlot : "";
          payload[`r${suffix}`] = newColor.r;
          payload[`g${suffix}`] = newColor.g;
          payload[`b${suffix}`] = newColor.b;
        }
      }

      this.updateLocalState(activeSystemForModal, payload);
      this.api.post(`/set-mode-${activeSystemForModal}`, payload).then(() => {
        this.showToast(
          `${activeSystemForModal.toUpperCase()} warna diperbarui`,
          "success"
        );
      });

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

    async populatePresetSlots() {
      try {
        const response = await this.api.get("/get-presets");
        const presets = await response.json();
        this.state.presets = presets;
        this.elements.presetSlot.innerHTML = presets
          .map((p) => `<option value="${p.slot}">${p.name}</option>`)
          .join("");
        this.updatePresetPreview();
      } catch (error) {
        this.showToast("Gagal memuat daftar preset", "error");
        this.elements.presetSlot.innerHTML = `<option value="">Gagal Memuat</option>`;
      }
    },

    updatePresetPreview() {
      const selectedSlot = this.elements.presetSlot.value;
      const presetData = this.state.presets.find((p) => p.slot == selectedSlot);
      if (presetData) {
        this.elements.presetName.value = presetData.name;
        if (
          presetData.state &&
          presetData.state.alis &&
          presetData.state.alis.stateKiri
        ) {
          const alisModeValue = presetData.state.alis.stateKiri.modeEfek;
          const modeOption = this.config.effectModes.find(
            (m) => m.value === alisModeValue
          );
          const alisModeName = modeOption ? modeOption.name : "Tidak Dikenal";
          this.elements.presetPreview.innerHTML = `<h4>Pratinjau: "${presetData.name}"</h4><p>Preset ini berisi konfigurasi. Contoh: Mode Alis adalah ${alisModeName}.</p>`;
        } else {
          this.elements.presetPreview.innerHTML = `<h4>Pratinjau: "${presetData.name}"</h4><p>Slot preset ini kosong. Simpan konfigurasi saat ini untuk mengisinya.</p>`;
        }
      }
    },

    handleSavePreset() {
      const slot = this.elements.presetSlot.value;
      const name = this.elements.presetName.value;
      if (!name) {
        this.showToast("Nama preset tidak boleh kosong!", "error");
        return;
      }
      this.api.post("/save-preset", { slot, name }).then((response) => {
        if (response.ok) {
          this.showToast(
            `Preset '${name}' berhasil disimpan ke Slot ${slot}`,
            "success"
          );
          this.populatePresetSlots();
        }
      });
    },

    handleLoadPreset() {
      const slot = this.elements.presetSlot.value;
      const presetName =
        this.elements.presetSlot.options[this.elements.presetSlot.selectedIndex]
          .text;
      if (
        confirm(
          `Anda yakin ingin memuat preset '${presetName}'? Semua perubahan yang belum disimpan akan hilang.`
        )
      ) {
        this.api.post("/load-preset", { slot }).then((response) => {
          if (response.ok) {
            this.showToast(`Preset '${presetName}' berhasil dimuat`, "success");
            this.fetchInitialState();
          }
        });
      }
    },

    generateDummyState() {
      const defaultLightState = {
        stateKiri: {
          warna: [230, 0, 35],
          warna2: [0, 246, 255],
          warna3: [0, 255, 0],
          modeEfek: 0,
        },
        stateKanan: {
          warna: [230, 0, 35],
          warna2: [0, 246, 255],
          warna3: [0, 255, 0],
          modeEfek: 0,
        },
        ledCount: 50,
        brightness: 85,
        speed: 50,
        target: "keduanya",
      };
      return {
        alis: { ...defaultLightState },
        shroud: {
          ...defaultLightState,
          ledCount: 40,
          stateKiri: {
            ...defaultLightState.stateKiri,
            warna: [191, 193, 194],
            modeEfek: 5,
          },
        },
        demon: {
          ...defaultLightState,
          ledCount: 1,
          stateKiri: { ...defaultLightState.stateKiri, modeEfek: 0 },
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
          modeSelect.innerHTML = createOptions(this.config.effectModes);
      });
      document.getElementById("welcomeMode").innerHTML = createOptions(
        this.config.welcomeModes
      );
      document.getElementById("seinModeSettings").innerHTML = createOptions(
        this.config.seinModes
      );
    },
  };

  App.init();
});
