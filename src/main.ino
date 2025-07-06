/*
 * ===================================================================
 * AERI LIGHT v20.0 - FIRMWARE (STABILITY & API UPDATE)
 * ===================================================================
 * Deskripsi Perubahan:
 * - REFACTOR: Mengubah cara web server menangani request. Sebagian
 * besar endpoint POST sekarang menerima 'application/json' untuk
 * komunikasi yang lebih andal dan terstruktur dengan PWA.
 * - REFACTOR: Struktur konfigurasi (structs) disesuaikan agar
 * lebih cocok dengan state management di frontend (app.js v20.0).
 * - ADD: Endpoint baru: /set-led-counts, /set-welcome, /preview-welcome,
 * dan /get-preset-name untuk mendukung fungsionalitas UI baru.
 * - UPDATE: Logika `handleSetModeLampu` diperbarui untuk bisa
 * mengubah warna spesifik (colorIndex) pada mode yang mendukung
 * multi-warna.
 * - FIX: Menggunakan library AsyncJson untuk parsing body request
 * JSON secara aman dan efisien.
 * ===================================================================
 */

// --- Library ---
#include <WiFi.h>
#include <FastLED.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <AsyncJson.h>

// --- File Efek Modular ---
#include "effects.h"
#include "welcome_effects.h"
#include "custom_welcome_effects.h"
#include "sein_effects.h"

// --- Konfigurasi Jaringan Access Point ---
const char *AP_SSID = "AERI_LIGHT";
const char *AP_PASSWORD = "12345678";

// --- Definisi Pin & LED ---
#define PIN_ALIS_KIRI 5
#define PIN_ALIS_KANAN 19
#define PIN_SHROUD_KIRI 18
#define PIN_SHROUD_KANAN 4
#define PIN_DEMON_KIRI 17
#define PIN_DEMON_KANAN 16
#define PIN_INPUT_SEIN_KIRI 23
#define PIN_INPUT_SEIN_KANAN 26
#define MAX_LEDS 250
#define LED_TYPE WS2812B
#define COLOR_ORDER GRB
const uint8_t CONFIG_VERSION = 20; // Versi config dinaikkan

// === State Management Structs (REFACTORED) ===
struct LightState
{
  CRGB warna[3] = {CRGB::Red, CRGB::Blue, CRGB::Green}; // Array untuk 3 warna
  uint8_t kecerahan = 200;
};
struct LightConfig
{
  LightState stateKiri, stateKanan;
  uint8_t mode = 0;
  uint8_t kecepatan = 50;
};
struct SeinConfig
{
  uint8_t mode = 0;
  CRGB warna = CRGB::Orange;
  uint8_t kecepatan = 50;
};
struct LedCountConfig {
    uint8_t alis = 30;
    uint8_t shroud = 30;
    uint8_t demon = 1;
    uint8_t sein = 30;
};
struct WelcomeConfig
{
  uint8_t mode = 0;
  uint8_t durasi = 5; // dalam detik
};

// --- Variabel Global ---
LightConfig alisConfig, shroudConfig, demonConfig;
SeinConfig seinConfig;
LedCountConfig ledCounts;
WelcomeConfig welcomeConfig;

CRGB ledsAlisKiri[MAX_LEDS], ledsAlisKanan[MAX_LEDS], ledsShroudKiri[MAX_LEDS], ledsShroudKanan[MAX_LEDS], ledsDemonKiri[MAX_LEDS], ledsDemonKanan[MAX_LEDS];
Preferences prefs;
AsyncWebServer server(80);
unsigned long previousMillis = 0;
const long loopInterval = 16;
bool isWelcomeActive = true;
unsigned long welcomeStartTime = 0;
uint16_t animStep = 0;

// === EFFECT REGISTRIES (Tidak berubah) ===
typedef void (*EffectFunction)(EffectParams &);
EffectFunction effectRegistry[] = {
    solid, breathing, rainbow, comet, cylonScanner, twinkle, fire,
    gradientShift, plasmaBall, theaterChase, colorWipe, pride, pacifica, bouncingBalls,
    meteor, confetti, juggle, sinelon, noise, matrix, ripple, larsonScanner, twoColorWipe, lightning};
const uint8_t numEffects = sizeof(effectRegistry) / sizeof(effectRegistry[0]);

typedef void (*WelcomeEffectFunction)(WelcomeEffectParams &);
WelcomeEffectFunction welcomeEffectRegistry[] = {
    WelcomeEffects::powerOnScan, WelcomeEffects::ignitionBurst, WelcomeEffects::spectrumResolve,
    WelcomeEffects::theaterChaseWelcome, WelcomeEffects::dualCometWelcome, WelcomeEffects::centerFill,
    CustomWelcomeEffects::charging, CustomWelcomeEffects::glitch, CustomWelcomeEffects::sonar,
    CustomWelcomeEffects::burning, CustomWelcomeEffects::warpSpeed, CustomWelcomeEffects::dna,
    CustomWelcomeEffects::laser, CustomWelcomeEffects::heartbeat, CustomWelcomeEffects::liquid,
    CustomWelcomeEffects::spotlights};
const uint8_t numWelcomeEffects = sizeof(welcomeEffectRegistry) / sizeof(welcomeEffectRegistry[0]);

typedef void (*SeinEffectFunction)(SeinEffectParams &);
SeinEffectFunction seinEffectRegistry[] = {
    SeinEffects::sequential, SeinEffects::pulsingArrow, SeinEffects::fillAndFlush, SeinEffects::cometTrail};
const uint8_t numSeinEffects = sizeof(seinEffectRegistry) / sizeof(seinEffectRegistry[0]);

// --- Prototipe Fungsi ---
void resetToDefaults();
void simpanPengaturan();
void bacaPengaturan();
void jalankanModeWelcome();
void jalankanModeSein(bool isKiriActive, bool isKananActive);
void jalankanModeLampu(LightConfig &config, CRGB *leds, uint8_t ledCount);

// --- Handlers ---
void handleGetState(AsyncWebServerRequest *request);
void handleSetModeLampu(AsyncWebServerRequest *request, JsonVariant &json, LightConfig &config);
void handleSetModeSein(AsyncWebServerRequest *request, JsonVariant &json);
void handleSetLedCounts(AsyncWebServerRequest *request, JsonVariant &json);
void handleSetWelcome(AsyncWebServerRequest *request, JsonVariant &json);
void handlePreviewWelcome(AsyncWebServerRequest *request);
void handleGetPresetName(AsyncWebServerRequest *request);
void handleSavePreset(AsyncWebServerRequest *request, JsonVariant &json);
void handleLoadPreset(AsyncWebServerRequest *request, JsonVariant &json);
void handleResetFactory(AsyncWebServerRequest *request);
void initializePresets();

void setup()
{
  Serial.begin(115200);
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed");
    return;
  }

  initializePresets();
  bacaPengaturan();

  FastLED.addLeds<LED_TYPE, PIN_ALIS_KIRI, COLOR_ORDER>(ledsAlisKiri, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_ALIS_KANAN, COLOR_ORDER>(ledsAlisKanan, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_SHROUD_KIRI, COLOR_ORDER>(ledsShroudKiri, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_SHROUD_KANAN, COLOR_ORDER>(ledsShroudKanan, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_DEMON_KIRI, COLOR_ORDER>(ledsDemonKiri, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_DEMON_KANAN, COLOR_ORDER>(ledsDemonKanan, MAX_LEDS);
  pinMode(PIN_INPUT_SEIN_KIRI, INPUT_PULLUP);
  pinMode(PIN_INPUT_SEIN_KANAN, INPUT_PULLUP);

  WiFi.softAP(AP_SSID, AP_PASSWORD);
  Serial.print("Access Point: ");
  Serial.println(AP_SSID);
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.on("/get-state", HTTP_GET, handleGetState);

  // JSON Body Handlers
  AsyncCallbackJsonWebHandler *setAlisHandler = new AsyncCallbackJsonWebHandler("/set-mode-alis", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSetModeLampu(request, json, alisConfig); });
  AsyncCallbackJsonWebHandler *setShroudHandler = new AsyncCallbackJsonWebHandler("/set-mode-shroud", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSetModeLampu(request, json, shroudConfig); });
  AsyncCallbackJsonWebHandler *setDemonHandler = new AsyncCallbackJsonWebHandler("/set-mode-demon", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSetModeLampu(request, json, demonConfig); });
  AsyncCallbackJsonWebHandler *setSeinHandler = new AsyncCallbackJsonWebHandler("/set-mode-sein", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSetModeSein(request, json); });
  AsyncCallbackJsonWebHandler *setLedCountsHandler = new AsyncCallbackJsonWebHandler("/set-led-counts", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSetLedCounts(request, json); });
  AsyncCallbackJsonWebHandler *setWelcomeHandler = new AsyncCallbackJsonWebHandler("/set-welcome", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSetWelcome(request, json); });
  AsyncCallbackJsonWebHandler *savePresetHandler = new AsyncCallbackJsonWebHandler("/save-preset", [](AsyncWebServerRequest *request, JsonVariant &json) { handleSavePreset(request, json); });
  AsyncCallbackJsonWebHandler *loadPresetHandler = new AsyncCallbackJsonWebHandler("/load-preset", [](AsyncWebServerRequest *request, JsonVariant &json) { handleLoadPreset(request, json); });
  
  server.addHandler(setAlisHandler);
  server.addHandler(setShroudHandler);
  server.addHandler(setDemonHandler);
  server.addHandler(setSeinHandler);
  server.addHandler(setLedCountsHandler);
  server.addHandler(setWelcomeHandler);
  server.addHandler(savePresetHandler);
  server.addHandler(loadPresetHandler);
  
  // Normal Handlers
  server.on("/preview-welcome", HTTP_POST, handlePreviewWelcome);
  server.on("/get-preset-name", HTTP_GET, handleGetPresetName);
  server.on("/reset-factory", HTTP_POST, handleResetFactory);
  
  server.onNotFound([](AsyncWebServerRequest *request) { request->send(404, "text/plain", "Not found"); });

  server.begin();
  Serial.println("HTTP server started");
}

void loop()
{
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis < loopInterval) return;
  previousMillis = currentMillis;
  animStep++;
  
  bool seinKiriNyala = (digitalRead(PIN_INPUT_SEIN_KIRI) == LOW);
  bool seinKananNyala = (digitalRead(PIN_INPUT_SEIN_KANAN) == LOW);

  if (seinKiriNyala || seinKananNyala) {
    jalankanModeSein(seinKiriNyala, seinKananNyala);
  } else if (isWelcomeActive) {
    jalankanModeWelcome();
  } else {
    jalankanModeLampu(alisConfig, ledsAlisKiri, ledCounts.alis);
    jalankanModeLampu(shroudConfig, ledsShroudKiri, ledCounts.shroud);
    jalankanModeLampu(demonConfig, ledsDemonKiri, ledCounts.demon);
  }
  
  // Salin state dari Kiri ke Kanan untuk semua
  memcpy(ledsAlisKanan, ledsAlisKiri, sizeof(CRGB) * ledCounts.alis);
  memcpy(ledsShroudKanan, ledsShroudKiri, sizeof(CRGB) * ledCounts.shroud);
  memcpy(ledsDemonKanan, ledsDemonKiri, sizeof(CRGB) * ledCounts.demon);
  
  FastLED.show();
}

void jalankanModeLampu(LightConfig &config, CRGB *leds, uint8_t ledCount) {
  fill_solid(leds, MAX_LEDS, CRGB::Black);
  if (ledCount == 0 || config.mode >= numEffects) return;

  uint8_t originalBrightness = FastLED.getBrightness();
  FastLED.setBrightness(config.stateKiri.kecerahan);
  
  uint8_t mapped_speed = map(config.kecepatan, 0, 100, 1, 15);
  EffectParams params = {leds, (uint16_t)ledCount, animStep, mapped_speed, config.stateKiri.warna[0], config.stateKiri.warna[1], config.stateKiri.warna[2]};
  effectRegistry[config.mode](params);

  FastLED.setBrightness(originalBrightness);
}

void jalankanModeSein(bool isKiriActive, bool isKananActive) {
    FastLED.clear();
    if (isKiriActive && seinConfig.mode < numSeinEffects) {
        SeinEffectParams params = {ledsAlisKiri, (uint16_t)ledCounts.sein, seinConfig.kecepatan, seinConfig.warna};
        seinEffectRegistry[seinConfig.mode](params);
    }
    if (isKananActive && seinConfig.mode < numSeinEffects) {
        SeinEffectParams params = {ledsAlisKanan, (uint16_t)ledCounts.sein, seinConfig.kecepatan, seinConfig.warna};
        seinEffectRegistry[seinConfig.mode](params);
    }
}

void jalankanModeWelcome() {
  if (welcomeStartTime == 0) welcomeStartTime = millis();
  uint32_t elapsed = millis() - welcomeStartTime;
  uint32_t duration = welcomeConfig.durasi * 1000;

  if (elapsed > duration) {
    isWelcomeActive = false;
    welcomeStartTime = 0;
    return;
  }

  fill_solid(ledsAlisKiri, ledCounts.alis, CRGB::Black);

  if (welcomeConfig.mode < numWelcomeEffects) {
    WelcomeEffectParams params = {ledsAlisKiri, (uint16_t)ledCounts.alis, elapsed, duration, alisConfig.stateKiri.warna[0], alisConfig.stateKiri.warna[1], alisConfig.stateKiri.warna[2]};
    welcomeEffectRegistry[welcomeConfig.mode](params);
  }
}

// ... (Implementasi fungsi-fungsi lainnya seperti simpan/baca/reset, dan semua handler baru)
// Harap salin seluruh blok kode di bawah ini ke file Anda

void handleGetState(AsyncWebServerRequest *request)
{
    JsonDocument doc;
    JsonObject state = doc.to<JsonObject>();

    // Alis
    JsonObject alis = state["alis"].to<JsonObject>();
    alis["mode"] = alisConfig.mode;
    alis["kecepatan"] = alisConfig.kecepatan;
    JsonObject alisStateKiri = alis["stateKiri"].to<JsonObject>();
    alisStateKiri["kecerahan"] = alisConfig.stateKiri.kecerahan;
    JsonArray alisWarna = alisStateKiri["warna"].to<JsonArray>();
    for(int i=0; i<3; i++) {
        JsonArray c = alisWarna.add<JsonArray>();
        c.add(alisConfig.stateKiri.warna[i].r); c.add(alisConfig.stateKiri.warna[i].g); c.add(alisConfig.stateKiri.warna[i].b);
    }

    // Shroud
    JsonObject shroud = state["shroud"].to<JsonObject>();
    shroud["mode"] = shroudConfig.mode;
    shroud["kecepatan"] = shroudConfig.kecepatan;
    JsonObject shroudStateKiri = shroud["stateKiri"].to<JsonObject>();
    shroudStateKiri["kecerahan"] = shroudConfig.stateKiri.kecerahan;
    JsonArray shroudWarna = shroudStateKiri["warna"].to<JsonArray>();
     for(int i=0; i<3; i++) {
        JsonArray c = shroudWarna.add<JsonArray>();
        c.add(shroudConfig.stateKiri.warna[i].r); c.add(shroudConfig.stateKiri.warna[i].g); c.add(shroudConfig.stateKiri.warna[i].b);
    }

    // Demon
    JsonObject demon = state["demon"].to<JsonObject>();
    demon["mode"] = demonConfig.mode;
    demon["kecepatan"] = demonConfig.kecepatan;
    JsonObject demonStateKiri = demon["stateKiri"].to<JsonObject>();
    demonStateKiri["kecerahan"] = demonConfig.stateKiri.kecerahan;
    JsonArray demonWarna = demonStateKiri["warna"].to<JsonArray>();
     for(int i=0; i<3; i++) {
        JsonArray c = demonWarna.add<JsonArray>();
        c.add(demonConfig.stateKiri.warna[i].r); c.add(demonConfig.stateKiri.warna[i].g); c.add(demonConfig.stateKiri.warna[i].b);
    }
    
    // Sein
    JsonObject sein = state["sein"].to<JsonObject>();
    sein["mode"] = seinConfig.mode;
    sein["kecepatan"] = seinConfig.kecepatan;
    JsonArray seinWarna = sein["warna"].to<JsonArray>();
    seinWarna.add(seinConfig.warna.r); seinWarna.add(seinConfig.warna.g); seinWarna.add(seinConfig.warna.b);

    // LED Counts
    JsonObject counts = state["ledCounts"].to<JsonObject>();
    counts["alis"] = ledCounts.alis;
    counts["shroud"] = ledCounts.shroud;
    counts["demon"] = ledCounts.demon;
    counts["sein"] = ledCounts.sein;

    // Welcome
    JsonObject welcome = state["welcome"].to<JsonObject>();
    welcome["mode"] = welcomeConfig.mode;
    welcome["durasi"] = welcomeConfig.durasi;
    
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
}

void handleSetModeLampu(AsyncWebServerRequest *request, JsonVariant &json, LightConfig &config) {
    JsonObject obj = json.as<JsonObject>();
    bool needsSave = false;
    
    if (obj.containsKey("mode")) {
        config.mode = obj["mode"];
        needsSave = true;
    }
    if (obj.containsKey("kecepatan")) {
        config.kecepatan = obj["kecepatan"];
        needsSave = true;
    }
    if (obj.containsKey("kecerahan")) {
        config.stateKiri.kecerahan = obj["kecerahan"];
        needsSave = true;
    }
    if (obj.containsKey("r") && obj.containsKey("g") && obj.containsKey("b") && obj.containsKey("colorIndex")) {
        uint8_t index = obj["colorIndex"];
        if (index < 3) {
            config.stateKiri.warna[index] = CRGB(obj["r"], obj["g"], obj["b"]);
            needsSave = true;
        }
    }

    if(needsSave) simpanPengaturan();
    request->send(200, "text/plain", "OK");
}

void handleSetModeSein(AsyncWebServerRequest *request, JsonVariant &json) {
    JsonObject obj = json.as<JsonObject>();
    bool needsSave = false;

    if (obj.containsKey("mode")) {
        seinConfig.mode = obj["mode"];
        needsSave = true;
    }
    if (obj.containsKey("kecepatan")) {
        seinConfig.kecepatan = obj["kecepatan"];
        needsSave = true;
    }
    if (obj.containsKey("r") && obj.containsKey("g") && obj.containsKey("b")) {
        seinConfig.warna = CRGB(obj["r"], obj["g"], obj["b"]);
        needsSave = true;
    }

    if(needsSave) simpanPengaturan();
    request->send(200, "text/plain", "OK");
}

void handleSetLedCounts(AsyncWebServerRequest *request, JsonVariant &json) {
    JsonObject obj = json.as<JsonObject>();
    ledCounts.alis = obj["alis"] | ledCounts.alis;
    ledCounts.shroud = obj["shroud"] | ledCounts.shroud;
    ledCounts.demon = obj["demon"] | ledCounts.demon;
    ledCounts.sein = obj["sein"] | ledCounts.sein;
    simpanPengaturan();
    request->send(200, "text/plain", "OK");
}

void handleSetWelcome(AsyncWebServerRequest *request, JsonVariant &json) {
    JsonObject obj = json.as<JsonObject>();
    welcomeConfig.mode = obj["mode"] | welcomeConfig.mode;
    welcomeConfig.durasi = obj["durasi"] | welcomeConfig.durasi;
    simpanPengaturan();
    request->send(200, "text/plain", "OK");
}

void handlePreviewWelcome(AsyncWebServerRequest *request) {
    isWelcomeActive = true;
    welcomeStartTime = 0; // Reset timer
    request->send(200, "text/plain", "OK");
}

void handleGetPresetName(AsyncWebServerRequest *request) {
    if (!request->hasParam("slot")) {
        request->send(400, "text/plain", "Bad Request");
        return;
    }
    int slot = request->getParam("slot")->value().toInt();
    
    File file = LittleFS.open("/presets.json", "r");
    if (!file) {
        request->send(500, "text/plain", "Preset file not found");
        return;
    }

    JsonDocument doc;
    deserializeJson(doc, file);
    file.close();

    JsonArray presets = doc.as<JsonArray>();
    for (JsonObject p : presets) {
        if (p["slot"] == slot) {
            request->send(200, "application/json", "{\"name\":\"" + p["name"].as<String>() + "\"}");
            return;
        }
    }
    request->send(404, "text/plain", "Slot not found");
}

void handleSavePreset(AsyncWebServerRequest *request, JsonVariant &json) {
    // Implementasi penyimpanan preset dari JSON
    // Mirip dengan handleLoadPreset, tapi sebaliknya
    request->send(200, "text/plain", "Preset Saved (Implementasi diperlukan)");
}

void handleLoadPreset(AsyncWebServerRequest *request, JsonVariant &json) {
    // Implementasi pemuatan preset dari JSON
    request->send(200, "text/plain", "Preset Loaded (Implementasi diperlukan)");
}

void handleResetFactory(AsyncWebServerRequest *request) {
  resetToDefaults();
  request->send(200, "text/plain", "OK");
  delay(1000);
  ESP.restart();
}

void simpanPengaturan() {
  prefs.begin("config-v20", false);
  prefs.putUChar("version", CONFIG_VERSION);
  prefs.putBytes("alis", &alisConfig, sizeof(LightConfig));
  prefs.putBytes("shroud", &shroudConfig, sizeof(LightConfig));
  prefs.putBytes("demon", &demonConfig, sizeof(LightConfig));
  prefs.putBytes("sein", &seinConfig, sizeof(SeinConfig));
  prefs.putBytes("leds", &ledCounts, sizeof(LedCountConfig));
  prefs.putBytes("welcome", &welcomeConfig, sizeof(WelcomeConfig));
  prefs.end();
  Serial.println("Pengaturan disimpan.");
}

void bacaPengaturan() {
  prefs.begin("config-v20", true);
  if (prefs.getUChar("version", 0) != CONFIG_VERSION) {
    prefs.end();
    resetToDefaults();
    return;
  }
  prefs.getBytes("alis", &alisConfig, sizeof(LightConfig));
  prefs.getBytes("shroud", &shroudConfig, sizeof(LightConfig));
  prefs.getBytes("demon", &demonConfig, sizeof(LightConfig));
  prefs.getBytes("sein", &seinConfig, sizeof(SeinConfig));
  prefs.getBytes("leds", &ledCounts, sizeof(LedCountConfig));
  prefs.getBytes("welcome", &welcomeConfig, sizeof(WelcomeConfig));
  prefs.end();
}

void resetToDefaults() {
  alisConfig = LightConfig();
  shroudConfig = LightConfig();
  demonConfig = LightConfig();
  seinConfig = SeinConfig();
  ledCounts = LedCountConfig();
  welcomeConfig = WelcomeConfig();
  isWelcomeActive = true;
  simpanPengaturan();
  Serial.println("State dikembalikan ke default.");
}

void initializePresets() {
  if (LittleFS.exists("/presets.json")) return;
  
  File file = LittleFS.open("/presets.json", "w");
  if (!file) {
      Serial.println("Gagal membuat file preset");
      return;
  }
  JsonDocument doc;
  JsonArray presets = doc.to<JsonArray>();
  for (int i = 1; i <= 5; i++) {
    JsonObject p = presets.add<JsonObject>();
    p["slot"] = i;
    p["name"] = "Preset " + String(i);
  }
  serializeJson(doc, file);
  file.close();
}