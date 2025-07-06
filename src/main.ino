/*
 * ===================================================================
 * AERI LIGHT v19.2 - FIRMWARE (FULLY MODULAR & FINAL)
 * ===================================================================
 * Deskripsi:
 * Versi firmware final yang sepenuhnya modular. Semua logika efek
 * kini berada di dalam sub-folder `src/effects/` dan dipanggil
 * melalui Effect Registry. Struktur ini sangat bersih, stabil, dan
 * mudah untuk diperluas di masa depan.
 * ===================================================================
 */

// --- Library ---
#include <WiFi.h>
#include <FastLED.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

// --- File Efek Modular ---
#include "effects/effects.h"
#include "effects/welcome_effects.h"
#include "effects/custom_welcome_effects.h"
#include "effects/sein_effects.h"

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
const uint8_t CONFIG_VERSION = 18;

// === State Management Structs ===
struct LightState
{
  CRGB warna = CRGB::Red;
  CRGB warna2 = CRGB::Blue;
  CRGB warna3 = CRGB::Green;
  uint8_t modeEfek = 0;
};
struct LightConfig
{
  LightState stateKiri, stateKanan;
  uint8_t ledCount = 30;
  uint8_t brightness = 80;
  uint8_t speed = 50;
  char target[10] = "keduanya";
};
struct SeinConfig
{
  uint8_t mode = 0;
  CRGB warna = CRGB::Orange;
  uint8_t ledCount = 30;
  uint8_t speed = 50;
};
struct GlobalConfig
{
  uint8_t modeWelcome = 0;
  uint16_t durasiWelcome = 5;
};

// --- Variabel Global ---
LightConfig alisConfig, shroudConfig, demonConfig;
SeinConfig seinConfig;
GlobalConfig globalConfig;
CRGB ledsAlisKiri[MAX_LEDS], ledsAlisKanan[MAX_LEDS], ledsShroudKiri[MAX_LEDS], ledsShroudKanan[MAX_LEDS], ledsDemonKiri[MAX_LEDS], ledsDemonKanan[MAX_LEDS];
Preferences prefs;
AsyncWebServer server(80);
unsigned long previousMillis = 0;
const long loopInterval = 16;
bool isWelcomeActive = true;
uint16_t animStep = 0;
bool isPreviewing = false;
unsigned long previewEndTime = 0;
CRGB *previewLedsKiri = nullptr, *previewLedsKanan = nullptr;
uint8_t previewLedCount = 0;

// === EFFECT REGISTRIES ===
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
void jalankanModeLampu(LightConfig &config, CRGB *ledsKiri, CRGB *ledsKanan);
void handleGetState(AsyncWebServerRequest *request);
void handleSetConfig(AsyncWebServerRequest *request);
void handleSetModeLampu(AsyncWebServerRequest *request, LightConfig &config);
void handleSetModeSein(AsyncWebServerRequest *request);
void handleSetModeWelcome(AsyncWebServerRequest *request);
void handleReset(AsyncWebServerRequest *request);
void handleGetPresets(AsyncWebServerRequest *request);
void handleSavePreset(AsyncWebServerRequest *request);
void handleLoadPreset(AsyncWebServerRequest *request);
void handlePreviewLedCount(AsyncWebServerRequest *request);
void initializePresets();
void serializeLightConfig(JsonObject &obj, const LightConfig &config);
void deserializeLightConfig(const JsonObject &obj, LightConfig &config);

void setup()
{
  Serial.begin(115200);
  if (!SPIFFS.begin(true))
  {
    Serial.println("SPIFFS Mount Failed");
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

  Serial.print("Membuat Access Point: ");
  Serial.println(AP_SSID);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());

  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  server.on("/get-state", HTTP_GET, handleGetState);
  server.on("/set-config", HTTP_POST, handleSetConfig);
  server.on("/set-mode-alis", HTTP_POST, [](AsyncWebServerRequest *request)
            { handleSetModeLampu(request, alisConfig); });
  server.on("/set-mode-shroud", HTTP_POST, [](AsyncWebServerRequest *request)
            { handleSetModeLampu(request, shroudConfig); });
  server.on("/set-mode-demon", HTTP_POST, [](AsyncWebServerRequest *request)
            { handleSetModeLampu(request, demonConfig); });
  server.on("/set-mode-sein", HTTP_POST, handleSetModeSein);
  server.on("/set-mode-welcome", HTTP_POST, handleSetModeWelcome);
  server.on("/reset-to-default", HTTP_POST, handleReset);
  server.on("/get-presets", HTTP_GET, handleGetPresets);
  server.on("/save-preset", HTTP_POST, handleSavePreset);
  server.on("/load-preset", HTTP_POST, handleLoadPreset);
  server.on("/preview-led-count", HTTP_POST, handlePreviewLedCount);
  server.onNotFound([](AsyncWebServerRequest *request)
                    { request->send(404, "text/plain", "Not found"); });

  server.begin();
  Serial.println("HTTP server started");
}

void loop()
{
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis < loopInterval)
    return;
  previousMillis = currentMillis;
  animStep++;
  bool seinKiriNyala = (digitalRead(PIN_INPUT_SEIN_KIRI) == LOW);
  bool seinKananNyala = (digitalRead(PIN_INPUT_SEIN_KANAN) == LOW);
  if (isPreviewing)
  {
    if (currentMillis > previewEndTime)
    {
      isPreviewing = false;
      previewLedsKiri = nullptr;
      previewLedsKanan = nullptr;
    }
    else
    {
      FastLED.clear();
      fill_solid(previewLedsKiri, previewLedCount, CRGB::White);
      fill_solid(previewLedsKanan, previewLedCount, CRGB::White);
    }
  }
  else if (seinKiriNyala || seinKananNyala)
  {
    FastLED.clear();
    jalankanModeSein(seinKiriNyala, seinKananNyala);
  }
  else if (isWelcomeActive)
  {
    jalankanModeWelcome();
  }
  else
  {
    jalankanModeLampu(alisConfig, ledsAlisKiri, ledsAlisKanan);
    jalankanModeLampu(shroudConfig, ledsShroudKiri, ledsShroudKanan);
    jalankanModeLampu(demonConfig, ledsDemonKiri, ledsDemonKanan);
  }
  FastLED.show();
}

void resetToDefaults()
{
  alisConfig = LightConfig();
  shroudConfig = LightConfig();
  demonConfig = LightConfig();
  seinConfig = SeinConfig();
  globalConfig = GlobalConfig();
  isWelcomeActive = true;
  Serial.println("State dikembalikan ke default.");
  simpanPengaturan();
}

void simpanPengaturan()
{
  prefs.begin("config-v18", false);
  prefs.putUChar("version", CONFIG_VERSION);
  prefs.putBytes("alis", &alisConfig, sizeof(LightConfig));
  prefs.putBytes("shroud", &shroudConfig, sizeof(LightConfig));
  prefs.putBytes("demon", &demonConfig, sizeof(LightConfig));
  prefs.putBytes("sein", &seinConfig, sizeof(SeinConfig));
  prefs.putBytes("global", &globalConfig, sizeof(GlobalConfig));
  prefs.end();
  Serial.println("Pengaturan disimpan.");
}

void bacaPengaturan()
{
  prefs.begin("config-v18", true);
  if (prefs.getUChar("version", 0) == CONFIG_VERSION)
  {
    prefs.getBytes("alis", &alisConfig, sizeof(LightConfig));
    prefs.getBytes("shroud", &shroudConfig, sizeof(LightConfig));
    prefs.getBytes("demon", &demonConfig, sizeof(LightConfig));
    prefs.getBytes("sein", &seinConfig, sizeof(SeinConfig));
    prefs.getBytes("global", &globalConfig, sizeof(GlobalConfig));
  }
  else
  {
    prefs.end();
    resetToDefaults();
    return;
  }
  prefs.end();
}

void jalankanModeLampu(LightConfig &config, CRGB *ledsKiri, CRGB *ledsKanan)
{
  uint8_t originalBrightness = FastLED.getBrightness();
  FastLED.setBrightness(config.brightness);

  auto animate = [&](const LightState &state, CRGB *leds, uint8_t count)
  {
    fill_solid(leds, MAX_LEDS, CRGB::Black);
    if (count == 0)
      return;
    if (state.modeEfek < numEffects)
    {
      CRGB c1 = state.warna;
      CRGB c2 = state.warna2;
      CRGB c3 = state.warna3;
      EffectParams params = {leds, count, animStep, map(config.speed, 0, 100, 1, 15), c1, c2, c3};
      effectRegistry[state.modeEfek](params);
    }
  };

  if (strcmp(config.target, "kiri") == 0)
  {
    animate(config.stateKiri, ledsKiri, config.ledCount);
  }
  else if (strcmp(config.target, "kanan") == 0)
  {
    animate(config.stateKanan, ledsKanan, config.ledCount);
  }
  else
  {
    animate(config.stateKiri, ledsKiri, config.ledCount);
    if (config.ledCount > 0)
    {
      memcpy(ledsKanan, ledsKiri, sizeof(CRGB) * config.ledCount);
    }
    else
    {
      fill_solid(ledsKanan, MAX_LEDS, CRGB::Black);
    }
  }

  FastLED.setBrightness(originalBrightness);
}

void jalankanModeSein(bool isKiriActive, bool isKananActive)
{
  auto animate = [&](uint8_t mode, CRGB *leds, uint8_t count)
  {
    if (count == 0)
      return;
    if (mode < numSeinEffects)
    {
      SeinEffectParams params = {leds, count, seinConfig.speed, seinConfig.warna};
      seinEffectRegistry[mode](params);
    }
  };
  if (isKiriActive)
    animate(seinConfig.mode, ledsAlisKiri, seinConfig.ledCount);
  if (isKananActive)
    animate(seinConfig.mode, ledsAlisKanan, seinConfig.ledCount);
}

void jalankanModeWelcome()
{
  static uint32_t startTime = 0;
  if (startTime == 0)
    startTime = millis();
  uint32_t elapsed = millis() - startTime;
  uint16_t duration = globalConfig.durasiWelcome * 1000;

  if (elapsed > duration)
  {
    isWelcomeActive = false;
    startTime = 0;
    return;
  }

  uint8_t count = alisConfig.ledCount;
  fill_solid(ledsAlisKiri, count, CRGB::Black);

  if (globalConfig.modeWelcome < numWelcomeEffects)
  {
    CRGB c1 = alisConfig.stateKiri.warna;
    CRGB c2 = alisConfig.stateKiri.warna2;
    WelcomeEffectParams params = {ledsAlisKiri, count, elapsed, duration, c1, c2};
    welcomeEffectRegistry[globalConfig.modeWelcome](params);
  }

  if (count > 0)
  {
    memcpy(ledsAlisKanan, ledsAlisKiri, sizeof(CRGB) * count);
  }
}

// ... Sisa kode tidak berubah ...
void handleGetState(AsyncWebServerRequest *request)
{
  JsonDocument doc;
  JsonObject alis = doc["alis"].to<JsonObject>();
  serializeLightConfig(alis, alisConfig);
  JsonObject shroud = doc["shroud"].to<JsonObject>();
  serializeLightConfig(shroud, shroudConfig);
  JsonObject demon = doc["demon"].to<JsonObject>();
  serializeLightConfig(demon, demonConfig);
  JsonObject sein = doc["sein"].to<JsonObject>();
  sein["ledCount"] = seinConfig.ledCount;
  sein["mode"] = seinConfig.mode;
  JsonArray seinColor = sein["warna"].to<JsonArray>();
  seinColor.add(seinConfig.warna.r);
  seinColor.add(seinConfig.warna.g);
  seinColor.add(seinConfig.warna.b);
  sein["speed"] = seinConfig.speed;
  JsonObject global = doc["global"].to<JsonObject>();
  global["modeWelcome"] = globalConfig.modeWelcome;
  global["durasiWelcome"] = globalConfig.durasiWelcome;
  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}
void handleSetModeLampu(AsyncWebServerRequest *request, LightConfig &config)
{
  bool needsSave = false;
  if (request->hasParam("target", true))
  {
    strncpy(config.target, request->getParam("target", true)->value().c_str(), sizeof(config.target) - 1);
    needsSave = true;
  }
  if (request->hasParam("mode", true))
  {
    uint8_t m = request->getParam("mode", true)->value().toInt();
    config.stateKiri.modeEfek = m;
    config.stateKanan.modeEfek = m;
    needsSave = true;
  }
  if (request->hasParam("r", true) && request->hasParam("g", true) && request->hasParam("b", true))
  {
    CRGB c(request->getParam("r", true)->value().toInt(), request->getParam("g", true)->value().toInt(), request->getParam("b", true)->value().toInt());
    config.stateKiri.warna = c;
    config.stateKanan.warna = c;
    needsSave = true;
  }
  if (request->hasParam("brightness", true))
  {
    config.brightness = constrain(request->getParam("brightness", true)->value().toInt(), 0, 100);
    needsSave = true;
  }
  if (request->hasParam("speed", true))
  {
    config.speed = constrain(request->getParam("speed", true)->value().toInt(), 0, 100);
    needsSave = true;
  }
  if (needsSave)
    simpanPengaturan();
  request->send(200, "text/plain", "OK");
}
void handleSetConfig(AsyncWebServerRequest *request)
{
  if (request->hasParam("ledTarget", true) && request->hasParam("ledCount", true))
  {
    String t = request->getParam("ledTarget", true)->value();
    uint8_t c = constrain(request->getParam("ledCount", true)->value().toInt(), 0, MAX_LEDS);
    if (t == "alis")
      alisConfig.ledCount = c;
    else if (t == "shroud")
      shroudConfig.ledCount = c;
    else if (t == "demon")
      demonConfig.ledCount = c;
    else if (t == "sein")
      seinConfig.ledCount = c;
    simpanPengaturan();
    request->send(200, "text/plain", "Config Saved");
  }
  else
  {
    request->send(400, "text/plain", "Bad Request");
  }
}
void handleSetModeSein(AsyncWebServerRequest *request)
{
  bool needsSave = false;
  if (request->hasParam("mode", true))
  {
    seinConfig.mode = request->getParam("mode", true)->value().toInt();
    needsSave = true;
  }
  if (request->hasParam("speed", true))
  {
    seinConfig.speed = constrain(request->getParam("speed", true)->value().toInt(), 0, 100);
    needsSave = true;
  }
  if (request->hasParam("r", true) && request->hasParam("g", true) && request->hasParam("b", true))
  {
    seinConfig.warna = CRGB(request->getParam("r", true)->value().toInt(), request->getParam("g", true)->value().toInt(), request->getParam("b", true)->value().toInt());
    needsSave = true;
  }
  if (needsSave)
  {
    simpanPengaturan();
    request->send(200, "text/plain", "OK");
  }
  else
  {
    request->send(400, "text/plain", "Bad Request");
  }
}
void handleSetModeWelcome(AsyncWebServerRequest *request)
{
  if (request->hasParam("preview", true))
  {
    isWelcomeActive = true;
    request->send(200, "text/plain", "OK");
    return;
  }
  if (request->hasParam("mode", true) && request->hasParam("durasi", true))
  {
    globalConfig.modeWelcome = request->getParam("mode", true)->value().toInt();
    globalConfig.durasiWelcome = request->getParam("durasi", true)->value().toInt();
    simpanPengaturan();
    request->send(200, "text/plain", "OK");
  }
  else
  {
    request->send(400, "text/plain", "Bad Request");
  }
}
void handlePreviewLedCount(AsyncWebServerRequest *request)
{
  if (request->hasParam("ledTarget", true) && request->hasParam("ledCount", true))
  {
    String target = request->getParam("ledTarget", true)->value();
    uint8_t count = constrain(request->getParam("ledCount", true)->value().toInt(), 0, MAX_LEDS);
    isPreviewing = true;
    previewEndTime = millis() + 2000;
    previewLedCount = count;
    if (target == "alis")
    {
      previewLedsKiri = ledsAlisKiri;
      previewLedsKanan = ledsAlisKanan;
    }
    else if (target == "shroud")
    {
      previewLedsKiri = ledsShroudKiri;
      previewLedsKanan = ledsShroudKanan;
    }
    else if (target == "demon")
    {
      previewLedsKiri = ledsDemonKiri;
      previewLedsKanan = ledsDemonKanan;
    }
    else
    {
      isPreviewing = false;
      request->send(400, "text/plain", "Invalid Target");
      return;
    }
    request->send(200, "text/plain", "Preview Started");
  }
  else
  {
    request->send(400, "text/plain", "Bad Request");
  }
}
void handleReset(AsyncWebServerRequest *request)
{
  resetToDefaults();
  request->send(200, "text/plain", "OK");
  delay(1000);
  ESP.restart();
}
void initializePresets()
{
  if (!SPIFFS.exists("/presets.json"))
  {
    File f = SPIFFS.open("/presets.json", "w");
    if (!f)
      return;
    JsonDocument d;
    JsonArray p = d.to<JsonArray>();
    for (int i = 0; i < 5; i++)
    {
      JsonObject o = p.add<JsonObject>();
      o["slot"] = i + 1;
      o["name"] = "Preset " + String(i + 1);
      o["state"] = nullptr;
    }
    serializeJson(d, f);
    f.close();
  }
}
void handleGetPresets(AsyncWebServerRequest *request)
{
  request->send(SPIFFS, "/presets.json", "application/json");
}
void handleSavePreset(AsyncWebServerRequest *request)
{
  if (request->hasParam("slot", true) && request->hasParam("name", true))
  {
    int s = request->getParam("slot", true)->value().toInt();
    String n = request->getParam("name", true)->value();
    File f = SPIFFS.open("/presets.json", "r");
    if (!f)
    {
      request->send(500, "text/plain", "Gagal buka presets");
      return;
    }
    JsonDocument d;
    DeserializationError e = deserializeJson(d, f);
    f.close();
    if (e)
    {
      initializePresets();
      request->send(500, "text/plain", "File preset rusak, telah direset.");
      return;
    }
    JsonArray p = d.as<JsonArray>();
    JsonObject t;
    bool found = false;
    for (JsonObject o : p)
    {
      if (o["slot"] == s)
      {
        t = o;
        found = true;
        break;
      }
    }
    if (!found)
    {
      t = p.add<JsonObject>();
      t["slot"] = s;
    }
    t["name"] = n;
    JsonObject so = t["state"].to<JsonObject>();
    JsonObject alis_obj = so["alis"].to<JsonObject>();
    serializeLightConfig(alis_obj, alisConfig);
    JsonObject shroud_obj = so["shroud"].to<JsonObject>();
    serializeLightConfig(shroud_obj, shroudConfig);
    JsonObject demon_obj = so["demon"].to<JsonObject>();
    serializeLightConfig(demon_obj, demonConfig);
    JsonObject i = so["sein"].to<JsonObject>();
    i["mode"] = seinConfig.mode;
    i["ledCount"] = seinConfig.ledCount;
    i["speed"] = seinConfig.speed;
    JsonArray c = i["warna"].to<JsonArray>();
    c.add(seinConfig.warna.r);
    c.add(seinConfig.warna.g);
    c.add(seinConfig.warna.b);
    f = SPIFFS.open("/presets.json", "w");
    if (serializeJson(d, f) == 0)
    {
      request->send(500, "text/plain", "Gagal tulis presets");
    }
    else
    {
      request->send(200, "text/plain", "Preset disimpan");
    }
    f.close();
  }
  else
  {
    request->send(400, "text/plain", "Parameter tidak lengkap");
  }
}
void handleLoadPreset(AsyncWebServerRequest *request)
{
  if (request->hasParam("slot", true))
  {
    int s = request->getParam("slot", true)->value().toInt();
    File f = SPIFFS.open("/presets.json", "r");
    if (!f)
    {
      request->send(500, "text/plain", "Gagal buka presets");
      return;
    }
    JsonDocument d;
    DeserializationError e = deserializeJson(d, f);
    f.close();
    if (e)
    {
      request->send(500, "text/plain", "Gagal parse presets");
      return;
    }
    JsonArray p = d.as<JsonArray>();
    JsonObject t;
    for (JsonObject o : p)
    {
      if (o["slot"] == s)
      {
        t = o;
        break;
      }
    }
    if (!t || t["state"].isNull())
    {
      request->send(404, "text/plain", "Preset kosong");
      return;
    }
    JsonObject so = t["state"].as<JsonObject>();
    deserializeLightConfig(so["alis"].as<JsonObject>(), alisConfig);
    deserializeLightConfig(so["shroud"].as<JsonObject>(), shroudConfig);
    deserializeLightConfig(so["demon"].as<JsonObject>(), demonConfig);
    if (so["sein"].is<JsonObject>())
    {
      JsonObject i = so["sein"].as<JsonObject>();
      seinConfig.mode = i["mode"];
      seinConfig.ledCount = i["ledCount"];
      seinConfig.speed = i["speed"];
      JsonArray c = i["warna"].as<JsonArray>();
      seinConfig.warna.r = c[0];
      seinConfig.warna.g = c[1];
      seinConfig.warna.b = c[2];
    }
    simpanPengaturan();
    request->send(200, "text/plain", "Preset dimuat");
  }
  else
  {
    request->send(400, "text/plain", "Parameter tidak lengkap");
  }
}
void serializeLightConfig(JsonObject &obj, const LightConfig &config)
{
  obj["ledCount"] = config.ledCount;
  obj["brightness"] = config.brightness;
  obj["speed"] = config.speed;
  obj["target"] = config.target;
  JsonObject sk = obj["stateKiri"].to<JsonObject>();
  sk["modeEfek"] = config.stateKiri.modeEfek;
  JsonArray wk = sk["warna"].to<JsonArray>();
  wk.add(config.stateKiri.warna.r);
  wk.add(config.stateKiri.warna.g);
  wk.add(config.stateKiri.warna.b);
  JsonArray w2k = sk["warna2"].to<JsonArray>();
  w2k.add(config.stateKiri.warna2.r);
  w2k.add(config.stateKiri.warna2.g);
  w2k.add(config.stateKiri.warna2.b);
  JsonArray w3k = sk["warna3"].to<JsonArray>();
  w3k.add(config.stateKiri.warna3.r);
  w3k.add(config.stateKiri.warna3.g);
  w3k.add(config.stateKiri.warna3.b);
  obj["stateKanan"] = sk;
}
void deserializeLightConfig(const JsonObject &obj, LightConfig &config)
{
  if (obj.isNull())
    return;
  config.ledCount = obj["ledCount"] | config.ledCount;
  config.brightness = obj["brightness"] | config.brightness;
  config.speed = obj["speed"] | config.speed;
  if (obj["target"].is<const char *>())
  {
    strncpy(config.target, obj["target"], sizeof(config.target) - 1);
  }
  JsonObject sk = obj["stateKiri"].as<JsonObject>();
  if (!sk.isNull())
  {
    config.stateKiri.modeEfek = sk["modeEfek"] | config.stateKiri.modeEfek;
    if (sk["warna"].is<JsonArray>())
    {
      JsonArray wk = sk["warna"].as<JsonArray>();
      config.stateKiri.warna.r = wk[0];
      config.stateKiri.warna.g = wk[1];
      config.stateKiri.warna.b = wk[2];
    }
    if (sk["warna2"].is<JsonArray>())
    {
      JsonArray w2k = sk["warna2"].as<JsonArray>();
      config.stateKiri.warna2.r = w2k[0];
      config.stateKiri.warna2.g = w2k[1];
      config.stateKiri.warna2.b = w2k[2];
    }
    if (sk["warna3"].is<JsonArray>())
    {
      JsonArray w3k = sk["warna3"].as<JsonArray>();
      config.stateKiri.warna3.r = w3k[0];
      config.stateKiri.warna3.g = w3k[1];
      config.stateKiri.warna3.b = w3k[2];
    }
  }
  config.stateKanan = config.stateKiri;
}