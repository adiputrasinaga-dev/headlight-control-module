/*
 * ===================================================================
 * AERI LIGHT v24.0 - MAIN APP LOGIC (INDEPENDENT SIDE CONTROL)
 * ===================================================================
 * Deskripsi Perubahan:
 * - ADD: Opsi target 'kiri', 'kanan', dan 'keduanya' untuk
 * kontrol lampu yang terisolasi atau simultan.
 * - UPDATE: Logika rendering dan pengiriman perintah disesuaikan
 * untuk menangani target sisi yang aktif.
 * - ADD: Mekanisme "Heartbeat" untuk deteksi koneksi yang andal.
 * - ADD: Mode Offline dengan data dummy saat aplikasi pertama dimuat.
 * ===================================================================
 */

class AeriApp {
  constructor(config) {
    this.state = {
      isConnected: false,
      activeTab: "Kontrol",
      activeSystem: "alis",
      activeSide: "keduanya", // 'kiri', 'kanan', atau 'keduanya'
      isSyncMode: false,
      activeSystemForModal: null,
      activeColorSlot: 0,
      originalColor: null,
      appState: null,
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

    this.throttledSendColorPreview = this.throttle(this.sendColorPreview, 100);
    this.throttledSendControlPreview = this.throttle(
      this.sendControlPreview,
      100
    );
  }

  generateDefaultState() {
    const defaultSideState = {
      kecerahan: 200,
      warna: [
        [255, 0, 0],
        [0, 0, 255],
        [0, 255, 0],
      ],
    };
    const defaultLightState = {
      mode: 0,
      kecepatan: 50,
      stateKiri: { ...defaultSideState },
      stateKanan: { ...defaultSideState },
    };
    return {
      masterPowerState: true,
      alis: { ...defaultLightState },
      shroud: { ...defaultLightState },
      demon: { ...defaultLightState },
      sein: { mode: 0, kecepatan: 50, warna: [255, 100, 0] },
      ledCounts: { alis: 30, shroud: 30, demon: 1, sein: 30 },
      welcome: { mode: 0, durasi: 5 },
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  init() {
    this.state.appState = this.generateDefaultState();
    this.cacheInitialElements();
    this.attachEventListeners();
    this.initColorPicker();
    this.renderFullUI();
    this.connectWebSocket();
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
      // ensure close triggers onclose
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

  startHeartbeat() {
    this.resetHeartbeat();
  }

  stopHeartbeat() {
    clearTimeout(this.heartbeatTimer);
  }

  resetHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      console.log("Heartbeat failed. Closing connection.");
      this.socket.close();
    }, 10000);
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
  }

  initColorPicker() {
    this.modalColorPicker = new iro.ColorPicker(
      this.elements.colorPickerModal.container,
      {
        width: 280,
        color: "#ff0000",
        borderWidth: 1,
        borderColor: "#fff",
        layout: [
          { component: iro.ui.Wheel },
          { component: iro.ui.Slider, options: { sliderType: "value" } },
        ],
      }
    );
    this.modalColorPicker.on("color:change", (color) => {
      this.throttledSendColorPreview(color.rgb);
    });
  }

  createApiHandler() {
    const post = async (endpoint, body) => {
      if (!this.state.isConnected) {
        this.showToast(
          "Mode Offline: Perubahan hanya tersimpan di pratinjau",
          "info"
        );
        return Promise.resolve({ ok: true });
      }
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        console.error(`API POST to ${endpoint} failed:`, error);
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
    this.renderSystem("sein");
    this.renderSettings();
    this.updateSyncPanelHighlight();
    this.populatePresetSlots();
  }

  renderSystem(system) {
    const container = this.elements.controlContainers[system];
    if (!container || !this.state.appState[system]) return;

    const state = this.state.appState[system];
    const isLightSystem = system !== "sein";
    const configModes =
      this.config && this.config.modes && this.config.modes[system]
        ? this.config.modes[system]
        : [];

    // Tentukan state sisi mana yang akan ditampilkan
    const sideState =
      this.state.activeSide === "kanan" && isLightSystem
        ? state.stateKanan
        : state.stateKiri;

    let html = `
      <div class="control-group">
        <label for="mode-${system}">Mode Lampu</label>
        <select id="mode-${system}" class="cyber-input">
          ${configModes
            .map(
              (mode, index) =>
                `<option value="${index}" ${
                  state.mode === index ? "selected" : ""
                }>${mode}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="effect-details-wrapper">`;

    if (isLightSystem) {
      html += `
        <div class="control-group">
            <div class="slider-label-container">
                <label for="brightness-${system}">Kecerahan</label>
                <span id="brightness-value-${system}" class="panel-info">${Math.round(
        (sideState.kecerahan / 255) * 100
      )}%</span>
            </div>
            <input type="range" id="brightness-${system}" min="0" max="100" value="${Math.round(
        (sideState.kecerahan / 255) * 100
      )}">
        </div>`;
    }

    html += `
      <div class="control-group">
        <div class="slider-label-container">
            <label for="speed-${system}">Kecepatan</label>
            <span id="speed-value-${system}" class="panel-info">${
      state.kecepatan
    }%</span>
        </div>
        <input type="range" id="speed-${system}" min="0" max="100" value="${
      state.kecepatan
    }">
      </div>
      <div class="control-group">
        <label>Warna</label>
        <div class="color-bar-container">
          ${
            isLightSystem
              ? sideState.warna
                  .map((color, index) => this.renderColorSegment(system, index))
                  .join("")
              : this.renderColorSegment(system, 0)
          }
        </div>
      </div>
    </div>`;

    container.innerHTML = html;
    this.attachDynamicEventListeners(system);
  }

  renderColorSegment(system, index) {
    const state = this.state.appState[system];
    const isLightSystem = system !== "sein";
    const sideState =
      this.state.activeSide === "kanan" && isLightSystem
        ? state.stateKanan
        : state.stateKiri;
    const color = isLightSystem ? sideState.warna[index] : state.warna;
    const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    return `<div class="color-segment" style="background-color: ${rgb};" data-system="${system}" data-color-index="${index}"></div>`;
  }

  renderSettings() {
    if (!this.state.appState) return;
    const { ledCounts, welcome } = this.state.appState;
    Object.keys(ledCounts).forEach((key) => {
      if (this.elements.ledCountInputs[key]) {
        this.elements.ledCountInputs[key].value = ledCounts[key];
      }
    });
    const welcomeModes =
      this.config && this.config.modes && this.config.modes.welcome
        ? this.config.modes.welcome
        : [];
    this.elements.welcomeModeSelect.innerHTML = welcomeModes
      .map(
        (mode, index) =>
          `<option value="${index}" ${
            welcome.mode === index ? "selected" : ""
          }>${mode}</option>`
      )
      .join("");
    this.elements.welcomeDurationInput.value = welcome.durasi;
  }

  attachDynamicEventListeners(system) {
    const modeEl = document.getElementById(`mode-${system}`);
    if (modeEl)
      modeEl.addEventListener("change", (e) =>
        this.handleControlSave(system, "mode", e.target.value)
      );

    const speedEl = document.getElementById(`speed-${system}`);
    if (speedEl) {
      speedEl.addEventListener("change", (e) =>
        this.handleControlSave(system, "kecepatan", e.target.value)
      );
    }

    if (system !== "sein") {
      const brightnessEl = document.getElementById(`brightness-${system}`);
      if (brightnessEl) {
        brightnessEl.addEventListener("change", (e) =>
          this.handleControlSave(system, "kecerahan", e.target.value)
        );
      }
    }

    this.elements.controlContainers[system]
      .querySelectorAll(".color-segment")
      .forEach((el) => {
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
    this.renderFullUI();
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
    if (this.elements.mobileMenu.classList.contains("open")) {
      this.toggleMobileMenu();
    }
  }

  toggleMobileMenu() {
    this.elements.mobileMenu.classList.toggle("open");
  }

  handleSystemChange(e) {
    this.state.activeSystem = e.target.value;
    this.elements.sideSelector.style.display =
      this.state.activeSystem === "sein" ? "none" : "flex";
    Object.values(this.elements.controlContainers).forEach(
      (c) => (c.style.display = "none")
    );
    this.elements.controlContainers[this.state.activeSystem].style.display =
      "block";
    this.renderSystem(this.state.activeSystem); // Re-render untuk sisi yang benar
  }

  handleSideChange(e) {
    this.state.activeSide = e.target.value;
    this.renderSystem(this.state.activeSystem); // Re-render untuk menampilkan state sisi yang baru
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

  handleControlSave(system, key, value) {
    const systemsToUpdate =
      this.state.isSyncMode && ["alis", "shroud", "demon"].includes(system)
        ? ["alis", "shroud", "demon"]
        : [system];
    const payload = { [key]: parseInt(value), target: this.state.activeSide };

    this.showSavingIndicator();
    try {
      for (const sys of systemsToUpdate) {
        this.api.post(`/set-mode-${sys}`, payload);
      }
    } catch (error) {
      this.showToast("Gagal menyimpan", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handleColorPickerSave() {
    this.hideModal("colorPickerModal");
    const { activeSystemForModal, activeColorSlot } = this.state;
    const newColor = this.modalColorPicker.color.rgb;
    const payload = {
      r: newColor.r,
      g: newColor.g,
      b: newColor.b,
      colorIndex: activeColorSlot,
      target: this.state.activeSide,
    };
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
    // Tidak perlu rollback karena preview tidak lagi mengubah state utama
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
    const state = this.state.appState[system];
    const sideState =
      this.state.activeSide === "kanan" && system !== "sein"
        ? state.stateKanan
        : state.stateKiri;
    const color = system === "sein" ? state.warna : sideState.warna[colorIndex];
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
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  const app = new AeriApp(window.AppConfig);
  app.init();
});
