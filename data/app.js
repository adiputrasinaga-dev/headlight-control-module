/*
 * ===================================================================
 * AERI LIGHT v17.9 - APP.JS (UI GAP FIX)
 * ===================================================================
 * Deskripsi Perubahan:
 * - Memperbaiki logika pada fungsi `renderActiveControl` untuk menyembunyikan
 * seluruh kontainer kontrol (cth: #alis-controls-container) bukan
 * hanya elemen di dalamnya.
 * - Perbaikan ini memastikan properti 'gap' pada CSS dapat bekerja
 * dengan benar dan menghilangkan celah vertikal yang tidak diinginkan.
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
      activeColorContext: "static",
      activeToastTimer: null,
      appState: {},
      presets: [],
    },
    config: {
      debounceDelay: 250,
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
      this.populateDropdowns();
      this.fetchInitialState().then(() => {
        this.populatePresetSlots();
      });
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
      return `<div id="${sysKey}-controls" class="control-set">${panelInfoHTML}<div class="control-group"><label class="control-label">TARGET</label><div class="segmented-control" data-target-group="${sysKey}"><button class="sg-btn" data-value="kiri" title="Hanya Kiri">${svgLeft}</button><button class="sg-btn active" data-value="keduanya" title="Kiri & Kanan">${svgBoth}</button><button class="sg-btn" data-value="kanan" title="Hanya Kanan">${svgRight}</button></div></div><div class="control-group"><label class="control-label">TIPE EFEK</label><div class="radio-group" data-type-group="${sysKey}"><input type="radio" id="${sysKey}EffectTypeStatic" name="${sysKey}EffectType" value="static" checked/><label for="${sysKey}EffectTypeStatic">Statis</label><input type="radio" id="${sysKey}EffectTypeDynamic" name="${sysKey}EffectType" value="dynamic"/><label for="${sysKey}EffectTypeDynamic">Dinamis</label></div></div><div class="effect-details-wrapper"><div class="static-color-section"><div class="control-group"><label>WARNA SOLID</label><div id="${sysKey}ColorPreviewStatic" class="color-preview-box" title="Klik untuk mengubah warna"><span id="${sysKey}ColorHexStatic" class="color-hex-value">#RRGGBB</span></div></div></div><div class="dynamic-controls"><div class="dynamic-color-previews-container"><div class="control-group" id="${sysKey}-dynamic-color-group-1" style="display: none;"><label>WARNA 1</label><div id="${sysKey}ColorPreviewDynamic1" class="color-preview-box" title="Klik untuk mengubah Warna 1"><span id="${sysKey}ColorHexDynamic1" class="color-hex-value">#RRGGBB</span></div></div><div class="control-group" id="${sysKey}-dynamic-color-group-2" style="display: none;"><label>WARNA 2</label><div id="${sysKey}ColorPreviewDynamic2" class="color-preview-box" title="Klik untuk mengubah Warna 2"><span id="${sysKey}ColorHexDynamic2" class="color-hex-value">#RRGGBB</span></div></div><div class="control-group" id="${sysKey}-dynamic-color-group-3" style="display: none;"><label>WARNA 3</label><div id="${sysKey}ColorPreviewDynamic3" class="color-preview-box" title="Klik untuk mengubah Warna 3"><span id="${sysKey}ColorHexDynamic3" class="color-hex-value">#RRGGBB</span></div></div></div><div class="control-group"><label>MODE EFEK</label><select id="${sysKey}Mode" class="cyber-input" disabled></select></div><div class="control-group speed-group"><div class="slider-label-container"><label>SPEED</label><span id="${sysKey}SpeedValue">--%</span></div><input type="range" id="${sysKey}Speed" class="local-slider" min="0" max="100" value="50" disabled /></div></div></div><div class="control-group"><div class="slider-label-container"><label>BRIGHTNESS</label><span id="${sysKey}BrightnessValue">--%</span></div><input type="range" id="${sysKey}Brightness" class="local-slider" min="0" max="100" value="80" disabled /></div></div>`;
    },

    getSeinControlHTML() {
      return `<div id="sein-controls" class="control-set"><div class="static-color-section" style="display: block;"><div class="control-group"><label>WARNA SOLID</label><div id="seinColorPreview" class="color-preview-box" title="Klik untuk mengubah warna"><span id="seinColorHex" class="color-hex-value">#RRGGBB</span></div></div></div><div class="control-group"><label>PILIH EFEK SEIN</label><select id="seinModeSettings" class="cyber-input" disabled></select></div><div class="control-group"><div class="slider-label-container"><label>SPEED</label><span id="seinSpeedValue">--%</span></div><input type="range" id="seinSpeed" class="local-slider" min="0" max="100" value="50" disabled /></div></div>`;
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
      const instantUpdate = (payload) => {
        if (this.state.isSyncEnabled && this.config.systems.includes(sys)) {
          this.config.systems.forEach((targetSys) =>
            this.api.post(`/set-mode-${targetSys}`, payload)
          );
        } else {
          this.api.post(`/set-mode-${sys}`, payload);
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
          targetButtons.forEach((b) => b.classList.remove("active"));
          button.classList.add("active");
          instantUpdate({ target: button.dataset.value });
        });
      });
      document
        .querySelectorAll(`input[name="${sys}EffectType"]`)
        .forEach((radio) => {
          radio.addEventListener("change", (e) => {
            this.updateEffectTypeUI(sys);
            if (e.target.value === "static") instantUpdate({ mode: 0 });
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
        this.openColorPicker("sein", 1, "static")
      );
    },

    api: {
      post: async (endpoint, body) => {
        if (App.state.isDemoMode && !endpoint.startsWith("/get")) {
          console.log("DEMO MODE POST:", endpoint, body);
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("OK (Demo)"),
          });
        }
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
        if (App.state.isDemoMode) {
          console.log("DEMO MODE GET:", endpoint);
          if (endpoint === "/get-presets") {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve([
                  { slot: 1, name: "Preset 1 (Demo)", state: null },
                  {
                    slot: 2,
                    name: "Preset 2 (Demo)",
                    state: { alis: { stateKiri: { modeEfek: 2 } } },
                  },
                  { slot: 3, name: "Preset 3 (Demo)", state: null },
                  { slot: 4, name: "Preset 4 (Demo)", state: null },
                  { slot: 5, name: "Preset 5 (Demo)", state: null },
                ]),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(App.generateDummyState()),
          });
        }
        try {
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error(await response.text());
          return response;
        } catch (error) {
          App.showToast(`Gagal: ${error.message}`, "error");
          throw error;
        }
      },
    },

    async fetchInitialState() {
      try {
        const response = await App.api.get("/get-state");
        const data = await response.json();
        this.state.appState = data;
        this.state.isDemoMode = false;
        this.updateConnectionStatus(true);
        this.renderUI();
      } catch (error) {
        console.error("Inisialisasi gagal, masuk ke mode demo:", error);
        this.state.isDemoMode = true;
        this.state.appState = this.generateDummyState();
        this.updateConnectionStatus(false, true);
        this.showToast("Gagal terhubung. Aplikasi dalam Mode Uji.", "info");
        this.renderUI();
      }
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
      const isStatic = config.stateKiri.modeEfek === 0;
      document.getElementById(`${sys}EffectTypeStatic`).checked = isStatic;
      document.getElementById(`${sys}EffectTypeDynamic`).checked = !isStatic;
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

    // --- PERBAIKAN DI SINI ---
    renderActiveControl() {
      const activeControl = document.querySelector(
        'input[name="controlTarget"]:checked'
      ).value;
      // Gabungkan semua nama sistem kontrol ke dalam satu array
      const allControlSystems = [...this.config.systems, "sein"];

      allControlSystems.forEach((sys) => {
        // Target elemen kontainer terluar, bukan elemen di dalamnya
        const container = document.getElementById(`${sys}-controls-container`);
        if (container) {
          // Tampilkan kontainer jika cocok, sembunyikan jika tidak
          container.style.display = sys === activeControl ? "block" : "none";
        }
      });
    },

    updateConnectionStatus(isConnected, isTesting = false) {
      if (isTesting) {
        this.elements.statusIcon.className = "testing";
        this.elements.statusText.textContent = "Mode Uji";
      } else {
        this.elements.statusIcon.className = isConnected
          ? "connected"
          : "disconnected";
        this.elements.statusText.textContent = isConnected
          ? "Connected"
          : "Disconnected";
      }
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
            context === "static"
              ? "warna"
              : slot === 1
              ? "warna"
              : `warna${slot}`;
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
      const apiCall = (sys) => this.api.post(`/set-mode-${sys}`, payload);
      const systemsToUpdate =
        this.state.isSyncEnabled &&
        this.config.systems.includes(activeSystemForModal)
          ? this.config.systems
          : [activeSystemForModal];
      Promise.all(systemsToUpdate.map(apiCall)).then(() => {
        this.showToast(
          systemsToUpdate.length > 1
            ? "Warna berhasil disinkronkan"
            : `${activeSystemForModal.toUpperCase()} warna diperbarui`,
          "success"
        );
        this.fetchInitialState();
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
          const modeOption = this.config.modeOptions.dynamic.find(
            (m) => m.value === alisModeValue
          );
          const alisModeName =
            alisModeValue === 0
              ? "Statis"
              : modeOption
              ? modeOption.name
              : "Tidak Dikenal";
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
          modeSelect.innerHTML = createOptions(this.config.modeOptions.dynamic);
      });
      document.getElementById("welcomeMode").innerHTML = createOptions(
        this.config.modeOptions.welcome
      );
      document.getElementById("seinModeSettings").innerHTML = createOptions(
        this.config.modeOptions.sein
      );
    },
  };

  App.init();
});
