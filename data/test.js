// --- FUNGSI UTAMA RENDER UI ---
    renderUI() {
      // Pastikan ada state yang bisa dirender
      if (!this.state.appState || Object.keys(this.state.appState).length === 0) return;
      
      // Nonaktifkan semua kontrol jika dalam mode demo, kecuali yang ada di dalam modal
      document.querySelectorAll("input, select, button").forEach((el) => {
        if (!el.closest(".modal-content")) el.disabled = this.state.isDemoMode;
      });

      // Render setiap sistem lampu (alis, shroud, demon)
      this.config.systems.forEach((sys) => this.renderSystem(sys));
      
      // Render sistem sein
      this.renderSein();
      
      // Render pengaturan lain dari state global
      this.renderWelcomeSettings();
      this.renderLedCountSettings();

      // Tampilkan panel kontrol yang aktif
      this.renderActiveControl();
    },

    // --- FUNGSI RENDER SPESIFIK ---

    /**
     * Merender UI untuk satu sistem lampu (alis, shroud, atau demon).
     * @param {string} sys - Kunci sistem (e.g., 'alis').
     */
    renderSystem(sys) {
      const config = this.state.appState[sys];
      const elements = this.elements[sys];
      if (!config || !elements || Object.keys(elements).length === 0) return;

      // Perbarui nilai slider kecerahan dan kecepatan
      elements.brightness.value = config.brightness;
      elements.brightnessValue.textContent = `${config.brightness}%`;
      elements.speed.value = config.speed;
      elements.speedValue.textContent = `${config.speed}%`;

      // Tentukan tipe efek (statis atau dinamis) dan perbarui radio button
      const isStatic = config.stateKiri.modeEfek === 0;
      const staticRadio = document.getElementById(`${sys}EffectTypeStatic`);
      const dynamicRadio = document.getElementById(`${sys}EffectTypeDynamic`);
      if (staticRadio) staticRadio.checked = isStatic;
      if (dynamicRadio) dynamicRadio.checked = !isStatic;
      this.updateEffectTypeUI(sys);

      // Perbarui dropdown mode efek
      elements.mode.value = config.stateKiri.modeEfek;
      
      // Perbarui pratinjau warna statis
      const staticColor = config.stateKiri.warna;
      const staticHex = this.util.rgbToHex(staticColor[0], staticColor[1], staticColor[2]);
      elements.colorPreviewStatic.style.backgroundColor = staticHex;
      elements.colorHexStatic.textContent = staticHex;

      // Perbarui pratinjau warna dinamis
      this.updateDynamicColorPreviews(sys, config.stateKiri.modeEfek);
    },

    /**
     * Merender UI khusus untuk kontrol lampu sein.
     */
    renderSein() {
      const seinConfig = this.state.appState.sein;
      const seinElements = this.elements.sein;
      if (!seinConfig || !seinElements.controls) return;

      // Perbarui dropdown mode, slider kecepatan, dan pratinjau warna
      seinElements.modeSettings.value = seinConfig.mode;
      seinElements.speed.value = seinConfig.speed;
      seinElements.speedValue.textContent = `${seinConfig.speed}%`;

      const color = seinConfig.warna;
      const hex = this.util.rgbToHex(color[0], color[1], color[2]);
      seinElements.colorPreview.style.backgroundColor = hex;
      seinElements.colorHex.textContent = hex;
    },
    
    /**
     * Merender UI untuk pengaturan Welcome Animation.
     */
    renderWelcomeSettings() {
        const welcomeConfig = this.state.appState.global;
        const welcomeModeSelect = document.getElementById('welcomeMode');
        const welcomeDurationInput = document.getElementById('welcomeDuration');
        if (welcomeConfig && welcomeModeSelect && welcomeDurationInput) {
            welcomeModeSelect.value = welcomeConfig.modeWelcome;
            welcomeDurationInput.value = welcomeConfig.durasiWelcome;
        }
    },

    /**
     * Merender UI untuk pengaturan Jumlah LED.
     */
    renderLedCountSettings() {
        const ledTarget = document.querySelector('input[name="ledTarget"]:checked')?.value;
        const ledCountInput = document.getElementById('ledCount');
        if (ledTarget && ledCountInput && this.state.appState[ledTarget]) {
            ledCountInput.value = this.state.appState[ledTarget].ledCount;
        }
    },


    // --- FUNGSI MODAL & COLOR PICKER ---

    /**
     * Membuka modal color picker dan mengaturnya sesuai sistem yang dipilih.
     * @param {string} sys - Kunci sistem (e.g., 'alis', 'sein').
     * @param {number} slot - Slot warna yang diedit (1, 2, atau 3).
     */
    openColorPicker(sys, slot) {
      this.state.activeSystemForModal = sys;
      this.state.activeColorSlot = slot;

      let currentColor = [255, 0, 0]; // Warna default jika tidak ditemukan
      const systemState = this.state.appState[sys];

      if (systemState) {
        if (sys === 'sein') {
          currentColor = systemState.warna;
        } else {
          const colorKey = slot === 1 ? 'warna' : `warna${slot}`;
          currentColor = systemState.stateKiri[colorKey] || [255, 0, 0];
        }
      }

      // Pastikan this.modalColorPicker sudah terdefinisi
      if (!this.modalColorPicker) {
         this.modalColorPicker = new iro.ColorPicker("#modalColorPickerContainer", { /* ... options ... */ });
      }

      this.modalColorPicker.color.set({ r: currentColor[0], g: currentColor[1], b: currentColor[2] });
      this.elements.colorPickerModal.backdrop.style.display = 'flex';
    }

    /**
     * Menangani penyimpanan warna dari modal color picker.
     */
    handleColorPickerSave() {
      const { activeSystemForModal, activeColorSlot } = this.state;
      if (!activeSystemForModal) return;

      const newColor = this.modalColorPicker.color.rgb;
      let payload = {};
      let endpoint = `/set-mode-${activeSystemForModal}`;

      if (activeSystemForModal === 'sein') {
        payload = { r: newColor.r, g: newColor.g, b: newColor.b };
      } else {
        const isStatic = document.querySelector(`input[name="${activeSystemForModal}EffectType"]:checked`).value === 'static';
        if (isStatic) {
          payload = { mode: 0, r: newColor.r, g: newColor.g, b: newColor.b };
        } else {
          // Buat key payload secara dinamis (r, g, b atau r2, g2, b2, dst.)
          const suffix = activeColorSlot > 1 ? activeColorSlot : '';
          payload[`r${suffix}`] = newColor.r;
          payload[`g${suffix}`] = newColor.g;
          payload[`b${suffix}`] = newColor.b;
        }
      }

      this.api.post(endpoint, payload).then(() => {
        this.showToast(`${activeSystemForModal.toUpperCase()} warna diperbarui`, 'success');
        this.fetchInitialState(); // Ambil state terbaru untuk menyegarkan UI
        this.elements.colorPickerModal.backdrop.style.display = 'none';
      });
    }