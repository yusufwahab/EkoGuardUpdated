#include "api_wifi.h"
#include "config.h"

#include <time.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <AsyncJson.h>

// =====================================================================
// Device state
// =====================================================================

DeviceState deviceState;

// =====================================================================
// Sensors + fan
// =====================================================================

namespace {

const int TIER_TRIG[4] = {TIER_25_TRIG, TIER_50_TRIG, TIER_75_TRIG, TIER_100_TRIG};
const int TIER_ECHO[4] = {TIER_25_ECHO, TIER_50_ECHO, TIER_75_ECHO, TIER_100_ECHO};
const int TIER_PERCENT[4] = {25, 50, 75, 100};

// 10us trigger pulse, pulseIn with a 30ms timeout (~5m max range), speed of
// sound 0.0343 cm/us. Returns -1.0 on timeout / no echo. For these
// side-mounted sensors (pointed across the bin's ~40cm interior), a timeout
// effectively means a sensor fault rather than "very far away" - the far
// wall is always well within range.
float readDistanceCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    return -1.0f;
  }
  return (duration * 0.0343f) / 2.0f;
}

void applyAutomaticFanRule() {
  if (deviceState.mode != "automatic") return;
  if (deviceState.fillLevel < 0) return; // no reliable reading yet, don't guess

  if (!deviceState.fanOn && deviceState.fillLevel >= FAN_AUTO_ON_THRESHOLD) {
    setFan(true);
  } else if (deviceState.fanOn && deviceState.fillLevel <= FAN_AUTO_OFF_THRESHOLD) {
    setFan(false);
  }
}

} // namespace

void sensorsSetup() {
  for (int i = 0; i < 4; i++) {
    pinMode(TIER_TRIG[i], OUTPUT);
    pinMode(TIER_ECHO[i], INPUT);
    digitalWrite(TIER_TRIG[i], LOW);
  }

  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);
}

void updateDeviceState() {
  bool anyOk = false;
  int highestTrippedPercent = 0;
  int highestTrippedIndex = -1;

  for (int i = 0; i < 4; i++) {
    float d = readDistanceCM(TIER_TRIG[i], TIER_ECHO[i]);
    bool ok = d > 0;
    // Tripped = something is much closer than the far wall, i.e. trash has
    // reached this tier's height. See config.h for the calibration values.
    bool tripped = ok && d < SENSOR_TRIP_THRESHOLD_CM;

    deviceState.tierDistanceCm[i] = ok ? d : -1;
    deviceState.tierOk[i] = ok;
    deviceState.tierTripped[i] = tripped;

    if (ok) anyOk = true;
    if (tripped) {
      highestTrippedPercent = TIER_PERCENT[i];
      highestTrippedIndex = i;
    }

    delay(50); // avoids ultrasonic crosstalk between the 4 sensors
  }

  // -1 only when every sensor has failed - a legitimate "nothing has ever
  // tripped" reading is a real 0%, not unknown.
  deviceState.fillLevel = anyOk ? highestTrippedPercent : -1;

  // distanceCm is a single-number diagnostic summary (full per-tier detail
  // is in /api/sensors): the raw reading of whichever tier currently
  // matters most - the highest tripped one (how deep past that milestone),
  // or the bottom (25%) tier if nothing has tripped yet (how far until the
  // first milestone).
  int referenceIndex = highestTrippedIndex >= 0 ? highestTrippedIndex : 0;
  deviceState.distanceCm = deviceState.tierOk[referenceIndex] ? deviceState.tierDistanceCm[referenceIndex] : -1;

  applyAutomaticFanRule();
}

void setFan(bool on) {
  deviceState.fanOn = on;
  digitalWrite(FAN_PIN, on ? HIGH : LOW);
}

bool setMode(const String &mode) {
  if (mode != "automatic" && mode != "manual") return false;
  deviceState.mode = mode;
  return true;
}

// =====================================================================
// WiFi / network
// =====================================================================

namespace {

Preferences prefs;
DNSServer dnsServer;
bool apMode = false;
String cachedDeviceId;

const byte DNS_PORT = 53;

String loadSsid() {
  prefs.begin("wifi", true);
  String v = prefs.getString("ssid", "");
  prefs.end();
  return v;
}

String loadPassword() {
  prefs.begin("wifi", true);
  String v = prefs.getString("pass", "");
  prefs.end();
  return v;
}

void saveCredentials(const String &ssid, const String &pass) {
  prefs.begin("wifi", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
}

bool connectSta(const String &ssid, const String &pass) {
  if (ssid.length() == 0) return false;

  Serial.printf("[wifi] connecting to \"%s\"...\n", ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected, IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println("[wifi] connect failed / timed out");
  return false;
}

const char AP_CONFIG_PAGE[] PROGMEM = R"HTML(
<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EkoGuard WiFi Setup</title>
<style>
body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;color:#1a2e22}
h1{font-size:1.25rem}
label{display:block;margin-top:12px;font-size:.9rem;color:#4b5b52}
input{width:100%;padding:10px;margin-top:4px;box-sizing:border-box;border:1px solid #ccc;border-radius:6px}
button{margin-top:20px;width:100%;padding:12px;background:#16a34a;color:#fff;border:0;border-radius:6px;font-size:1rem}
</style></head><body>
<h1>Connect this EkoGuard bin to WiFi</h1>
<form action="/save" method="POST">
<label>Network name (SSID)</label><input name="ssid" required>
<label>Password</label><input name="pass" type="password">
<button type="submit">Save &amp; reboot</button>
</form>
</body></html>
)HTML";

void startApPortal() {
  apMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  IPAddress apIp = WiFi.softAPIP();
  Serial.printf("[wifi] AP config mode: connect to \"%s\" and open http://%s\n", AP_SSID, apIp.toString().c_str());

  dnsServer.start(DNS_PORT, "*", apIp); // captive-portal-style: redirect all DNS lookups to us

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/html", AP_CONFIG_PAGE);
  });

  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (!request->hasParam("ssid", true)) {
      request->send(400, "text/plain", "Missing ssid");
      return;
    }
    String ssid = request->getParam("ssid", true)->value();
    String pass = request->hasParam("pass", true) ? request->getParam("pass", true)->value() : "";
    saveCredentials(ssid, pass);
    request->send(200, "text/html", "<p>Saved. Rebooting...</p>");
    delay(500);
    ESP.restart();
  });

  // Any other request while in captive-portal mode: bounce back to the setup page.
  server.onNotFound([](AsyncWebServerRequest *request) {
    request->redirect("/");
  });
}

} // namespace

void networkSetup() {
  String ssid = loadSsid();
  String pass = loadPassword();

  if (ssid.length() == 0 && strlen(WIFI_SSID_DEFAULT) > 0) {
    ssid = WIFI_SSID_DEFAULT;
    pass = WIFI_PASSWORD_DEFAULT;
    saveCredentials(ssid, pass); // promote the config.h default into persistent storage
  }

  if (!connectSta(ssid, pass)) {
    startApPortal();
  }
}

void networkLoop() {
  if (apMode) {
    dnsServer.processNextRequest();
  }
}

bool isNetworkReady() {
  return !apMode && WiFi.status() == WL_CONNECTED;
}

String getDeviceId() {
  if (strlen(DEVICE_ID_OVERRIDE) > 0) return String(DEVICE_ID_OVERRIDE);

  if (cachedDeviceId.length() == 0) {
    String mac = WiFi.macAddress(); // "AA:BB:CC:DD:EE:FF"
    mac.replace(":", "");
    cachedDeviceId = "esp32-" + mac.substring(6); // last 3 octets, lowercase-ish hex
    cachedDeviceId.toLowerCase();
  }
  return cachedDeviceId;
}

void resetWifiCredentials() {
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();
  ESP.restart();
}

// =====================================================================
// Time sync
// =====================================================================

void timeSetup() {
  // UTC, no DST offset - the backend/frontend handle any local display conversion.
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);
}

String getIsoTimestamp(bool &synced) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 250)) {
    synced = false;
    return "";
  }

  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  synced = true;
  return String(buf);
}

// =====================================================================
// REST + WebSocket API
// =====================================================================

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

namespace {

// GET /api/status -> { online, fillLevel, distanceCm, fan, mode }
// (exact shape from the product brief's reference contract)
String buildStatusJson() {
  StaticJsonDocument<256> doc;
  doc["online"] = isNetworkReady();
  doc["fillLevel"] = deviceState.fillLevel;
  doc["distanceCm"] = deviceState.distanceCm;
  doc["fan"] = deviceState.fanOn;
  doc["mode"] = deviceState.mode;

  String out;
  serializeJson(doc, out);
  return out;
}

// GET /api/sensors -> per-tier tripwire readings + the derived summary.
// This is additional telemetry beyond the brief's reference shape (which
// only names the endpoint, not its payload) - useful for diagnosing a
// faulty/misaligned sensor without guessing from fillLevel alone.
String buildSensorsJson() {
  StaticJsonDocument<512> doc;
  JsonArray tiers = doc.createNestedArray("tiers");
  const int percents[4] = {25, 50, 75, 100};
  for (int i = 0; i < 4; i++) {
    JsonObject t = tiers.createNestedObject();
    t["percent"] = percents[i];
    t["distanceCm"] = deviceState.tierDistanceCm[i];
    t["tripped"] = deviceState.tierTripped[i];
    t["ok"] = deviceState.tierOk[i];
  }
  doc["fillLevel"] = deviceState.fillLevel;
  doc["distanceCm"] = deviceState.distanceCm;

  String out;
  serializeJson(doc, out);
  return out;
}

// GET /api/fill-level -> { fillLevel }
String buildFillLevelJson() {
  StaticJsonDocument<64> doc;
  doc["fillLevel"] = deviceState.fillLevel;
  String out;
  serializeJson(doc, out);
  return out;
}

// WebSocket / live push payload -> matches the brief's WS example exactly:
// { deviceId, fillLevel, distanceCm, fanStatus, mode, timestamp }
String buildWsPayloadJson() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = getDeviceId();
  doc["fillLevel"] = deviceState.fillLevel;
  doc["distanceCm"] = deviceState.distanceCm;
  doc["fanStatus"] = deviceState.fanOn;
  doc["mode"] = deviceState.mode;

  bool synced = false;
  String ts = getIsoTimestamp(synced);
  deviceState.timeSynced = synced;
  if (synced) {
    doc["timestamp"] = ts;
  } else {
    doc["timestamp"] = nullptr; // device has no reliable wall-clock yet; backend should stamp arrival time instead
  }

  String out;
  serializeJson(doc, out);
  return out;
}

void sendError(AsyncWebServerRequest *request, int code, const String &message) {
  StaticJsonDocument<128> doc;
  doc["error"] = message;
  String out;
  serializeJson(doc, out);
  request->send(code, "application/json", out);
}

void handleFanSet(AsyncWebServerRequest *request, bool on) {
  // The frontend is expected to disable manual fan controls while in
  // automatic mode (per the brief); the firmware enforces the same rule
  // so a stray/direct API call can't fight the automatic hysteresis loop.
  if (deviceState.mode != "manual") {
    sendError(request, 409, "Device is in automatic mode; POST /api/mode {\"mode\":\"manual\"} first.");
    return;
  }
  setFan(on);
  request->send(200, "application/json", buildStatusJson());
}

void onWsEvent(AsyncWebSocket *wsServer, AsyncWebSocketClient *client, AwsEventType type,
               void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    // Send current state immediately rather than making the new client wait
    // for the next broadcast tick.
    client->text(buildWsPayloadJson());
  }
}

} // namespace

void apiSetup() {
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "application/json", buildStatusJson());
  });

  server.on("/api/sensors", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "application/json", buildSensorsJson());
  });

  server.on("/api/fill-level", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "application/json", buildFillLevelJson());
  });

  server.on("/api/fan/on", HTTP_POST, [](AsyncWebServerRequest *request) {
    handleFanSet(request, true);
  });
  server.on("/api/fan/on", HTTP_OPTIONS, [](AsyncWebServerRequest *request) { request->send(204); });

  server.on("/api/fan/off", HTTP_POST, [](AsyncWebServerRequest *request) {
    handleFanSet(request, false);
  });
  server.on("/api/fan/off", HTTP_OPTIONS, [](AsyncWebServerRequest *request) { request->send(204); });

  auto *modeHandler = new AsyncCallbackJsonWebHandler("/api/mode", [](AsyncWebServerRequest *request, JsonVariant &json) {
    JsonObject body = json.as<JsonObject>();
    if (!body.containsKey("mode")) {
      sendError(request, 400, "Missing \"mode\" field.");
      return;
    }
    String mode = body["mode"].as<String>();
    if (!setMode(mode)) {
      sendError(request, 400, "\"mode\" must be \"automatic\" or \"manual\".");
      return;
    }
    request->send(200, "application/json", buildStatusJson());
  });
  modeHandler->setMethod(HTTP_POST);
  server.addHandler(modeHandler);
  server.on("/api/mode", HTTP_OPTIONS, [](AsyncWebServerRequest *request) { request->send(204); });

  // Lets a caller force the device back into WiFi setup mode without
  // physical access (e.g. moving the bin to a new site).
  server.on("/api/wifi/reset", HTTP_POST, [](AsyncWebServerRequest *request) {
    request->send(200, "application/json", "{\"ok\":true}");
    resetWifiCredentials(); // restarts the device
  });

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    String body = "<html><body style=\"font-family:sans-serif\"><h1>EkoGuard bin " +
                  getDeviceId() + "</h1><p>See /api/status</p></body></html>";
    request->send(200, "text/html", body);
  });
}

void apiBroadcastState() {
  if (ws.count() == 0) return;
  ws.textAll(buildWsPayloadJson());
}
