/*
 * ===================================================================
 * AERI LIGHT v24.9 - APP LOGIC (MODAL & Z-INDEX FIX)
 * ===================================================================
 * Deskripsi Perubahan:
 * - FIXED: Memperbaiki kesalahan ketik pada fungsi renderModalColorSlots
 * untuk memastikan color picker muncul saat mengedit langkah.
 * - MERGED: Konfigurasi dari config.js disatukan di sini.
 * - REFINED: Color picker tidak lagi muncul otomatis.
 * - REFINED: Slider kecerahan (value) di dalam color picker iro.js
 * telah dihapus.
 * - ADDED: Panel pratinjau warna kini menampilkan kode Hex.
 * - FIXED: Fitur sinkronisasi dan kontrol per-sisi kini berfungsi.
 * - DISABLED: Fitur PWA (Service Worker) dinonaktifkan.
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
    { name: "Efek Kustom", value: 16 },
  ],

  seinModes: [
    { name: "Sequential", value: 0, colorSlots: 1, hasSpeed: true },
    { name: "Pulsing Arrow", value: 1, colorSlots: 1, hasSpeed: true },
    { name: "Fill & Flush", value: 2, colorSlots: 1, hasSpeed: true },
    { name: "Comet Trail", value: 3, colorSlots: 1, hasSpeed: true },
  ],
};

class AeriApp {
  constructor(config) {
    this.state = {
      isConnected: false,
      activeTab: "Kontrol",
      activeSystem: "alis",
      activeSide: "keduanya",
      isSyncMode: false,
      activeSystemForModal: null,
      activeColorSlot: 0,
      originalColor: null,
      appState: null,
      customWelcomeSequence: [],
      activeEditorContext: { system: null, index: -1 },
    };
    this.elements = {};
    this.modalColorPicker = null;
    this.socket = null;
    this.api = this.createApiHandler();
    this.heartbeatTimer = null;

    this.config = config || {};
    this.config.modes = {
      alis: (this.config.effectModes || []).map((m) => m.name),
      shroud: (this.config.effectModes || []).map((m) => m.name),
      demon: (this.config.effectModes || []).map((m) => m.name),
      sein: (this.config.seinModes || []).map((m) => m.name),
      welcome: (this.config.welcomeModes || []).map((m) => m.name),
    };
  }

  rgbToHex(r, g, b) {
    return (
      "#" +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    );
  }

  generateDefaultState() {
    const defaultSideState = {
      kecerahan: 200,
      mode: 0,
      kecepatan: 50,
      warna: [
        [255, 0, 0],
        [0, 0, 255],
        [0, 255, 0],
      ],
    };
    const defaultLightState = {
      stateKiri: { ...defaultSideState },
      stateKanan: { ...defaultSideState },
    };
    return {
      masterPowerState: true,
      alis: { ...defaultLightState },
      shroud: { ...defaultLightState },
      demon: { ...defaultLightState },
      sein: { mode: 0, kecepatan: 50, warna: [255, 100, 0], kecerahan: 255 },
      ledCounts: { alis: 30, shroud: 30, demon: 1, sein: 30 },
      welcome: { mode: 0, durasi: 5 },
    };
  }

  async init() {
    this.state.appState = this.generateDefaultState();
    this.cacheInitialElements();
    this.attachEventListeners();
    this.initColorPicker();
    this.renderFullUI();
    this.connectWebSocket();
    await this.loadCustomWelcomeSequence();
  }

  connectWebSocket() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.setConnectionStatus(true);
    };

    this.socket.onclose = () => {
      this.setConnectionStatus(false);
      setTimeout(() => this.connectWebSocket(), 2000);
    };

    this.socket.onerror = (e) => {
      console.error("WS error", e);
      this.socket.close();
    };

    this.socket.onmessage = (event) => {
      try {
        const newState = JSON.parse(event.data);
        this.state.appState = newState;
        this.renderFullUI();
      } catch (error) {
        console.error("Failed to parse WS message", error);
      }
    };
  }

  initColorPicker() {
    this.modalColorPicker = new iro.ColorPicker(
      this.elements.colorPickerModal.container,
      {
        width: 280,
        color: "#ff0000",
        borderWidth: 1,
        borderColor: "#fff",
        layout: [{ component: iro.ui.Wheel }],
      }
    );

    this.modalColorPicker.on("color:change", (color) => {
      if (color.hsv.v < 100) {
        color.hsv = { ...color.hsv, v: 100 };
      }
    });
  }

  cacheInitialElements() {
    this.elements = {
      masterPowerSwitch: document.getElementById("masterPowerSwitch"),
      resetModal: {
        backdrop: document.getElementById("reset-modal"),
        confirmInput: document.getElementById("reset-confirm-input"),
        confirmBtn: document.getElementById("reset-confirm-btn"),
        cancelBtn: document.getElementById("reset-cancel-btn"),
      },
      colorPickerModal: {
        backdrop: document.getElementById("color-picker-modal"),
        container: document.getElementById("modalColorPickerContainer"),
        saveBtn: document.getElementById("btnModalSimpan"),
        cancelBtn: document.getElementById("btnModalBatal"),
      },
      statusIcon: document.getElementById("statusIcon"),
      statusText: document.getElementById("statusText"),
      savingIndicator: document.getElementById("savingIndicator"),
      desktopNav: document.querySelector(".desktop-nav"),
      mobileMenu: document.getElementById("mobile-menu"),
      hamburgerBtn: document.getElementById("hamburger-btn"),
      tabKontrol: document.getElementById("tabKontrol"),
      tabPengaturan: document.getElementById("tabPengaturan"),
      syncSwitch: document.getElementById("syncSwitch"),
      systemSelector: document.querySelector(".system-selector"),
      sideSelector: document.querySelector(".side-selector"),
      controlContainers: {
        alis: document.getElementById("alis-controls-container"),
        shroud: document.getElementById("shroud-controls-container"),
        demon: document.getElementById("demon-controls-container"),
        sein: document.getElementById("sein-controls-container"),
      },
      presetSlotSelect: document.getElementById("presetSlot"),
      presetPreview: document.getElementById("preset-preview"),
      presetNameInput: document.getElementById("presetName"),
      btnLoadPreset: document.getElementById("btnLoadPreset"),
      btnSavePreset: document.getElementById("btnSavePreset"),
      ledCountInputs: {
        alis: document.getElementById("ledCountAlis"),
        shroud: document.getElementById("ledCountShroud"),
        demon: document.getElementById("ledCountDemon"),
        sein: document.getElementById("ledCountSein"),
      },
      btnSaveLedCounts: document.getElementById("btnSaveLedCounts"),
      welcomeModeSelect: document.getElementById("welcomeMode"),
      welcomeDurationInput: document.getElementById("welcomeDuration"),
      btnPreviewWelcome: document.getElementById("btnPreviewWelcome"),
      btnSaveWelcome: document.getElementById("btnSaveWelcome"),
      btnReset: document.getElementById("btnReset"),
      tabEditorWelcome: document.getElementById("tabEditorWelcome"),
      welcomeEditorContainer: document.getElementById(
        "welcome-editor-container"
      ),
      btnSaveCustomWelcome: document.getElementById("btnSaveCustomWelcome"),
      btnPreviewCustomWelcome: document.getElementById(
        "btnPreviewCustomWelcome"
      ),
      effectStepModal: {
        backdrop: document.getElementById("effect-step-modal"),
        effectSelect: document.getElementById("modalEffectSelect"),
        sideSelect: document.getElementById("modalSideSelect"),
        colorSlotsContainer: document.getElementById(
          "modal-color-slots-container"
        ),
        durationInput: document.getElementById("modalDurationInput"),
        saveBtn: document.getElementById("btnSaveStep"),
        cancelBtn: document.getElementById("btnCancelStep"),
        deleteBtn: document.getElementById("btnDeleteStep"),
      },
    };
  }

  attachEventListeners() {
    this.elements.masterPowerSwitch.addEventListener("change", (e) =>
      this.handleMasterPowerChange(e)
    );
    this.elements.desktopNav.addEventListener("click", (e) =>
      this.handleTabClick(e)
    );
    this.elements.mobileMenu.addEventListener("click", (e) =>
      this.handleTabClick(e)
    );
    this.elements.hamburgerBtn.addEventListener("click", () =>
      this.toggleMobileMenu()
    );
    this.elements.systemSelector.addEventListener("change", (e) =>
      this.handleSystemChange(e)
    );
    this.elements.sideSelector.addEventListener("change", (e) =>
      this.handleSideChange(e)
    );
    this.elements.syncSwitch.addEventListener("change", (e) =>
      this.handleSyncModeChange(e)
    );
    this.elements.colorPickerModal.saveBtn.addEventListener("click", () =>
      this.handleColorPickerSave()
    );
    this.elements.colorPickerModal.cancelBtn.addEventListener("click", () =>
      this.handleColorPickerCancel()
    );
    this.elements.resetModal.cancelBtn.addEventListener("click", () =>
      this.hideModal("resetModal")
    );
    this.elements.resetModal.confirmBtn.addEventListener("click", () =>
      this.handleResetConfirm()
    );
    this.elements.resetModal.confirmInput.addEventListener("input", (e) => {
      this.elements.resetModal.confirmBtn.disabled = e.target.value !== "RESET";
    });
    this.elements.btnSaveLedCounts.addEventListener("click", () =>
      this.handleSaveLedCounts()
    );
    this.elements.btnSaveWelcome.addEventListener("click", () =>
      this.handleSaveWelcome()
    );
    this.elements.btnPreviewWelcome.addEventListener("click", () =>
      this.handlePreviewWelcome()
    );
    this.elements.btnSavePreset.addEventListener("click", () =>
      this.handleSavePreset()
    );
    this.elements.btnLoadPreset.addEventListener("click", () =>
      this.handleLoadPreset()
    );
    this.elements.presetSlotSelect.addEventListener("change", (e) =>
      this.handlePresetSlotChange(e)
    );
    this.elements.btnReset.addEventListener("click", () =>
      this.showModal("resetModal")
    );

    this.elements.welcomeEditorContainer.addEventListener("click", (e) =>
      this.handleSlotClick(e)
    );
    this.elements.effectStepModal.saveBtn.addEventListener("click", () =>
      this.handleEffectStepSave()
    );
    this.elements.effectStepModal.cancelBtn.addEventListener("click", () =>
      this.hideModal("effectStepModal")
    );
    this.elements.effectStepModal.deleteBtn.addEventListener("click", () =>
      this.handleEffectStepDelete()
    );
    this.elements.effectStepModal.effectSelect.addEventListener("change", (e) =>
      this.renderModalColorSlots(parseInt(e.target.value))
    );
    this.elements.btnSaveCustomWelcome.addEventListener("click", () =>
      this.saveCustomWelcomeSequence()
    );
    this.elements.btnPreviewCustomWelcome.addEventListener("click", () =>
      this.handlePreviewWelcome()
    );
  }

  createApiHandler() {
    const post = async (endpoint, body, isJson = true) => {
      if (!this.state.isConnected && endpoint !== "/preview-welcome") {
        this.showToast(
          "Mode Offline: Perubahan akan disimpan saat terhubung kembali",
          "info"
        );
        return Promise.resolve({ ok: true, offline: true });
      }
      try {
        const headers = isJson ? { "Content-Type": "application/json" } : {};
        const bodyToSend = isJson ? JSON.stringify(body) : body;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: headers,
          body: bodyToSend,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        console.error(`API POST to ${endpoint} failed:`, error);
        this.setConnectionStatus(false);
        throw error;
      }
    };
    return { post };
  }

  setConnectionStatus(isConnected) {
    if (this.state.isConnected === isConnected) return;
    this.state.isConnected = isConnected;
    this.elements.statusIcon.className = isConnected
      ? "connected"
      : "disconnected";
    this.elements.statusText.textContent = isConnected
      ? "Terhubung"
      : "Terputus";
    if (!isConnected) {
      this.showToast("Koneksi terputus. Anda dalam mode offline.", "error");
    } else {
      this.showToast("Terhubung ke AERI LIGHT", "success");
    }
  }

  renderFullUI() {
    if (!this.state.appState) return;
    this.elements.masterPowerSwitch.checked =
      this.state.appState.masterPowerState;
    this.renderSystem("alis");
    this.renderSystem("shroud");
    this.renderSystem("demon");
    this.renderSettings();
    this.updateSyncPanelHighlight();
    this.populatePresetSlots();
    this.renderWelcomeEditor();
  }

  renderSystem(system) {
    const container = this.elements.controlContainers[system];
    if (!container || !this.state.appState[system]) return;

    const systemState = this.state.appState[system];
    const isLightSystem = system !== "sein";
    const configModes = this.config.modes[system] || [];

    const activeSideKey =
      this.state.activeSide === "kanan" ? "stateKanan" : "stateKiri";
    const sideState = isLightSystem ? systemState[activeSideKey] : systemState;

    let html = `
      <div class="control-group">
        <label for="mode-${system}">Mode Lampu</label>
        <select id="mode-${system}" class="cyber-input">
          ${configModes
            .map(
              (mode, index) =>
                `<option value="${index}" ${
                  sideState.mode === index ? "selected" : ""
                }>${mode}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="effect-details-wrapper">`;

    const effectConfig = isLightSystem
      ? this.config.effectModes.find((e) => e.value === sideState.mode)
      : this.config.seinModes.find((e) => e.value === sideState.mode);

    const brightnessPercent = Math.round((sideState.kecerahan / 255) * 100);
    html += `
          <div class="control-group">
            <div class="slider-label-container">
              <label for="brightness-${system}">Kecerahan</label>
              <span id="brightness-value-${system}" class="panel-info">${brightnessPercent}%</span>
            </div>
            <input type="range" id="brightness-${system}" min="0" max="100" value="${brightnessPercent}">
          </div>`;

    if (effectConfig && effectConfig.hasSpeed) {
      html += `
            <div class="control-group">
              <div class="slider-label-container">
                <label for="speed-${system}">Kecepatan</label>
                <span id="speed-value-${system}" class="panel-info">${sideState.kecepatan}%</span>
              </div>
              <input type="range" id="speed-${system}" min="0" max="100" value="${sideState.kecepatan}">
            </div>`;
    }

    if (effectConfig && effectConfig.colorSlots > 0) {
      html += `
            <div class="control-group">
              <label>Warna</label>
              <div class="color-bar-container">
                ${
                  isLightSystem
                    ? sideState.warna
                        .slice(0, effectConfig.colorSlots)
                        .map((color, index) =>
                          this.renderColorSegment(system, index)
                        )
                        .join("")
                    : this.renderColorSegment(system, 0)
                }
              </div>
            </div>`;
    }

    html += `</div>`;

    container.innerHTML = html;
    this.attachDynamicEventListeners(system);
  }

  renderColorSegment(system, index) {
    const systemState = this.state.appState[system];
    const isLightSystem = system !== "sein";

    const activeSideKey =
      this.state.activeSide === "kanan" ? "stateKanan" : "stateKiri";
    const sideState = isLightSystem ? systemState[activeSideKey] : null;

    const color = isLightSystem ? sideState.warna[index] : systemState.warna;
    const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    const hex = this.rgbToHex(color[0], color[1], color[2]);

    return `<div class="color-segment" style="background-color: ${rgb};" data-system="${system}" data-color-index="${index}">${hex}</div>`;
  }

  renderSettings() {
    if (!this.state.appState) return;
    const { ledCounts, welcome } = this.state.appState;
    Object.keys(ledCounts).forEach((key) => {
      if (this.elements.ledCountInputs[key]) {
        this.elements.ledCountInputs[key].value = ledCounts[key];
      }
    });
    const welcomeModes = this.config.modes.welcome || [];
    this.elements.welcomeModeSelect.innerHTML = welcomeModes
      .map(
        (mode, index) =>
          `<option value="${index}" ${
            welcome.mode === index ? "selected" : ""
          }>${mode}</option>`
      )
      .join("");
    this.elements.welcomeDurationInput.value = welcome.durasi;

    this.renderSystem("sein");
  }

  attachDynamicEventListeners(system) {
    const container = this.elements.controlContainers[system];
    if (!container) return;

    const modeEl = container.querySelector(`#mode-${system}`);
    if (modeEl) {
      modeEl.addEventListener("change", (e) => {
        const newModeValue = parseInt(e.target.value);

        this.handleControlSave(system, "mode", newModeValue);

        const activeSideKey =
          this.state.activeSide === "kanan" ? "stateKanan" : "stateKiri";
        if (this.state.appState[system]) {
          if (this.state.activeSide === "keduanya") {
            this.state.appState[system].stateKiri.mode = newModeValue;
            this.state.appState[system].stateKanan.mode = newModeValue;
          } else {
            this.state.appState[system][activeSideKey].mode = newModeValue;
          }
        }

        this.renderSystem(system);
      });
    }

    const speedEl = container.querySelector(`#speed-${system}`);
    if (speedEl) {
      speedEl.addEventListener("input", (e) =>
        this.handleControlPreview(system, "kecepatan", e.target.value)
      );
      speedEl.addEventListener("change", (e) =>
        this.handleControlSave(system, "kecepatan", e.target.value)
      );
    }

    const brightnessEl = container.querySelector(`#brightness-${system}`);
    if (brightnessEl) {
      brightnessEl.addEventListener("input", (e) =>
        this.handleControlPreview(system, "kecerahan", e.target.value)
      );
      brightnessEl.addEventListener("change", (e) =>
        this.handleControlSave(system, "kecerahan", e.target.value)
      );
    }

    container.querySelectorAll(".color-segment").forEach((el) => {
      el.addEventListener("click", (e) => {
        const system = e.target.dataset.system;
        const index = parseInt(e.target.dataset.colorIndex);
        this.showColorPicker(system, index);
      });
    });
  }

  handleMasterPowerChange(e) {
    const value = e.target.checked;
    this.state.appState.masterPowerState = value;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "master_power", value: value }));
    }
  }

  handleTabClick(e) {
    if (e.target.tagName !== "BUTTON") return;
    const tabName = e.target.dataset.tab;
    this.state.activeTab = tabName;
    document
      .querySelectorAll(".tab-btn, .mobile-nav-link")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(`[data-tab="${tabName}"]`)
      .forEach((btn) => btn.classList.add("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => (content.style.display = "none"));
    document.getElementById(`tab${tabName}`).style.display = "block";

    if (tabName === "EditorWelcome") {
      this.renderWelcomeEditor();
    }

    if (this.elements.mobileMenu.classList.contains("open")) {
      this.toggleMobileMenu();
    }
  }

  toggleMobileMenu() {
    this.elements.mobileMenu.classList.toggle("open");
  }

  handleSystemChange(e) {
    this.state.activeSystem = e.target.value;
    Object.values(this.elements.controlContainers).forEach((container) => {
      if (container.id.includes(this.state.activeSystem)) {
        container.style.display = "block";
      } else if (!container.id.includes("sein-controls-container")) {
        container.style.display = "none";
      }
    });
    this.updateSyncPanelHighlight();
    this.renderSystem(this.state.activeSystem);
  }

  handleSideChange(e) {
    this.state.activeSide = e.target.value;
    this.renderSystem(this.state.activeSystem);
  }

  handleSyncModeChange(e) {
    this.state.isSyncMode = e.target.checked;
    this.showToast(
      `Mode Sinkronisasi ${this.state.isSyncMode ? "Aktif" : "Nonaktif"}`,
      "info"
    );
    this.updateSyncPanelHighlight();
  }

  updateSyncPanelHighlight() {
    const systemsToHighlight = ["alis", "shroud", "demon"];
    systemsToHighlight.forEach((sys) => {
      const panel =
        this.elements.controlContainers[sys].closest(".cyber-panel");
      if (panel) {
        if (this.state.isSyncMode) {
          panel.classList.add("panel-synced");
        } else {
          panel.classList.remove("panel-synced");
        }
      }
    });
  }

  handleControlPreview(system, key, value) {
    const valueEl = document.getElementById(`${key}-value-${system}`);
    if (valueEl) {
      valueEl.textContent = `${value}%`;
    }
  }

  handleControlSave(system, key, value) {
    const systemsToUpdate =
      this.state.isSyncMode && ["alis", "shroud", "demon"].includes(system)
        ? ["alis", "shroud", "demon"]
        : [system];

    const intValue = parseInt(value);

    this.showSavingIndicator();

    const promises = systemsToUpdate.map((sys) => {
      let payload = { [key]: intValue, target: this.state.activeSide };
      return this.api.post(`/set-mode-${sys}`, payload);
    });

    Promise.all(promises)
      .catch((err) => {
        console.error("Sync save failed:", err);
        this.showToast("Gagal menyimpan sinkronisasi", "error");
      })
      .finally(() => this.hideSavingIndicator());
  }

  async handleColorPickerSave() {
    if (this.state.activeSystemForModal === "editor") {
      const targetElement = this.state.activeColorSlot;
      const newColor = this.modalColorPicker.color.rgb;
      const colorArray = [newColor.r, newColor.g, newColor.b];
      targetElement.style.backgroundColor = `rgb(${colorArray.join(",")})`;
      targetElement.dataset.colorValue = JSON.stringify(colorArray);
      targetElement.textContent = this.rgbToHex(
        newColor.r,
        newColor.g,
        newColor.b
      );
      this.hideModal("colorPickerModal");
      return;
    }

    this.hideModal("colorPickerModal");
    const { activeSystemForModal, activeColorSlot } = this.state;
    const newColor = this.modalColorPicker.color.rgb;

    let payload = {};
    if (activeSystemForModal === "sein") {
      payload = { r: newColor.r, g: newColor.g, b: newColor.b };
    } else {
      payload = {
        r: newColor.r,
        g: newColor.g,
        b: newColor.b,
        colorIndex: activeColorSlot,
        target: this.state.activeSide,
      };
    }

    const systemsToUpdate =
      this.state.isSyncMode &&
      ["alis", "shroud", "demon"].includes(activeSystemForModal)
        ? ["alis", "shroud", "demon"]
        : [activeSystemForModal];

    this.showSavingIndicator();
    try {
      for (const sys of systemsToUpdate) {
        await this.api.post(`/set-mode-${sys}`, payload);
      }
    } catch (error) {
      this.showToast("Gagal menyimpan warna", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  handleColorPickerCancel() {
    this.hideModal("colorPickerModal");
  }

  async handleSaveLedCounts() {
    const payload = {};
    Object.keys(this.elements.ledCountInputs).forEach((key) => {
      payload[key] = parseInt(this.elements.ledCountInputs[key].value);
    });
    this.showSavingIndicator();
    try {
      await this.api.post("/set-led-counts", payload);
      this.showToast("Jumlah LED berhasil disimpan", "success");
    } catch (error) {
      this.showToast("Gagal menyimpan", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handleSaveWelcome() {
    const payload = {
      mode: parseInt(this.elements.welcomeModeSelect.value),
      durasi: parseInt(this.elements.welcomeDurationInput.value),
    };
    this.showSavingIndicator();
    try {
      await this.api.post("/set-welcome", payload);
      this.showToast("Animasi Welcome disimpan", "success");
    } catch (error) {
      this.showToast("Gagal menyimpan", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handlePreviewWelcome() {
    this.showSavingIndicator();
    try {
      await this.api.post("/preview-welcome", {});
      this.showToast("Memulai preview...", "info");
    } catch (error) {
      this.showToast("Gagal memulai preview", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handleSavePreset() {
    const slot = this.elements.presetSlotSelect.value;
    const name = this.elements.presetNameInput.value;
    if (!name) {
      this.showToast("Nama preset tidak boleh kosong", "error");
      return;
    }
    const payload = { slot: parseInt(slot), name: name };
    this.showSavingIndicator();
    try {
      await this.api.post("/save-preset", payload);
      this.showToast(`Preset '${name}' disimpan di slot ${slot}`, "success");
    } catch (error) {
      this.showToast("Gagal menyimpan preset", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handleLoadPreset() {
    const slot = this.elements.presetSlotSelect.value;
    this.showSavingIndicator();
    try {
      await this.api.post("/load-preset", { slot: parseInt(slot) });
      this.showToast(`Preset slot ${slot} dimuat`, "success");
    } catch (error) {
      this.showToast("Gagal memuat preset", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handleResetConfirm() {
    this.hideModal("resetModal");
    this.showSavingIndicator();
    try {
      await this.api.post("/reset-factory", {});
      this.showToast("Reset pabrik berhasil. Memuat ulang...", "success");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      this.showToast("Gagal melakukan reset", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handlePresetSlotChange(e) {
    const slot = e.target.value;
    try {
      const response = await fetch(`/get-preset-name?slot=${slot}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      this.elements.presetNameInput.value = data.name || "";
      this.elements.presetPreview.innerHTML =
        data.summary !== "Kosong"
          ? `<h4>${data.name}</h4><p>Pratinjau: ${data.summary}</p>`
          : `<h4>${data.name}</h4><p>Slot ini kosong. Simpan konfigurasi saat ini untuk mengisinya.</p>`;
    } catch (error) {
      this.elements.presetPreview.innerHTML = `<p class="error-text">Gagal mengambil info preset.</p>`;
    }
  }

  populatePresetSlots() {
    const currentSlot = this.elements.presetSlotSelect.value || 1;
    this.elements.presetSlotSelect.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `Slot Preset ${i}`;
      this.elements.presetSlotSelect.appendChild(option);
    }
    this.elements.presetSlotSelect.value = currentSlot;
    this.handlePresetSlotChange({ target: this.elements.presetSlotSelect });
  }

  showModal(modalName) {
    this.elements[modalName].backdrop.style.display = "flex";
  }
  hideModal(modalName) {
    this.elements[modalName].backdrop.style.display = "none";
  }

  showColorPicker(system, colorIndex) {
    this.state.activeSystemForModal = system;
    this.state.activeColorSlot = colorIndex;

    const systemState = this.state.appState[system];
    const isLightSystem = system !== "sein";
    const activeSideKey =
      this.state.activeSide === "kanan" ? "stateKanan" : "stateKiri";
    const sideState = isLightSystem ? systemState[activeSideKey] : null;

    const color = isLightSystem
      ? sideState.warna[colorIndex]
      : systemState.warna;

    this.state.originalColor = { r: color[0], g: color[1], b: color[2] };
    this.modalColorPicker.color.rgb = this.state.originalColor;
    this.showModal("colorPickerModal");
  }

  showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  showSavingIndicator() {
    this.elements.savingIndicator.style.display = "block";
  }
  hideSavingIndicator() {
    this.elements.savingIndicator.style.display = "none";
  }

  // --- FUNGSI-FUNGSI UNTUK EDITOR WELCOME ---

  async loadCustomWelcomeSequence() {
    try {
      const response = await fetch("/get-custom-welcome");
      if (!response.ok) throw new Error("Gagal memuat sekuens");
      const sequence = await response.json();
      this.state.customWelcomeSequence = sequence;
      this.renderWelcomeEditor();
    } catch (error) {
      console.error("Gagal memuat sekuens welcome kustom:", error);
      this.showToast("Gagal memuat sekuens kustom", "error");
    }
  }

  renderWelcomeEditor() {
    const container = this.elements.welcomeEditorContainer;
    container.innerHTML = "";

    const systems = [
      { name: "Alis", key: 0 },
      { name: "Shroud", key: 1 },
      { name: "Demon", key: 2 },
    ];

    systems.forEach((system) => {
      const row = document.createElement("div");
      row.className = "editor-row";
      row.innerHTML = `<label>${system.name}</label><div class="slots-container" data-system-key="${system.key}"></div>`;

      const slotsContainer = row.querySelector(".slots-container");

      const stepsForSystem = this.state.customWelcomeSequence.filter(
        (step) => step.targetSystem === system.key
      );

      stepsForSystem.forEach((step, index) => {
        slotsContainer.appendChild(this.createFilledSlotElement(step, index));
      });

      const addSlotBtn = document.createElement("div");
      addSlotBtn.className = "slot add-slot";
      addSlotBtn.textContent = "+";
      addSlotBtn.dataset.action = "add";
      slotsContainer.appendChild(addSlotBtn);

      container.appendChild(row);
    });
  }

  createFilledSlotElement(step) {
    const slot = document.createElement("div");
    slot.className = "slot filled";
    slot.dataset.action = "edit";

    const effect = this.config.effectModes.find(
      (m) => m.value === step.effectMode
    );
    const effectName = effect ? effect.name : "Unknown";

    let colorDotsHtml = "";
    if (effect && step.colors) {
      for (let i = 0; i < effect.colorSlots; i++) {
        const color = step.colors[i] || [0, 0, 0];
        colorDotsHtml += `<div class="slot-color-dot" style="background-color: rgb(${color.join(
          ","
        )});"></div>`;
      }
    }

    slot.innerHTML = `
          <div class="slot-effect-name">${effectName}</div>
          <div class="slot-colors-preview">${colorDotsHtml}</div>
          <small>${step.duration} ms</small>
      `;
    return slot;
  }

  handleSlotClick(e) {
    const target = e.target.closest(".slot");
    if (!target) return;

    const action = target.dataset.action;
    const slotsContainer = target.parentElement;
    const systemKey = parseInt(slotsContainer.dataset.systemKey);

    let stepIndex = -1;
    if (action === "edit") {
      const allSlotsInRow = Array.from(
        slotsContainer.querySelectorAll(".slot.filled")
      );
      const uiIndex = allSlotsInRow.indexOf(target);

      let count = 0;
      this.state.customWelcomeSequence.forEach((step, idx) => {
        if (step.targetSystem === systemKey) {
          if (count === uiIndex) {
            stepIndex = idx;
          }
          count++;
        }
      });
    }
    this.openEffectStepModal(systemKey, stepIndex);
  }

  openEffectStepModal(systemKey, stepIndex) {
    this.state.activeEditorContext = { systemKey, stepIndex };
    const modal = this.elements.effectStepModal;

    modal.effectSelect.innerHTML = this.config.effectModes
      .map((mode) => `<option value="${mode.value}">${mode.name}</option>`)
      .join("");

    if (stepIndex > -1) {
      // Mode Edit
      const step = this.state.customWelcomeSequence[stepIndex];
      modal.effectSelect.value = step.effectMode;
      modal.sideSelect.value = step.side;
      modal.durationInput.value = step.duration;
      modal.deleteBtn.style.display = "block";
    } else {
      // Mode Tambah
      modal.effectSelect.value = 0;
      modal.sideSelect.value = 0;
      modal.durationInput.value = 500;
      modal.deleteBtn.style.display = "none";
    }

    this.renderModalColorSlots();
    this.showModal("effectStepModal");
  }

  renderModalColorSlots() {
    const modal = this.elements.effectStepModal;
    const effectValue = parseInt(modal.effectSelect.value);
    const effect = this.config.effectModes.find((m) => m.value === effectValue);
    const numSlots = effect ? effect.colorSlots : 0;

    const container = modal.colorSlotsContainer;
    container.innerHTML = "";

    const existingStep =
      this.state.activeEditorContext.stepIndex > -1
        ? this.state.customWelcomeSequence[
            this.state.activeEditorContext.stepIndex
          ]
        : null;

    if (numSlots === 0) {
      container.innerHTML = "<small>Efek ini tidak menggunakan warna.</small>";
      return;
    }

    for (let i = 0; i < numSlots; i++) {
      let color = [255, 0, 0]; // Default color
      if (existingStep && existingStep.colors && existingStep.colors[i]) {
        color = existingStep.colors[i];
      }

      const colorSegment = document.createElement("div");
      colorSegment.className = "color-segment";
      colorSegment.style.backgroundColor = `rgb(${color.join(",")})`;
      colorSegment.dataset.colorIndex = i;
      colorSegment.dataset.colorValue = JSON.stringify(color);

      colorSegment.textContent = this.rgbToHex(color[0], color[1], color[2]);

      colorSegment.addEventListener("click", (e) => {
        const el = e.currentTarget;
        this.showColorPickerForEditor(el);
      });
      container.appendChild(colorSegment);
    }
  }

  showColorPickerForEditor(targetElement) {
    this.state.activeSystemForModal = "editor";
    this.state.activeColorSlot = targetElement;
    const currentColor = JSON.parse(targetElement.dataset.colorValue);
    this.state.originalColor = {
      r: currentColor[0],
      g: currentColor[1],
      b: currentColor[2],
    };
    this.modalColorPicker.color.rgb = this.state.originalColor;
    this.showModal("colorPickerModal");
  }

  handleEffectStepSave() {
    const { systemKey, stepIndex } = this.state.activeEditorContext;
    const modal = this.elements.effectStepModal;

    const colorSegments =
      modal.colorSlotsContainer.querySelectorAll(".color-segment");
    const colors = Array.from(colorSegments).map((el) =>
      JSON.parse(el.dataset.colorValue)
    );

    const newStep = {
      targetSystem: systemKey,
      side: parseInt(modal.sideSelect.value),
      effectMode: parseInt(modal.effectSelect.value),
      duration: parseInt(modal.durationInput.value),
      colors: colors,
    };

    if (stepIndex > -1) {
      this.state.customWelcomeSequence[stepIndex] = newStep;
    } else {
      this.state.customWelcomeSequence.push(newStep);
    }

    this.renderWelcomeEditor();
    this.hideModal("effectStepModal");
  }

  handleEffectStepDelete() {
    const { stepIndex } = this.state.activeEditorContext;
    if (stepIndex > -1) {
      this.state.customWelcomeSequence.splice(stepIndex, 1);
      this.renderWelcomeEditor();
    }
    this.hideModal("effectStepModal");
  }

  async saveCustomWelcomeSequence() {
    this.showSavingIndicator();
    try {
      await this.api.post(
        "/save-custom-welcome",
        JSON.stringify(this.state.customWelcomeSequence),
        false
      );
      this.showToast("Sekuens welcome kustom berhasil disimpan!", "success");
    } catch (error) {
      this.showToast("Gagal menyimpan sekuens", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  const app = new AeriApp(AppConfig);
  app.init();
});
