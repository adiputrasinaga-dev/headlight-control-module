// AERI LIGHT v16.5 - Dynamic Effects & UI Unification
document.addEventListener("DOMContentLoaded", () => {
  let appState = {};
  let isSyncEnabled = false;
  let isDemoMode = false;
  let activeSystemForModal = null;
  let activeColorSlot = 1; // 1, 2, or 3
  let activeToastTimer = null;

  const modeOptions = {
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
  };

  const elements = {
    toastContainer: document.getElementById("toast-container"),
    header: {
      statusIcon: document.getElementById("statusIcon"),
      statusText: document.getElementById("statusText"),
    },
    nav: {
      hamburgerBtn: document.getElementById("hamburger-btn"),
      mobileMenu: document.getElementById("mobile-menu"),
      tabButtons: document.querySelectorAll(".tab-btn, .mobile-nav-link"),
      tabContents: document.querySelectorAll(".tab-content"),
    },
    kontrol: {
      syncSwitch: document.getElementById("syncSwitch"),
      systemSelector: document.querySelectorAll('input[name="controlTarget"]'),
      controlSets: {
        alis: document.getElementById("alis-controls"),
        shroud: document.getElementById("shroud-controls"),
        demon: document.getElementById("demon-controls"),
        sein: document.getElementById("sein-controls"),
      },
      alis: {
        mode: document.getElementById("alisMode"),
        brightness: document.getElementById("alisBrightness"),
        brightnessValue: document.getElementById("alisBrightnessValue"),
        speed: document.getElementById("alisSpeed"),
        speedValue: document.getElementById("alisSpeedValue"),
      },
      shroud: {
        mode: document.getElementById("shroudMode"),
        brightness: document.getElementById("shroudBrightness"),
        brightnessValue: document.getElementById("shroudBrightnessValue"),
        speed: document.getElementById("shroudSpeed"),
        speedValue: document.getElementById("shroudSpeedValue"),
      },
      demon: {
        mode: document.getElementById("demonMode"),
        brightness: document.getElementById("demonBrightness"),
        brightnessValue: document.getElementById("demonBrightnessValue"),
        speed: document.getElementById("demonSpeed"),
        speedValue: document.getElementById("demonSpeedValue"),
      },
      sein: {
        modeSettings: document.getElementById("seinModeSettings"),
        speed: document.getElementById("seinSpeed"),
        speedValue: document.getElementById("seinSpeedValue"),
      },
    },
    pengaturan: {
      ledTarget: document.querySelectorAll('input[name="ledTarget"]'),
      ledCount: document.getElementById("ledCount"),
      btnSaveLedCount: document.getElementById("btnSaveLedCount"),
      btnPreviewLedCount: document.getElementById("btnPreviewLedCount"),
      presetSlot: document.getElementById("presetSlot"),
      presetName: document.getElementById("presetName"),
      btnSavePreset: document.getElementById("btnSavePreset"),
      btnLoadPreset: document.getElementById("btnLoadPreset"),
      btnReset: document.getElementById("btnReset"),
    },
    welcome: {
      mode: document.getElementById("welcomeMode"),
      duration: document.getElementById("welcomeDuration"),
      btnPreview: document.getElementById("btnPreviewWelcome"),
      btnSave: document.getElementById("btnSaveWelcome"),
    },
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
      previewBox: document.getElementById("modalColorPreview"),
      brightnessSlider: document.getElementById("modalBrightnessSlider"),
      hexInput: document.getElementById("modalHexInput"),
      redInput: document.getElementById("modalRedInput"),
      greenInput: document.getElementById("modalGreenInput"),
      blueInput: document.getElementById("modalBlueInput"),
    },
  };

  const modalColorPicker = new iro.ColorPicker("#modalColorPickerContainer", {
    width: 280,
    color: "#ff0000",
    borderWidth: 1,
    borderColor: "var(--border-color)",
    layout: [{ component: iro.ui.Wheel }],
  });

  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function showToast(message, type = "success") {
    const container = elements.toastContainer;
    if (activeToastTimer) clearTimeout(activeToastTimer);
    let toastElement = container.querySelector(".toast");
    if (toastElement && type === "success") {
      toastElement.className = `toast ${type}`;
      toastElement.textContent = message;
      toastElement.style.animation = "none";
      toastElement.offsetHeight;
      toastElement.style.animation =
        "slideInFadeOut 4s ease-in-out forwards, shake 0.5s ease";
    } else {
      if (toastElement && type !== "success") toastElement.remove();
      toastElement = document.createElement("div");
      toastElement.className = `toast ${type}`;
      toastElement.textContent = message;
      toastElement.style.animation = "slideInFadeOut 4s ease-in-out forwards";
      container.appendChild(toastElement);
    }
    activeToastTimer = setTimeout(() => {
      if (toastElement && toastElement.parentElement) toastElement.remove();
      activeToastTimer = null;
    }, 4000);
  }

  function generateDummyState() {
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
  }

  (function addBrightnessBadgeAndSync() {
    const slider = elements?.colorPickerModal?.brightnessSlider;
    if (slider && slider.parentElement) {
      let span = slider.parentElement.querySelector(".brightness-value");
      if (!span) {
        slider.parentElement.style.display = "flex";
        slider.parentElement.style.alignItems = "center";
        slider.parentElement.style.gap = "10px";
        span = document.createElement("span");
        span.className = "brightness-value";
        span.textContent = slider.value + "%";
        slider.parentElement.appendChild(span);
      }
      elements.colorPickerModal.brightnessValue = span;
      const updateSliderUI = (valPercent) => {
        span.textContent = valPercent + "%";
        const col = modalColorPicker.color.rgb;
        const rgbStr = `rgb(${col.r},${col.g},${col.b})`;
        slider.style.background = `linear-gradient(to right,#000 0%,${rgbStr} ${valPercent}%,var(--secondary-accent) ${valPercent}%,var(--secondary-accent) 100%)`;
      };
      slider.addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        const hsv = modalColorPicker.color.hsv;
        modalColorPicker.color.hsv = { h: hsv.h, s: hsv.s, v };
        updateSliderUI(v);
      });
      modalColorPicker.on("color:change", (c) => {
        const v = Math.round(c.hsv.v);
        slider.value = v;
        updateSliderUI(v);
      });
      updateSliderUI(slider.value);
    }
  })();

  function populateDropdowns() {
    const createOptions = (opts) =>
      opts
        .map((opt) => `<option value="${opt.value}">${opt.name}</option>`)
        .join("");
    elements.kontrol.alis.mode.innerHTML = createOptions(modeOptions.dynamic);
    elements.kontrol.shroud.mode.innerHTML = createOptions(modeOptions.dynamic);
    elements.kontrol.demon.mode.innerHTML = createOptions(modeOptions.dynamic);
    elements.kontrol.sein.modeSettings.innerHTML = createOptions(
      modeOptions.sein
    );
    elements.welcome.mode.innerHTML = createOptions(modeOptions.welcome);
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    );
  }

  function updateDynamicColorPreviews(systemName) {
    const selectedModeValue = elements.kontrol[systemName].mode.value;
    const mode = modeOptions.dynamic.find((m) => m.value == selectedModeValue);
    if (!mode) return;

    const slots = mode.colorSlots;
    for (let i = 1; i <= 3; i++) {
      const group = document.getElementById(
        `${systemName}-dynamic-color-group-${i}`
      );
      if (!group) continue;
      const previewBox = document.getElementById(
        `${systemName}ColorPreviewDynamic${i}`
      );
      const hexSpan = document.getElementById(
        `${systemName}ColorHexDynamic${i}`
      );

      if (i <= slots) {
        group.style.display = "block";
        const colorKey = i === 1 ? "warna" : `warna${i}`;
        const color = appState[systemName].stateKiri[colorKey] || [0, 0, 0];
        const hex = rgbToHex(color[0], color[1], color[2]);
        previewBox.style.backgroundColor = hex;
        hexSpan.textContent = hex;
      } else {
        group.style.display = "none";
      }
    }
  }

  function updateEffectTypeUI(systemName) {
    const isStatic =
      document.querySelector(`input[name="${systemName}EffectType"]:checked`)
        .value === "static";
    const controlSet = document.getElementById(`${systemName}-controls`);
    controlSet.querySelector(".static-color-section").style.display = isStatic
      ? "block"
      : "none";
    controlSet.querySelector(".dynamic-controls").style.display = isStatic
      ? "none"
      : "flex";

    if (!isStatic) {
      updateDynamicColorPreviews(systemName);
    }
  }

  function renderUI(state) {
    appState = state;
    document
      .querySelectorAll("input, select, button")
      .forEach((el) => (el.disabled = false));

    const renderLightSystem = (systemName) => {
      const config = state[systemName];
      const ui = elements.kontrol[systemName];
      if (!config || !ui) return;

      ui.brightness.value = config.brightness;
      ui.brightnessValue.textContent = `${config.brightness}%`;
      ui.speed.value = config.speed;
      ui.speedValue.textContent = `${config.speed}%`;

      const isStatic = config.stateKiri.modeEfek === 0;
      document.querySelector(
        `input[name="${systemName}EffectType"][value=${
          isStatic ? "static" : "dynamic"
        }]`
      ).checked = true;

      const staticPreview = document.getElementById(
        `${systemName}ColorPreviewStatic`
      );
      const staticHex = document.getElementById(`${systemName}ColorHexStatic`);
      const staticColor = config.stateKiri.warna;
      const staticHexString = rgbToHex(
        staticColor[0],
        staticColor[1],
        staticColor[2]
      );
      staticPreview.style.backgroundColor = staticHexString;
      staticHex.textContent = staticHexString;

      updateEffectTypeUI(systemName);
      ui.mode.value = config.stateKiri.modeEfek;
      updateDynamicColorPreviews(systemName);
    };

    ["alis", "shroud", "demon"].forEach(renderLightSystem);

    const seinConfig = state.sein;
    const seinUi = elements.kontrol.sein;
    if (seinConfig && seinUi) {
      const seinColorPreview = document.getElementById(`seinColorPreview`);
      const seinColorHex = document.getElementById(`seinColorHex`);
      if (seinColorPreview && seinColorHex) {
        const currentColor = seinConfig.warna;
        const hexString = rgbToHex(
          currentColor[0],
          currentColor[1],
          currentColor[2]
        );
        seinColorPreview.style.backgroundColor = hexString;
        seinColorHex.textContent = hexString.toUpperCase();
      }
      seinUi.modeSettings.value = seinConfig.mode;
      seinUi.speed.value = seinConfig.speed;
      seinUi.speedValue.textContent = `${seinConfig.speed}%`;
    }
    const activeLedTarget = document.querySelector(
      'input[name="ledTarget"]:checked'
    ).value;
    elements.pengaturan.ledCount.value = state[activeLedTarget]
      ? state[activeLedTarget].ledCount
      : 30;
    elements.welcome.mode.value = state.global.modeWelcome;
    elements.welcome.duration.value = state.global.durasiWelcome;
    const activeSystem = document.querySelector(
      'input[name="controlTarget"]:checked'
    ).value;
    Object.values(elements.kontrol.controlSets).forEach((el) =>
      el.classList.remove("active")
    );
    if (elements.kontrol.controlSets[activeSystem])
      elements.kontrol.controlSets[activeSystem].classList.add("active");
  }

  async function postData(endpoint, body) {
    if (isDemoMode) {
      showToast("Pengaturan diubah (Mode Uji)", "info");
      console.log("DEMO MODE:", endpoint, body);
      return Promise.resolve("OK (Mode Uji)");
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      return await response.text();
    } catch (error) {
      showToast(`Gagal terhubung: ${error.message}`, "error");
      throw error;
    }
  }

  function setupEventListeners() {
    elements.nav.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));
        document
          .querySelectorAll(".tab-btn, .mobile-nav-link")
          .forEach((b) => b.classList.remove("active"));
        document.getElementById(`tab${tabId}`).classList.add("active");
        btn.classList.add("active");
        elements.nav.mobileMenu.classList.remove("open");
      });
    });
    elements.nav.hamburgerBtn.addEventListener("click", () =>
      elements.nav.mobileMenu.classList.toggle("open")
    );
    elements.kontrol.systemSelector.forEach((radio) =>
      radio.addEventListener("change", () => renderUI(appState))
    );
    elements.kontrol.syncSwitch.addEventListener("change", (e) => {
      isSyncEnabled = e.target.checked;
      showToast(
        `Sinkronisasi ${isSyncEnabled ? "diaktifkan" : "dinonaktifkan"}`,
        "info"
      );
    });

    const systems = ["alis", "shroud", "demon"];
    systems.forEach((systemName) => {
      const ui = elements.kontrol[systemName];

      document
        .querySelectorAll(`input[name="${systemName}EffectType"]`)
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            updateEffectTypeUI(systemName);
            if (radio.value === "static") {
              postData(`/set-mode-${systemName}`, { mode: 0 });
            }
          });
        });

      document
        .getElementById(`${systemName}ColorPreviewStatic`)
        .addEventListener("click", () => {
          activeSystemForModal = systemName;
          activeColorSlot = 1;
          const color = appState[systemName].stateKiri.warna;
          modalColorPicker.color.set({ r: color[0], g: color[1], b: color[2] });
          elements.colorPickerModal.backdrop.style.display = "flex";
        });

      for (let i = 1; i <= 3; i++) {
        document
          .getElementById(`${systemName}ColorPreviewDynamic${i}`)
          .addEventListener("click", () => {
            activeSystemForModal = systemName;
            activeColorSlot = i;
            const colorKey = i === 1 ? "warna" : `warna${i}`;
            const color = appState[systemName].stateKiri[colorKey];
            modalColorPicker.color.set({
              r: color[0],
              g: color[1],
              b: color[2],
            });
            elements.colorPickerModal.backdrop.style.display = "flex";
          });
      }

      const debouncedUpdate = debounce(() => {
        const isStatic =
          document.querySelector(
            `input[name="${systemName}EffectType"]:checked`
          ).value === "static";
        if (isStatic) return; // Jangan kirim update jika statis, karena warna dihandle modal

        const payload = {
          mode: ui.mode.value,
          brightness: ui.brightness.value,
          speed: ui.speed.value,
        };
        postData(`/set-mode-${systemName}`, payload);
      }, 500);

      ui.mode.addEventListener("change", () => {
        updateDynamicColorPreviews(systemName);
        debouncedUpdate();
      });
      ui.brightness.addEventListener("input", () => {
        ui.brightnessValue.textContent = `${ui.brightness.value}%`;
        debouncedUpdate();
      });
      ui.speed.addEventListener("input", () => {
        ui.speedValue.textContent = `${ui.speed.value}%`;
        debouncedUpdate();
      });
    });

    elements.colorPickerModal.btnSimpan.addEventListener("click", () => {
      if (!activeSystemForModal) return;
      const newColor = modalColorPicker.color.rgb;
      let payload = {};

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
          const r_key = activeColorSlot === 1 ? "r" : `r${activeColorSlot}`;
          const g_key = activeColorSlot === 1 ? "g" : `g${activeColorSlot}`;
          const b_key = activeColorSlot === 1 ? "b" : `b${activeColorSlot}`;
          payload[r_key] = newColor.r;
          payload[g_key] = newColor.g;
          payload[b_key] = newColor.b;
        }
      }

      postData(`/set-mode-${activeSystemForModal}`, payload).then(() => {
        showToast(
          `${activeSystemForModal.toUpperCase()} warna diperbarui`,
          "success"
        );
        initializeApp();
        elements.colorPickerModal.backdrop.style.display = "none";
      });
    });

    elements.colorPickerModal.btnBatal.addEventListener("click", () => {
      elements.colorPickerModal.backdrop.style.display = "none";
    });

    // Listeners untuk Sein dan Pengaturan
    document
      .getElementById("seinColorPreview")
      .addEventListener("click", () => {
        activeSystemForModal = "sein";
        activeColorSlot = 1;
        const color = appState.sein.warna;
        modalColorPicker.color.set({ r: color[0], g: color[1], b: color[2] });
        elements.colorPickerModal.backdrop.style.display = "flex";
      });

    // ... sisa event listeners untuk pengaturan, reset, preset ...
    elements.pengaturan.ledTarget.forEach((radio) =>
      radio.addEventListener("change", (e) => {
        elements.pengaturan.ledCount.value = appState[e.target.value].ledCount;
      })
    );
    elements.pengaturan.btnSaveLedCount.addEventListener("click", () => {
      const target = document.querySelector(
        'input[name="ledTarget"]:checked'
      ).value;
      const count = elements.pengaturan.ledCount.value;
      postData("/set-config", { ledTarget: target, ledCount: count }).then(() =>
        showToast("Jumlah LED disimpan", "success")
      );
    });
    elements.pengaturan.btnPreviewLedCount.addEventListener("click", () => {
      const target = document.querySelector(
        'input[name="ledTarget"]:checked'
      ).value;
      const count = elements.pengaturan.ledCount.value;
      postData("/preview-led-count", { ledTarget: target, ledCount: count });
    });
    elements.welcome.btnSave.addEventListener("click", () => {
      const mode = elements.welcome.mode.value;
      const duration = elements.welcome.duration.value;
      postData("/set-mode-welcome", { mode, durasi: duration }).then(() =>
        showToast("Animasi Welcome disimpan", "success")
      );
    });
    elements.welcome.btnPreview.addEventListener("click", () =>
      postData("/set-mode-welcome", { preview: 1 })
    );
    elements.pengaturan.btnReset.addEventListener("click", () => {
      elements.resetModal.backdrop.style.display = "flex";
    });
    elements.resetModal.cancelBtn.addEventListener("click", () => {
      elements.resetModal.backdrop.style.display = "none";
      elements.resetModal.input.value = "";
      elements.resetModal.confirmBtn.disabled = true;
    });
    elements.resetModal.input.addEventListener("input", (e) => {
      elements.resetModal.confirmBtn.disabled = e.target.value !== "RESET";
    });
    elements.resetModal.confirmBtn.addEventListener("click", () => {
      postData("/reset-to-default").then(() => {
        showToast(
          "Perangkat berhasil direset. Halaman akan dimuat ulang.",
          "success"
        );
        setTimeout(() => window.location.reload(), 5000);
      });
    });
  }

  async function initializeApp() {
    populateDropdowns();
    if (!document.body.classList.contains("event-listeners-attached")) {
      setupEventListeners();
      document.body.classList.add("event-listeners-attached");
    }
    try {
      const initialState = await fetch("/get-state").then((res) => {
        if (!res.ok) throw new Error("Connection failed");
        return res.json();
      });
      renderUI(initialState);
      // await fetchPresets();
      elements.header.statusIcon.className = "connected";
      elements.header.statusText.textContent = "Connected";
    } catch (error) {
      console.error("Initialization failed, entering demo mode:", error);
      isDemoMode = true;
      const dummyState = generateDummyState();
      renderUI(dummyState);
      elements.header.statusIcon.className = "testing";
      elements.header.statusText.textContent = "Mode Uji";
      showToast("Gagal terhubung. Aplikasi berjalan dalam Mode Uji.", "info");
    }
  }

  initializeApp();
});
