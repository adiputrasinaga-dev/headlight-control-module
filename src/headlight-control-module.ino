/*
 * ===================================================================================
 * AERI LIGHT v17.2 - FIRMWARE FINAL (UTUH)
 * ===================================================================================
 * Deskripsi:
 * Firmware ESP32 yang telah disempurnakan untuk AERI LIGHT Headlight Control Module.
 * Versi ini adalah versi utuh yang mencakup semua fungsionalitas.
 *
 * Fitur Utama yang Diimplementasikan:
 * 1.  Struktur Kode: Dikonversi ke file .ino tunggal untuk kemudahan kompilasi di Arduino IDE.
 * 2.  Keamanan: Menambahkan autentikasi berbasis PIN via header HTTP 'X-Auth-PIN'.
 * 3.  Non-Blocking Preview: Fitur pratinjau jumlah LED diubah menjadi non-blocking.
 * 4.  Stabilitas: Menjaga semua fungsionalitas asli tetap berjalan.
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
#include <DNSServer.h>

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
const uint8_t CONFIG_VERSION = 18; // Versi konfigurasi dinaikkan

// --- Konfigurasi Jaringan & Keamanan ---
const char *ap_provision_ssid = "AERI_LIGHT_SETUP";
const char *ap_control_ssid = "AlisBelang";
const char *ap_password = "12345678";
char authPin[7] = "123456"; // PIN default

// === State Management Structs ===
struct WifiCredentials
{
  char ssid[32] = "";
  char password[64] = "";
  bool configured = false;
};

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
WifiCredentials homeWifi;
LightConfig alisConfig, shroudConfig, demonConfig;
SeinConfig seinConfig;
GlobalConfig globalConfig;

CRGB ledsAlisKiri[MAX_LEDS], ledsAlisKanan[MAX_LEDS];
CRGB ledsShroudKiri[MAX_LEDS], ledsShroudKanan[MAX_LEDS];
CRGB ledsDemonKiri[MAX_LEDS], ledsDemonKanan[MAX_LEDS];

Preferences prefs;
AsyncWebServer server(80);
DNSServer dnsServer;

unsigned long previousMillis = 0;
const long loopInterval = 16; // Target ~60 FPS

bool isWelcomeActive = true;
bool isSavingPrefs = false;
bool provisioningMode = false;
uint16_t animStep = 0;

// --- Variabel untuk Fitur Pratinjau Non-Blocking ---
bool isPreviewing = false;
unsigned long previewEndTime = 0;
CRGB *previewLedsKiri = nullptr;
CRGB *previewLedsKanan = nullptr;
uint8_t previewLedCount = 0;

// --- Prototipe Fungsi ---
void resetToDefaults(bool fullReset);
void simpanPengaturan();
void bacaPengaturan();
void simpanKredensialWiFi();
void bacaKredensialWiFi();
void jalankanModeWelcome();
void jalankanModeSein(bool isKiriActive, bool isKananActive);
void jalankanModeLampu(LightConfig &config, CRGB *ledsKiri, CRGB *ledsKanan);
void handleGetState(AsyncWebServerRequest *request);
void handleSetConfig(AsyncWebServerRequest *request);
void handleSetModeLampu(AsyncWebServerRequest *request, LightConfig &config);
void handleSetModeSein(AsyncWebServerRequest *request);
void handleSetModeWelcome(AsyncWebServerRequest *request);
void handleReset(AsyncWebServerRequest *request);
void handleScanNetworks(AsyncWebServerRequest *request);
void handleSaveCredentials(AsyncWebServerRequest *request);
void handleGetPresets(AsyncWebServerRequest *request);
void handleSavePreset(AsyncWebServerRequest *request);
void handleLoadPreset(AsyncWebServerRequest *request);
void handlePreviewLedCount(AsyncWebServerRequest *request);
void initializePresets();
void serializeLightConfig(JsonObject &obj, const LightConfig &config);
void deserializeLightConfig(const JsonObject &obj, LightConfig &config);
bool isAuthenticated(AsyncWebServerRequest *request);
void handleUpdateAuth(AsyncWebServerRequest *request);

// ===================================================================
//   SETUP
// ===================================================================
void setup()
{
  Serial.begin(115200);

  if (!SPIFFS.begin(true))
  {
    Serial.println("SPIFFS Mount Failed");
    return;
  }

  initializePresets();

  FastLED.addLeds<LED_TYPE, PIN_ALIS_KIRI, COLOR_ORDER>(ledsAlisKiri, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_ALIS_KANAN, COLOR_ORDER>(ledsAlisKanan, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_SHROUD_KIRI, COLOR_ORDER>(ledsShroudKiri, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_SHROUD_KANAN, COLOR_ORDER>(ledsShroudKanan, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_DEMON_KIRI, COLOR_ORDER>(ledsDemonKiri, MAX_LEDS);
  FastLED.addLeds<LED_TYPE, PIN_DEMON_KANAN, COLOR_ORDER>(ledsDemonKanan, MAX_LEDS);

  pinMode(PIN_INPUT_SEIN_KIRI, INPUT_PULLUP);
  pinMode(PIN_INPUT_SEIN_KANAN, INPUT_PULLUP);

  bacaKredensialWiFi();

  if (provisioningMode)
  {
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_provision_ssid);
    dnsServer.start(53, "*", WiFi.softAPIP());

    server.serveStatic("/", SPIFFS, "/").setDefaultFile("setup.html");
    server.on("/scan-networks", HTTP_GET, handleScanNetworks);
    server.on("/save-credentials", HTTP_POST, handleSaveCredentials);
    server.onNotFound([](AsyncWebServerRequest *request)
                      { request->redirect("/"); });
  }
  else
  {
    bacaPengaturan();
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(ap_control_ssid, ap_password);
    dnsServer.start(53, "*", WiFi.softAPIP());
    WiFi.begin(homeWifi.ssid, homeWifi.password);

    server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");

    // API Endpoints
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
    server.on("/update-auth", HTTP_POST, handleUpdateAuth);

    // Preset Endpoints
    server.on("/get-presets", HTTP_GET, handleGetPresets);
    server.on("/save-preset", HTTP_POST, handleSavePreset);
    server.on("/load-preset", HTTP_POST, handleLoadPreset);

    // Action Endpoints
    server.on("/preview-led-count", HTTP_POST, handlePreviewLedCount);

    server.onNotFound([](AsyncWebServerRequest *request)
                      { request->redirect("http://" + request->host()); });
  }

  server.begin();
  Serial.println("HTTP server started");
}

// ===================================================================
//   MAIN LOOP
// ===================================================================
void loop()
{
  dnsServer.processNextRequest();

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis < loopInterval)
    return;
  previousMillis = currentMillis;
  animStep++;

  bool seinKiriNyala = (digitalRead(PIN_INPUT_SEIN_KIRI) == LOW);
  bool seinKananNyala = (digitalRead(PIN_INPUT_SEIN_KANAN) == LOW);

  // Logika prioritas render
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
      // Clear all LEDs before preview
      FastLED.clear();
      fill_solid(previewLedsKiri, previewLedCount, CRGB::White);
      fill_solid(previewLedsKanan, previewLedCount, CRGB::White);
    }
  }
  else if (seinKiriNyala || seinKananNyala)
  {
    FastLED.clear(); // Clear all other effects
    jalankanModeSein(seinKiriNyala, seinKananNyala);
  }
  else if (isWelcomeActive && !provisioningMode)
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

// ===================================================================
//   FUNGSI AUTENTIKASI
// ===================================================================
bool isAuthenticated(AsyncWebServerRequest *request)
{
  if (request->hasHeader("X-Auth-PIN"))
  {
    if (request->header("X-Auth-PIN") == String(authPin))
    {
      return true;
    }
  }
  request->send(401, "text/plain", "Unauthorized: Invalid or missing PIN");
  return false;
}

// ===================================================================
//   FUNGSI MANAJEMEN PENGATURAN & STATE
// ===================================================================

void resetToDefaults(bool fullReset)
{
  alisConfig = LightConfig();
  shroudConfig = LightConfig();
  demonConfig = LightConfig();
  seinConfig = SeinConfig();
  globalConfig = GlobalConfig();
  strcpy(authPin, "123456");
  isWelcomeActive = true;
  Serial.println("State dikembalikan ke default.");
  simpanPengaturan();

  if (fullReset)
  {
    prefs.begin("wifi-creds", false);
    prefs.clear();
    prefs.end();
  }
}

void simpanPengaturan()
{
  if (isSavingPrefs)
    return;
  isSavingPrefs = true;
  prefs.begin("config-v18", false);
  prefs.putUChar("version", CONFIG_VERSION);
  prefs.putBytes("alis", &alisConfig, sizeof(LightConfig));
  prefs.putBytes("shroud", &shroudConfig, sizeof(LightConfig));
  prefs.putBytes("demon", &demonConfig, sizeof(LightConfig));
  prefs.putBytes("sein", &seinConfig, sizeof(SeinConfig));
  prefs.putBytes("global", &globalConfig, sizeof(GlobalConfig));
  prefs.putString("authPin", authPin);
  prefs.end();
  isSavingPrefs = false;
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
    String savedPin = prefs.getString("authPin", "123456");
    strncpy(authPin, savedPin.c_str(), sizeof(authPin) - 1);
    authPin[6] = '\0'; // Pastikan null-terminated
  }
  else
  {
    prefs.end();
    resetToDefaults(false);
    return;
  }
  prefs.end();
}

void simpanKredensialWiFi()
{
  prefs.begin("wifi-creds", false);
  prefs.putBytes("creds", &homeWifi, sizeof(WifiCredentials));
  prefs.end();
}

void bacaKredensialWiFi()
{
  prefs.begin("wifi-creds", true);
  if (prefs.getBytesLength("creds") == sizeof(WifiCredentials))
  {
    prefs.getBytes("creds", &homeWifi, sizeof(WifiCredentials));
  }
  else
  {
    homeWifi.configured = false;
  }
  prefs.end();

  provisioningMode = !homeWifi.configured;
}

// ===================================================================
//   FUNGSI LOGIKA & ANIMASI LED
// ===================================================================
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
    case 0: // Statis
      fill_solid(leds, count, state.warna);
      break;
    case 1: // Breathing
    {
      CRGB tempColor = state.warna;
      fill_solid(leds, count, tempColor.nscale8(sin8(animStep * currentSpeed)));
    }
    break;
    case 2: // Rainbow
      fill_rainbow(leds, count, animStep * currentSpeed, 256 / count);
      break;
    case 3: // Comet
    {
      float p = fmod((float)animStep * currentSpeed * 0.5, (float)count + 15);
      fadeToBlackBy(leds, count, 64);
      if ((int)p < count)
        leds[(int)p] = state.warna;
    }
    break;
    case 4: // Cylon Scanner
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
    case 5: // Twinkle
    {
      fadeToBlackBy(leds, count, 40);
      if (random8() < currentIntensity)
        leds[random16(count)] = (random8() < 128) ? state.warna : state.warna2;
    }
    break;
    case 6: // Fire
    {
      for (int i = 0; i < count; i++)
        leds[i].nscale8(192);
      if (random8() < currentIntensity)
        leds[random16(count)] = HeatColor(random8(160, 255));
    }
    break;
    case 7: // Gradient Shift
      fill_gradient_RGB(leds, count, state.warna, state.warna2, state.warna3);
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
  { // keduanya
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
    uint16_t animSpeed = map(seinConfig.speed, 0, 100, 25, 5); // Speed inverted
    switch (mode)
    {
    case 0: // Sequential
    {
      uint16_t pos = (millis() / animSpeed) % (count + 5);
      fill_solid(leds, count, CRGB::Black);
      if (pos < count)
        fill_solid(leds, pos + 1, seinConfig.warna);
    }
    break;
    case 1: // Pulsing Arrow
    {
      fill_solid(leds, count, (millis() / 500) % 2 ? seinConfig.warna : CRGB::Black);
    }
    break;
    case 2: // Fill & Flush
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
    case 3: // Comet Trail
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
  case 0: // Power-On Scan
  {
    int p = map(triwave8(map(elapsed, 0, duration, 0, 255)), 0, 255, 0, count - 1);
    fill_solid(ledsAlisKiri, count, CRGB::Black);
    if (p >= 0 && p < count)
      ledsAlisKiri[p] = CRGB::Red;
  }
  break;
  case 1: // Ignition Burst
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
  case 2: // Spectrum Resolve
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
  case 3: // Theater Chase
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

// ===================================================================
//   HANDLER UNTUK ENDPOINT WEB SERVER
// ===================================================================
void handleGetState(AsyncWebServerRequest *request)
{
  StaticJsonDocument<2048> doc;
  JsonObject alis = doc.createNestedObject("alis");
  serializeLightConfig(alis, alisConfig);
  JsonObject shroud = doc.createNestedObject("shroud");
  serializeLightConfig(shroud, shroudConfig);
  JsonObject demon = doc.createNestedObject("demon");
  serializeLightConfig(demon, demonConfig);

  JsonObject sein = doc.createNestedObject("sein");
  sein["ledCount"] = seinConfig.ledCount;
  sein["mode"] = seinConfig.mode;
  JsonArray seinColor = sein.createNestedArray("warna");
  seinColor.add(seinConfig.warna.r);
  seinColor.add(seinConfig.warna.g);
  seinColor.add(seinConfig.warna.b);
  sein["speed"] = seinConfig.speed;

  JsonObject global = doc.createNestedObject("global");
  global["modeWelcome"] = globalConfig.modeWelcome;
  global["durasiWelcome"] = globalConfig.durasiWelcome;

  doc["authPinDefault"] = String(authPin);

  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

void handleSetModeLampu(AsyncWebServerRequest *request, LightConfig &config)
{
  if (!isAuthenticated(request))
    return;

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
  if (!isAuthenticated(request))
    return;
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
  if (!isAuthenticated(request))
    return;
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
  if (!isAuthenticated(request))
    return;
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

void handleUpdateAuth(AsyncWebServerRequest *request)
{
  if (!isAuthenticated(request))
    return;
  if (request->hasParam("newPin", true))
  {
    String newPin = request->getParam("newPin", true)->value();
    if (newPin.length() == 6 && newPin.toInt() >= 0)
    {
      strncpy(authPin, newPin.c_str(), sizeof(authPin) - 1);
      authPin[6] = '\0'; // Ensure null termination
      simpanPengaturan();
      request->send(200, "text/plain", "PIN Updated");
    }
    else
    {
      request->send(400, "text/plain", "Invalid PIN format");
    }
  }
  else
  {
    request->send(400, "text/plain", "Bad Request");
  }
}

void handlePreviewLedCount(AsyncWebServerRequest *request)
{
  if (!isAuthenticated(request))
    return;
  if (request->hasParam("ledTarget", true) && request->hasParam("ledCount", true))
  {
    String target = request->getParam("ledTarget", true)->value();
    uint8_t count = constrain(request->getParam("ledCount", true)->value().toInt(), 0, MAX_LEDS);

    isPreviewing = true;
    previewEndTime = millis() + 2000; // Preview for 2 seconds
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
  if (!isAuthenticated(request))
    return;
  resetToDefaults(true);
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
      JsonObject o = p.createNestedObject();
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
  if (!isAuthenticated(request))
    return;
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
    if (!t)
    {
      t = p.createNestedObject();
      t["slot"] = s;
    }

    t["name"] = n;
    JsonObject so = t.containsKey("state") ? t["state"].as<JsonObject>() : t.createNestedObject("state");
    JsonObject a = so.createNestedObject("alis");
    serializeLightConfig(a, alisConfig);
    JsonObject h = so.createNestedObject("shroud");
    serializeLightConfig(h, shroudConfig);
    JsonObject m = so.createNestedObject("demon");
    serializeLightConfig(m, demonConfig);
    JsonObject i = so.createNestedObject("sein");
    i["mode"] = seinConfig.mode;
    i["ledCount"] = seinConfig.ledCount;
    i["speed"] = seinConfig.speed;
    JsonArray c = i.createNestedArray("warna");
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
  if (!isAuthenticated(request))
    return;
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
    JsonObject i = so["sein"].as<JsonObject>();
    seinConfig.mode = i["mode"];
    seinConfig.ledCount = i["ledCount"];
    seinConfig.speed = i["speed"];
    JsonArray c = i["warna"].as<JsonArray>();
    seinConfig.warna.r = c[0];
    seinConfig.warna.g = c[1];
    seinConfig.warna.b = c[2];

    simpanPengaturan();
    request->send(200, "text/plain", "Preset dimuat");
  }
  else
  {
    request->send(400, "text/plain", "Parameter tidak lengkap");
  }
}

void handleScanNetworks(AsyncWebServerRequest *request)
{
  String json = "[";
  int n = WiFi.scanNetworks();
  if (n > 0)
  {
    for (int i = 0; i < n; ++i)
    {
      json += "{\"ssid\":\"" + WiFi.SSID(i) + "\"}";
      if (i < n - 1)
        json += ",";
    }
  }
  json += "]";
  request->send(200, "application/json", json);
}

void handleSaveCredentials(AsyncWebServerRequest *request)
{
  if (request->hasParam("ssid", true) && request->hasParam("password", true))
  {
    strncpy(homeWifi.ssid, request->getParam("ssid", true)->value().c_str(), sizeof(homeWifi.ssid));
    strncpy(homeWifi.password, request->getParam("password", true)->value().c_str(), sizeof(homeWifi.password));
    WiFi.begin(homeWifi.ssid, homeWifi.password);
    unsigned long t = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t < 15000)
    {
      delay(500);
    }
    if (WiFi.status() == WL_CONNECTED)
    {
      homeWifi.configured = true;
      simpanKredensialWiFi();
      request->send(200, "text/plain", "SUCCESS");
      delay(1000);
      ESP.restart();
    }
    else
    {
      homeWifi.configured = false;
      request->send(401, "text/plain", "FAILED");
    }
  }
  else
  {
    request->send(400, "text/plain", "BAD_REQUEST");
  }
}

void serializeLightConfig(JsonObject &obj, const LightConfig &config)
{
  obj["ledCount"] = config.ledCount;
  obj["brightness"] = config.brightness;
  obj["speed"] = config.speed;
  obj["target"] = config.target;
  JsonObject sk = obj.createNestedObject("stateKiri");
  sk["modeEfek"] = config.stateKiri.modeEfek;
  JsonArray wk = sk.createNestedArray("warna");
  wk.add(config.stateKiri.warna.r);
  wk.add(config.stateKiri.warna.g);
  wk.add(config.stateKiri.warna.b);
  JsonArray w2k = sk.createNestedArray("warna2");
  w2k.add(config.stateKiri.warna2.r);
  w2k.add(config.stateKiri.warna2.g);
  w2k.add(config.stateKiri.warna2.b);
  JsonArray w3k = sk.createNestedArray("warna3");
  w3k.add(config.stateKiri.warna3.r);
  w3k.add(config.stateKiri.warna3.g);
  w3k.add(config.stateKiri.warna3.b);
  obj["stateKanan"] = sk;
}

void deserializeLightConfig(const JsonObject &obj, LightConfig &config)
{
  if (obj.isNull())
    return;
  config.ledCount = obj["ledCount"];
  config.brightness = obj["brightness"];
  config.speed = obj["speed"];
  if (obj.containsKey("target"))
  {
    strncpy(config.target, obj["target"], sizeof(config.target) - 1);
  }
  JsonObject sk = obj["stateKiri"].as<JsonObject>();
  if (!sk.isNull())
  {
    config.stateKiri.modeEfek = sk["modeEfek"];
    JsonArray wk = sk["warna"].as<JsonArray>();
    config.stateKiri.warna.r = wk[0];
    config.stateKiri.warna.g = wk[1];
    config.stateKiri.warna.b = wk[2];
    JsonArray w2k = sk["warna2"].as<JsonArray>();
    config.stateKiri.warna2.r = w2k[0];
    config.stateKiri.warna2.g = w2k[1];
    config.stateKiri.warna2.b = w2k[2];
    if (sk.containsKey("warna3"))
    {
      JsonArray w3k = sk["warna3"].as<JsonArray>();
      config.stateKiri.warna3.r = w3k[0];
      config.stateKiri.warna3.g = w3k[1];
      config.stateKiri.warna3.b = w3k[2];
    }
  }
  config.stateKanan = config.stateKiri;
}