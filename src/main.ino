/*
 * ===================================================================
 * AERI LIGHT v21.0 - FIRMWARE (FINAL BUG FIXES)
 * ===================================================================
 * Deskripsi Perubahan:
 * - IMPLEMENT: Fungsionalitas penuh untuk handleSavePreset() dan
 * handleLoadPreset(), memungkinkan pengguna menyimpan dan memuat
 * konfigurasi dari file presets.json.
 * - UX: handleGetPresetName() sekarang mengirimkan ringkasan
 * konten preset (misal: mode Alis) untuk ditampilkan di PWA.
 * - REFACTOR: Menambahkan fungsi pembantu deserializeState() dan
 * deserializeLightConfig() untuk memuat state dari objek JSON.
 * - FIX: Menghilangkan peringatan deprecated dari ArduinoJson.
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
#include "ESPAsyncWebServer.h"

// --- File Efek Modular ---
#include "effects.h"
#include "welcome_effects.h"
#include "custom_welcome_effects.h"
#include "sein_effects.h"

// --- Konfigurasi ---
const char *AP_SSID = "AERI_LIGHT";
const char *AP_PASSWORD = "12345678";
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
const uint8_t CONFIG_VERSION = 22;

// === State Management Structs ===
struct LightState
{
  CRGB warna[3] = {CRGB::Red, CRGB::Blue, CRGB::Green};
  uint8_t kecerahan = 200;
};
struct LightConfig
{
  LightState stateKiri;
  uint8_t mode = 0;
  uint8_t kecepatan = 50;
};
struct SeinConfig
{
  uint8_t mode = 0;
  CRGB warna = CRGB::Orange;
  uint8_t kecepatan = 50;
};
struct LedCountConfig
{
  uint8_t alis = 30;
  uint8_t shroud = 30;
  uint8_t demon = 1;
  uint8_t sein = 30;
};
struct WelcomeConfig
{
  uint8_t mode = 0;
  uint8_t durasi = 5;
};

// --- Variabel Global ---
LightConfig alisConfig, shroudConfig, demonConfig;
SeinConfig seinConfig;
LedCountConfig ledCounts;
WelcomeConfig welcomeConfig;

CRGB ledsAlisKiri[MAX_LEDS], ledsAlisKanan[MAX_LEDS], ledsShroudKiri[MAX_LEDS], ledsShroudKanan[MAX_LEDS], ledsDemonKiri[MAX_LEDS], ledsDemonKanan[MAX_LEDS];
Preferences prefs;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

unsigned long previousMillis = 0;
const long loopInterval = 16;
bool isWelcomeActive = true;
unsigned long welcomeStartTime = 0;
uint16_t animStep = 0;
bool stateChanged = false;

// --- Effect Registries & Names ---
typedef void (*EffectFunction)(EffectParams &);
EffectFunction effectRegistry[] = {solid, breathing, rainbow, comet, cylonScanner, twinkle, fire, gradientShift, plasmaBall, theaterChase, colorWipe, pride, pacifica, bouncingBalls, meteor, confetti, juggle, sinelon, noise, matrix, ripple, larsonScanner, twoColorWipe, lightning};
const char *effectNames[] = {"Solid", "Breathing", "Rainbow", "Comet", "Cylon Scanner", "Twinkle", "Fire", "Gradient Shift", "Plasma Ball", "Theater Chase", "Color Wipe", "Pride", "Pacifica", "Bouncing Balls", "Meteor", "Confetti", "Juggle", "Sinelon", "Noise", "Matrix", "Ripple", "Larson Scanner", "Two-Color Wipe", "Lightning"};
const uint8_t numEffects = sizeof(effectRegistry) / sizeof(effectRegistry[0]);

typedef void (*WelcomeEffectFunction)(WelcomeEffectParams &);
WelcomeEffectFunction welcomeEffectRegistry[] = {WelcomeEffects::powerOnScan, WelcomeEffects::ignitionBurst, WelcomeEffects::spectrumResolve, WelcomeEffects::theaterChaseWelcome, WelcomeEffects::dualCometWelcome, WelcomeEffects::centerFill, CustomWelcomeEffects::charging, CustomWelcomeEffects::glitch, CustomWelcomeEffects::sonar, CustomWelcomeEffects::burning, CustomWelcomeEffects::warpSpeed, CustomWelcomeEffects::dna, CustomWelcomeEffects::laser, CustomWelcomeEffects::heartbeat, CustomWelcomeEffects::liquid, CustomWelcomeEffects::spotlights};
const uint8_t numWelcomeEffects = sizeof(welcomeEffectRegistry) / sizeof(welcomeEffectRegistry[0]);

typedef void (*SeinEffectFunction)(SeinEffectParams &);
SeinEffectFunction seinEffectRegistry[] = {SeinEffects::sequential, SeinEffects::pulsingArrow, SeinEffects::fillAndFlush, SeinEffects::cometTrail};
const uint8_t numSeinEffects = sizeof(seinEffectRegistry) / sizeof(seinEffectRegistry[0]);

// --- Prototipe Fungsi ---
void serializeState(JsonDocument &doc);
void deserializeState(JsonObject &stateObj);
void deserializeLightConfig(JsonObject &lightObj, LightConfig &config);
void broadcastState();
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);
void resetToDefaults();
void simpanPengaturan();
void bacaPengaturan();
void jalankanModeWelcome();
void jalankanModeSein(bool isKiriActive, bool isKananActive);
void jalankanModeLampu(LightConfig &config, CRGB *leds, uint8_t ledCount);
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
  if (!LittleFS.begin(true))
  {
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

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.on("/get-state", HTTP_GET, handleGetState);

  AsyncCallbackJsonWebHandler *setAlisHandler = new AsyncCallbackJsonWebHandler("/set-mode-alis", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                { handleSetModeLampu(request, json, alisConfig); });
  AsyncCallbackJsonWebHandler *setShroudHandler = new AsyncCallbackJsonWebHandler("/set-mode-shroud", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                  { handleSetModeLampu(request, json, shroudConfig); });
  AsyncCallbackJsonWebHandler *setDemonHandler = new AsyncCallbackJsonWebHandler("/set-mode-demon", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                 { handleSetModeLampu(request, json, demonConfig); });
  AsyncCallbackJsonWebHandler *setSeinHandler = new AsyncCallbackJsonWebHandler("/set-mode-sein", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                { handleSetModeSein(request, json); });
  AsyncCallbackJsonWebHandler *setLedCountsHandler = new AsyncCallbackJsonWebHandler("/set-led-counts", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                     { handleSetLedCounts(request, json); });
  AsyncCallbackJsonWebHandler *setWelcomeHandler = new AsyncCallbackJsonWebHandler("/set-welcome", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                   { handleSetWelcome(request, json); });
  AsyncCallbackJsonWebHandler *savePresetHandler = new AsyncCallbackJsonWebHandler("/save-preset", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                   { handleSavePreset(request, json); });
  AsyncCallbackJsonWebHandler *loadPresetHandler = new AsyncCallbackJsonWebHandler("/load-preset", [](AsyncWebServerRequest *request, JsonVariant &json)
                                                                                   { handleLoadPreset(request, json); });

  server.addHandler(setAlisHandler);
  server.addHandler(setShroudHandler);
  server.addHandler(setDemonHandler);
  server.addHandler(setSeinHandler);
  server.addHandler(setLedCountsHandler);
  server.addHandler(setWelcomeHandler);
  server.addHandler(savePresetHandler);
  server.addHandler(loadPresetHandler);

  server.on("/preview-welcome", HTTP_POST, handlePreviewWelcome);
  server.on("/get-preset-name", HTTP_GET, handleGetPresetName);
  server.on("/reset-factory", HTTP_POST, handleResetFactory);

  server.onNotFound([](AsyncWebServerRequest *request)
                    { request->send(404, "text/plain", "Not found"); });

  server.begin();
  Serial.println("HTTP server and WebSocket started");
}

void loop()
{
  ws.cleanupClients();
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis < loopInterval)
    return;
  previousMillis = currentMillis;
  animStep++;

  bool seinKiriNyala = (digitalRead(PIN_INPUT_SEIN_KIRI) == LOW);
  bool seinKananNyala = (digitalRead(PIN_INPUT_SEIN_KANAN) == LOW);
  static bool lastSeinState = false;

  if (seinKiriNyala || seinKananNyala)
  {
    if (!lastSeinState)
    {
      stateChanged = true;
    }
    lastSeinState = true;
    jalankanModeSein(seinKiriNyala, seinKananNyala);
  }
  else
  {
    if (lastSeinState)
    {
      stateChanged = true;
    }
    lastSeinState = false;
    if (isWelcomeActive)
    {
      jalankanModeWelcome();
    }
    else
    {
      jalankanModeLampu(alisConfig, ledsAlisKiri, ledCounts.alis);
      jalankanModeLampu(shroudConfig, ledsShroudKiri, ledCounts.shroud);
      jalankanModeLampu(demonConfig, ledsDemonKiri, ledCounts.demon);
    }
  }

  memcpy(ledsAlisKanan, ledsAlisKiri, sizeof(CRGB) * ledCounts.alis);
  memcpy(ledsShroudKanan, ledsShroudKiri, sizeof(CRGB) * ledCounts.shroud);
  memcpy(ledsDemonKanan, ledsDemonKiri, sizeof(CRGB) * ledCounts.demon);

  FastLED.show();

  if (stateChanged)
  {
    broadcastState();
    stateChanged = false;
  }
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  if (type == WS_EVT_CONNECT)
  {
    Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
    JsonDocument doc;
    serializeState(doc);
    String jsonString;
    serializeJson(doc, jsonString);
    client->text(jsonString);
  }
  else if (type == WS_EVT_DISCONNECT)
  {
    Serial.printf("WebSocket client #%u disconnected\n", client->id());
  }
}

void serializeState(JsonDocument &doc)
{
  JsonObject state = doc.to<JsonObject>();
  auto serializeLight = [&](JsonObject &obj, LightConfig &cfg)
  {
    obj["mode"] = cfg.mode;
    obj["kecepatan"] = cfg.kecepatan;
    JsonObject stateKiri = obj["stateKiri"].to<JsonObject>();
    stateKiri["kecerahan"] = cfg.stateKiri.kecerahan;
    JsonArray warna = stateKiri["warna"].to<JsonArray>();
    for (int i = 0; i < 3; i++)
    {
      JsonArray c = warna.add<JsonArray>();
      c.add(cfg.stateKiri.warna[i].r);
      c.add(cfg.stateKiri.warna[i].g);
      c.add(cfg.stateKiri.warna[i].b);
    }
  };
  JsonObject alis = state["alis"].to<JsonObject>();
  serializeLight(alis, alisConfig);
  JsonObject shroud = state["shroud"].to<JsonObject>();
  serializeLight(shroud, shroudConfig);
  JsonObject demon = state["demon"].to<JsonObject>();
  serializeLight(demon, demonConfig);

  JsonObject sein = state["sein"].to<JsonObject>();
  sein["mode"] = seinConfig.mode;
  sein["kecepatan"] = seinConfig.kecepatan;
  JsonArray seinWarna = sein["warna"].to<JsonArray>();
  seinWarna.add(seinConfig.warna.r);
  seinWarna.add(seinConfig.warna.g);
  seinWarna.add(seinConfig.warna.b);

  JsonObject counts = state["ledCounts"].to<JsonObject>();
  counts["alis"] = ledCounts.alis;
  counts["shroud"] = ledCounts.shroud;
  counts["demon"] = ledCounts.demon;
  counts["sein"] = ledCounts.sein;

  JsonObject welcome = state["welcome"].to<JsonObject>();
  welcome["mode"] = welcomeConfig.mode;
  welcome["durasi"] = welcomeConfig.durasi;
}

void deserializeLightConfig(JsonObject &lightObj, LightConfig &config)
{
  if (lightObj.isNull())
    return;
  config.mode = lightObj["mode"] | config.mode;
  config.kecepatan = lightObj["kecepatan"] | config.kecepatan;
  JsonObject stateKiri = lightObj["stateKiri"];
  if (!stateKiri.isNull())
  {
    config.stateKiri.kecerahan = stateKiri["kecerahan"] | config.stateKiri.kecerahan;
    JsonArray warna = stateKiri["warna"];
    if (!warna.isNull())
    {
      for (int i = 0; i < 3 && i < warna.size(); i++)
      {
        JsonArray c = warna[i];
        config.stateKiri.warna[i].r = c[0];
        config.stateKiri.warna[i].g = c[1];
        config.stateKiri.warna[i].b = c[2];
      }
    }
  }
}

void deserializeState(JsonObject &stateObj)
{
  if (stateObj.isNull())
    return;
  JsonObject alisObj = stateObj["alis"];
  deserializeLightConfig(alisObj, alisConfig);
  JsonObject shroudObj = stateObj["shroud"];
  deserializeLightConfig(shroudObj, shroudConfig);
  JsonObject demonObj = stateObj["demon"];
  deserializeLightConfig(demonObj, demonConfig);

  JsonObject seinObj = stateObj["sein"];
  if (!seinObj.isNull())
  {
    seinConfig.mode = seinObj["mode"] | seinConfig.mode;
    seinConfig.kecepatan = seinObj["kecepatan"] | seinConfig.kecepatan;
    JsonArray seinWarna = seinObj["warna"];
    if (!seinWarna.isNull())
    {
      seinConfig.warna = CRGB(seinWarna[0], seinWarna[1], seinWarna[2]);
    }
  }

  JsonObject countsObj = stateObj["ledCounts"];
  if (!countsObj.isNull())
  {
    ledCounts.alis = countsObj["alis"] | ledCounts.alis;
    ledCounts.shroud = countsObj["shroud"] | ledCounts.shroud;
    ledCounts.demon = countsObj["demon"] | ledCounts.demon;
    ledCounts.sein = countsObj["sein"] | ledCounts.sein;
  }

  JsonObject welcomeObj = stateObj["welcome"];
  if (!welcomeObj.isNull())
  {
    welcomeConfig.mode = welcomeObj["mode"] | welcomeConfig.mode;
    welcomeConfig.durasi = welcomeObj["durasi"] | welcomeConfig.durasi;
  }
}

void broadcastState()
{
  if (ws.count() == 0)
    return;
  JsonDocument doc;
  serializeState(doc);
  String jsonString;
  serializeJson(doc, jsonString);
  ws.textAll(jsonString);
  Serial.println("Broadcasting state to all clients");
}

void handleGetState(AsyncWebServerRequest *request)
{
  JsonDocument doc;
  serializeState(doc);
  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

void handleSetModeLampu(AsyncWebServerRequest *request, JsonVariant &json, LightConfig &config)
{
  JsonObject obj = json.as<JsonObject>();
  bool needsSave = false;
  if (!obj["mode"].isNull())
  {
    config.mode = obj["mode"];
    needsSave = true;
  }
  if (!obj["kecepatan"].isNull())
  {
    config.kecepatan = obj["kecepatan"];
    needsSave = true;
  }
  if (!obj["kecerahan"].isNull())
  {
    config.stateKiri.kecerahan = obj["kecerahan"];
    needsSave = true;
  }
  if (!obj["r"].isNull() && !obj["g"].isNull() && !obj["b"].isNull() && !obj["colorIndex"].isNull())
  {
    uint8_t index = obj["colorIndex"];
    if (index < 3)
    {
      config.stateKiri.warna[index] = CRGB(obj["r"], obj["g"], obj["b"]);
      needsSave = true;
    }
  }
  if (needsSave)
  {
    simpanPengaturan();
    stateChanged = true;
  }
  request->send(200, "text/plain", "OK");
}

void handleSetModeSein(AsyncWebServerRequest *request, JsonVariant &json)
{
  JsonObject obj = json.as<JsonObject>();
  bool needsSave = false;
  if (!obj["mode"].isNull())
  {
    seinConfig.mode = obj["mode"];
    needsSave = true;
  }
  if (!obj["kecepatan"].isNull())
  {
    seinConfig.kecepatan = obj["kecepatan"];
    needsSave = true;
  }
  if (!obj["r"].isNull() && !obj["g"].isNull() && !obj["b"].isNull())
  {
    seinConfig.warna = CRGB(obj["r"], obj["g"], obj["b"]);
    needsSave = true;
  }
  if (needsSave)
  {
    simpanPengaturan();
    stateChanged = true;
  }
  request->send(200, "text/plain", "OK");
}

void handleSetLedCounts(AsyncWebServerRequest *request, JsonVariant &json)
{
  JsonObject obj = json.as<JsonObject>();
  ledCounts.alis = obj["alis"] | ledCounts.alis;
  ledCounts.shroud = obj["shroud"] | ledCounts.shroud;
  ledCounts.demon = obj["demon"] | ledCounts.demon;
  ledCounts.sein = obj["sein"] | ledCounts.sein;
  simpanPengaturan();
  stateChanged = true;
  request->send(200, "text/plain", "OK");
}

void handleSetWelcome(AsyncWebServerRequest *request, JsonVariant &json)
{
  JsonObject obj = json.as<JsonObject>();
  welcomeConfig.mode = obj["mode"] | welcomeConfig.mode;
  welcomeConfig.durasi = obj["durasi"] | welcomeConfig.durasi;
  simpanPengaturan();
  stateChanged = true;
  request->send(200, "text/plain", "OK");
}

void handlePreviewWelcome(AsyncWebServerRequest *request)
{
  isWelcomeActive = true;
  welcomeStartTime = 0;
  request->send(200, "text/plain", "OK");
}

void handleLoadPreset(AsyncWebServerRequest *request, JsonVariant &json)
{
  int slot = json["slot"];
  File file = LittleFS.open("/presets.json", "r");
  if (!file)
  {
    request->send(500, "text/plain", "Gagal buka file preset");
    return;
  }

  JsonDocument doc;
  deserializeJson(doc, file);
  file.close();

  JsonArray presets = doc.as<JsonArray>();
  for (JsonObject p : presets)
  {
    if (p["slot"] == slot)
    {
      JsonObject stateObj = p["state"];
      if (stateObj.isNull())
      {
        request->send(404, "text/plain", "Preset kosong");
        return;
      }
      deserializeState(stateObj);
      simpanPengaturan();
      stateChanged = true;
      request->send(200, "text/plain", "Preset dimuat");
      return;
    }
  }
  request->send(404, "text/plain", "Slot tidak ditemukan");
}

void handleSavePreset(AsyncWebServerRequest *request, JsonVariant &json)
{
  int slot = json["slot"];
  String name = json["name"];

  File file = LittleFS.open("/presets.json", "r");
  if (!file)
  {
    request->send(500, "text/plain", "Gagal buka file preset");
    return;
  }

  JsonDocument doc;
  deserializeJson(doc, file);
  file.close();

  JsonArray presets = doc.as<JsonArray>();
  bool found = false;
  for (JsonObject p : presets)
  {
    if (p["slot"] == slot)
    {
      p["name"] = name;
      JsonDocument stateDoc;
      serializeState(stateDoc);
      p["state"] = stateDoc.as<JsonObject>();
      found = true;
      break;
    }
  }

  if (!found)
  {
    request->send(404, "text/plain", "Slot tidak ditemukan");
    return;
  }

  file = LittleFS.open("/presets.json", "w");
  if (serializeJson(doc, file) == 0)
  {
    request->send(500, "text/plain", "Gagal tulis file preset");
  }
  else
  {
    request->send(200, "text/plain", "Preset disimpan");
  }
  file.close();
}

void handleGetPresetName(AsyncWebServerRequest *request)
{
  if (!request->hasParam("slot"))
  {
    request->send(400, "text/plain", "Bad Request");
    return;
  }
  int slot = request->getParam("slot")->value().toInt();
  File file = LittleFS.open("/presets.json", "r");
  if (!file)
  {
    request->send(500, "text/plain", "Preset file not found");
    return;
  }

  JsonDocument doc;
  deserializeJson(doc, file);
  file.close();

  JsonArray presets = doc.as<JsonArray>();
  for (JsonObject p : presets)
  {
    if (p["slot"] == slot)
    {
      String name = p["name"];
      String summary = "Kosong";
      JsonObject state = p["state"];
      if (!state.isNull())
      {
        int alisMode = state["alis"]["mode"] | 0;
        if (alisMode < numEffects)
        {
          summary = "Alis: " + String(effectNames[alisMode]);
        }
      }
      request->send(200, "application/json", "{\"name\":\"" + name + "\",\"summary\":\"" + summary + "\"}");
      return;
    }
  }
  request->send(404, "text/plain", "Slot not found");
}

void handleResetFactory(AsyncWebServerRequest *request)
{
  resetToDefaults();
  stateChanged = true;
  request->send(200, "text/plain", "OK");
  delay(1000);
  ESP.restart();
}

void jalankanModeLampu(LightConfig &config, CRGB *leds, uint8_t ledCount)
{
  fill_solid(leds, MAX_LEDS, CRGB::Black);
  if (ledCount == 0 || config.mode >= numEffects)
    return;
  uint8_t originalBrightness = FastLED.getBrightness();
  FastLED.setBrightness(config.stateKiri.kecerahan);
  uint8_t mapped_speed = map(config.kecepatan, 0, 100, 1, 15);
  EffectParams params = {leds, (uint16_t)ledCount, animStep, mapped_speed, config.stateKiri.warna[0], config.stateKiri.warna[1], config.stateKiri.warna[2]};
  effectRegistry[config.mode](params);
  FastLED.setBrightness(originalBrightness);
}

void jalankanModeSein(bool isKiriActive, bool isKananActive)
{
  FastLED.clear();
  if (isKiriActive && seinConfig.mode < numSeinEffects)
  {
    SeinEffectParams params = {ledsAlisKiri, (uint16_t)ledCounts.sein, seinConfig.kecepatan, seinConfig.warna};
    seinEffectRegistry[seinConfig.mode](params);
  }
  if (isKananActive && seinConfig.mode < numSeinEffects)
  {
    SeinEffectParams params = {ledsAlisKanan, (uint16_t)ledCounts.sein, seinConfig.kecepatan, seinConfig.warna};
    seinEffectRegistry[seinConfig.mode](params);
  }
}

void jalankanModeWelcome()
{
  if (welcomeStartTime == 0)
    welcomeStartTime = millis();
  uint32_t elapsed = millis() - welcomeStartTime;
  uint32_t duration = welcomeConfig.durasi * 1000;
  if (elapsed > duration)
  {
    isWelcomeActive = false;
    welcomeStartTime = 0;
    return;
  }
  fill_solid(ledsAlisKiri, ledCounts.alis, CRGB::Black);
  if (welcomeConfig.mode < numWelcomeEffects)
  {
    WelcomeEffectParams params = {ledsAlisKiri, (uint16_t)ledCounts.alis, elapsed, duration, alisConfig.stateKiri.warna[0], alisConfig.stateKiri.warna[1], alisConfig.stateKiri.warna[2]};
    welcomeEffectRegistry[welcomeConfig.mode](params);
  }
}

void simpanPengaturan()
{
  prefs.begin("config-v22", false);
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

void bacaPengaturan()
{
  prefs.begin("config-v22", true);
  if (prefs.getUChar("version", 0) != CONFIG_VERSION)
  {
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

void resetToDefaults()
{
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

void initializePresets()
{
  if (LittleFS.exists("/presets.json"))
    return;
  File file = LittleFS.open("/presets.json", "w");
  if (!file)
  {
    Serial.println("Gagal membuat file preset");
    return;
  }
  JsonDocument doc;
  JsonArray presets = doc.to<JsonArray>();
  for (int i = 1; i <= 5; i++)
  {
    JsonObject p = presets.add<JsonObject>();
    p["slot"] = i;
    p["name"] = "Preset " + String(i);
  }
  serializeJson(doc, file);
  file.close();
}
