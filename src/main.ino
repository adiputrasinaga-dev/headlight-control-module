/*
 * ===================================================================================
 * AERI LIGHT v17.9 - FIRMWARE (DEPRECATION WARNINGS FIXED)
 * ===================================================================================
 * Deskripsi:
 * Firmware ESP32 yang telah diperbarui untuk menghilangkan peringatan "deprecated"
 * dari library ArduinoJson. Fungsi `containsKey()` telah diganti dengan metode
 * `obj[key].is<T>()` yang lebih modern.
 *
 * Perubahan Utama:
 * 1.  Modernisasi ArduinoJson: Mengganti semua pemanggilan `containsKey()` di dalam
 * fungsi `handleLoadPreset` dan `deserializeLightConfig`.
 * 2.  Kode Lebih Bersih: Menghilangkan peringatan saat kompilasi.
 * 3.  Future-Proofing: Memastikan kompatibilitas dengan versi ArduinoJson mendatang.
 * ===================================================================================
 */

// --- Library ---
#include <WiFi.h>
#include <FastLED.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

// --- Konfigurasi Jaringan Access Point ---
const char *AP_SSID = "AERI_LIGHT";   // Nama WiFi yang dibuat perangkat
const char *AP_PASSWORD = "12345678"; // Password untuk WiFi perangkat

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

  // --- Setup WiFi dalam Mode Access Point (AP) ---
  Serial.print("Membuat Access Point: ");
  Serial.println(AP_SSID);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP()); // Alamat IP default biasanya 192.168.4.1

  // --- Konfigurasi Server ---
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
  uint8_t globalBrightness = FastLED.getBrightness();
  FastLED.setBrightness(config.brightness);
  auto animate = [&](const LightState &state, CRGB *leds, uint8_t count)
  {
    fill_solid(leds, MAX_LEDS, CRGB::Black);
    if (count == 0)
      return;
    uint8_t currentSpeed = map(config.speed, 0, 100, 1, 15);
    uint8_t currentIntensity = 80;
    switch (state.modeEfek)
    {
    case 0:
      fill_solid(leds, count, state.warna);
      break;
    case 1:
    {
      CRGB tempColor = state.warna;
      fill_solid(leds, count, tempColor.nscale8(sin8(animStep * currentSpeed)));
    }
    break;
    case 2:
      fill_rainbow(leds, count, animStep * currentSpeed, 256 / count);
      break;
    case 3:
    {
      float p = fmod((float)animStep * currentSpeed * 0.5, (float)count + 15);
      fadeToBlackBy(leds, count, 64);
      if ((int)p < count)
        leds[(int)p] = state.warna;
    }
    break;
    case 4:
    {
      int p = map(triwave8((animStep * currentSpeed) / 2), 0, 255, 0, count - 4);
      fadeToBlackBy(leds, count, 64);
      if (p >= 0 && (p + 3) < count)
      {
        for (int i = 0; i < 4; i++)
          leds[p + i] = state.warna;
      }
    }
    break;
    case 5:
    {
      fadeToBlackBy(leds, count, 40);
      if (random8() < currentIntensity)
        leds[random16(count)] = (random8() < 128) ? state.warna : state.warna2;
    }
    break;
    case 6:
    {
      for (int i = 0; i < count; i++)
        leds[i].nscale8(192);
      if (random8() < currentIntensity)
        leds[random16(count)] = HeatColor(random8(160, 255));
    }
    break;
    case 7:
      fl::fill_gradient_RGB(leds, count, state.warna, state.warna2, state.warna3);
      break;
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
  FastLED.setBrightness(globalBrightness);
}
void jalankanModeSein(bool isKiriActive, bool isKananActive)
{
  auto animate = [&](uint8_t mode, CRGB *leds, uint8_t count)
  {
    if (count == 0)
      return;
    uint16_t animSpeed = map(seinConfig.speed, 0, 100, 25, 5);
    switch (mode)
    {
    case 0:
    {
      uint16_t pos = (millis() / animSpeed) % (count + 5);
      fill_solid(leds, count, CRGB::Black);
      if (pos < count)
        fill_solid(leds, pos + 1, seinConfig.warna);
    }
    break;
    case 1:
    {
      fill_solid(leds, count, (millis() / 500) % 2 ? seinConfig.warna : CRGB::Black);
    }
    break;
    case 2:
    {
      uint16_t c = (millis() / (animSpeed * count));
      if (c % 2 == 0)
      {
        uint16_t p = (millis() / animSpeed) % count;
        fill_solid(leds, p + 1, seinConfig.warna);
      }
      else
      {
        fill_solid(leds, count, CRGB::Black);
      }
    }
    break;
    case 3:
    {
      float p = fmod((float)millis() / (animSpeed * 0.5), (float)count + 10);
      fadeToBlackBy(leds, count, 40);
      if (p < count)
        leds[(int)p] = seinConfig.warna;
    }
    break;
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
  switch (globalConfig.modeWelcome)
  {
  case 0:
  {
    int p = map(triwave8(map(elapsed, 0, duration, 0, 255)), 0, 255, 0, count - 1);
    fill_solid(ledsAlisKiri, count, CRGB::Black);
    if (p >= 0 && p < count)
      ledsAlisKiri[p] = CRGB::Red;
  }
  break;
  case 1:
  {
    uint8_t b = map(elapsed, 0, duration, 0, (count / 2) + 1);
    for (int i = 0; i < b; i++)
    {
      if ((count / 2 + i) < count)
        ledsAlisKiri[count / 2 + i] = CRGB::Orange;
      if ((count / 2 - i) >= 0)
        ledsAlisKiri[count / 2 - i] = CRGB::Orange;
    }
  }
  break;
  case 2:
  {
    if (elapsed < duration / 2)
    {
      fill_rainbow(ledsAlisKiri, count, map(elapsed, 0, duration / 2, 0, 255), 256 / count);
    }
    else
    {
      CRGB t = alisConfig.stateKiri.warna;
      uint8_t a = map(elapsed, duration / 2, duration, 0, 255);
      for (int i = 0; i < count; i++)
      {
        ledsAlisKiri[i] = blend(ledsAlisKiri[i], t, a);
      }
    }
  }
  break;
  case 3:
  {
    uint16_t p = map(elapsed, 0, duration, 0, count / 2);
    fill_solid(ledsAlisKiri, count, CRGB::Black);
    for (int i = 0; i < p; i++)
    {
      if (i < count)
        ledsAlisKiri[i] = CRGB::Blue;
      if ((count - 1 - i) >= 0)
        ledsAlisKiri[count - 1 - i] = CRGB::Blue;
    }
  }
  break;
  }
  if (count > 0)
  {
    memcpy(ledsAlisKanan, ledsAlisKiri, sizeof(CRGB) * count);
  }
}
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
    // PERBAIKAN: Menggunakan obj.is<T>() untuk pemeriksaan yang aman
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
  // PERBAIKAN: Menggunakan obj.is<T>() untuk pemeriksaan yang aman
  if (obj["target"].is<const char *>())
  {
    strncpy(config.target, obj["target"], sizeof(config.target) - 1);
  }
  JsonObject sk = obj["stateKiri"].as<JsonObject>();
  if (!sk.isNull())
  {
    config.stateKiri.modeEfek = sk["modeEfek"] | config.stateKiri.modeEfek;
    // PERBAIKAN: Menggunakan obj.is<T>() untuk pemeriksaan yang aman
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