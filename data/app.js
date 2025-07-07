/*
 * ===================================================================
 * AERI LIGHT v21.0 - MAIN APP LOGIC (FINAL BUG FIXES)
 * ===================================================================
 * Deskripsi Perubahan:
 * - UX: handlePresetSlotChange() sekarang menampilkan ringkasan
 * konten preset yang diterima dari API baru.
 * - FIX: Menambahkan error handling yang lebih baik dengan
 * membungkus loop pengiriman data sinkronisasi dalam try...catch.
 * - REFACTOR: Menggunakan class AeriApp untuk struktur yang lebih
 * baik dan mempertahankan koneksi WebSocket.
 * ===================================================================
 */

class AeriApp {
  constructor(config) {
    this.config = config;
    this.state = {
      isConnected: false,
      activeTab: "Kontrol",
      activeSystem: "alis",
      isSyncMode: false,
      activeSystemForModal: null,
      activeColorSlot: 0,
      appState: null,
    };
    this.elements = {};
    this.modalColorPicker = null;
    this.socket = null;
    this.api = this.createApiHandler();
  }

  // ===================================================================
  // INITIALIZATION & SETUP
  // ===================================================================

  init() {
    this.cacheInitialElements();
    this.attachEventListeners();
    this.initColorPicker();
    this.connectWebSocket();
  }

  connectWebSocket() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connection established.");
      this.setConnectionStatus(true);
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed. Retrying in 3 seconds...");
      this.setConnectionStatus(false);
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.socket.onmessage = (event) => {
      try {
        const newState = JSON.parse(event.data);
        console.log("State update received via WebSocket:", newState);
        this.state.appState = newState;
        this.renderFullUI();
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.socket.close();
    };
  }

  cacheInitialElements() {
    this.elements = {
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
    this.elements.syncSwitch.addEventListener("change", (e) =>
      this.handleSyncModeChange(e)
    );
    this.elements.colorPickerModal.saveBtn.addEventListener("click", () =>
      this.handleColorPickerSave()
    );
    this.elements.colorPickerModal.cancelBtn.addEventListener("click", () =>
      this.hideModal("colorPickerModal")
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
  }

  createApiHandler() {
    const post = async (endpoint, body) => {
      if (!this.state.isConnected && endpoint !== "/reset-factory") {
        this.showToast("Perangkat tidak terhubung", "error");
        return Promise.reject(new Error("Device not connected"));
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
      this.showToast(
        "Koneksi terputus. Mencoba menyambung kembali...",
        "error"
      );
    } else {
      this.showToast("Terhubung ke AERI LIGHT", "success");
    }
  }

  renderFullUI() {
    if (!this.state.appState) return;
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
                <span class="panel-info">${state.stateKiri.kecerahan}</span>
            </div>
            <input type="range" id="brightness-${system}" min="0" max="255" value="${state.stateKiri.kecerahan}">
        </div>`;
    }

    html += `
      <div class="control-group">
        <div class="slider-label-container">
            <label for="speed-${system}">Kecepatan</label>
            <span class="panel-info">${state.kecepatan}</span>
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
              ? state.stateKiri.warna
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
    const color = isLightSystem ? state.stateKiri.warna[index] : state.warna;
    const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    return `<div class="color-segment" style="background-color: ${rgb};" data-system="${system}" data-color-index="${index}"></div>`;
  }

  renderSettings() {
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
    const speedEl = document.getElementById(`speed-${system}`);
    if (modeEl)
      modeEl.addEventListener("change", (e) =>
        this.handleControlChange(system, "mode", e.target.value)
      );
    if (speedEl)
      speedEl.addEventListener("input", (e) =>
        this.handleControlChange(system, "kecepatan", e.target.value)
      );

    if (system !== "sein") {
      const brightnessEl = document.getElementById(`brightness-${system}`);
      if (brightnessEl)
        brightnessEl.addEventListener("input", (e) =>
          this.handleControlChange(system, "kecerahan", e.target.value)
        );
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
    Object.values(this.elements.controlContainers).forEach(
      (c) => (c.style.display = "none")
    );
    this.elements.controlContainers[this.state.activeSystem].style.display =
      "block";
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

  async handleControlChange(system, key, value) {
    const systemsToUpdate =
      this.state.isSyncMode && ["alis", "shroud", "demon"].includes(system)
        ? ["alis", "shroud", "demon"]
        : [system];
    const payload = { [key]: parseInt(value) };
    this.showSavingIndicator();
    try {
      for (const sys of systemsToUpdate) {
        await this.api.post(`/set-mode-${sys}`, payload);
      }
    } catch (error) {
      this.showToast("Gagal menyimpan", "error");
    } finally {
      this.hideSavingIndicator();
    }
  }

  async handleColorPickerSave() {
    const { activeSystemForModal, activeColorSlot } = this.state;
    if (!activeSystemForModal) return;
    const newColor = this.modalColorPicker.color.rgb;
    const payload = { r: newColor.r, g: newColor.g, b: newColor.b };
    if (activeSystemForModal !== "sein") {
      payload.colorIndex = activeColorSlot;
    }
    const systemsToUpdate =
      this.state.isSyncMode &&
      ["alis", "shroud", "demon"].includes(activeSystemForModal)
        ? ["alis", "shroud", "demon"]
        : [activeSystemForModal];
    this.hideModal("colorPickerModal");
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
    const color =
      system === "sein" ? state.warna : state.stateKiri.warna[colorIndex];
    this.modalColorPicker.color.rgb = { r: color[0], g: color[1], b: color[2] };
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

document.addEventListener("DOMContentLoaded", () => {
  // Ganti window.AppConfig dengan window.APP_CONFIG jika nama variabel globalnya seperti itu
  const app = new AeriApp(window.AppConfig || {});
  app.init();
});
