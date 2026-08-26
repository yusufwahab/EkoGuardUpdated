#include "api.h"
#include "config.h"
#include "state.h"
#include "sensors.h"
#include "network.h"
#include "timesync.h"

#include <ArduinoJson.h>
#include <AsyncJson.h>

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

// GET /api/sensors -> raw per-sensor readings + the derived averages.
// This is additional telemetry beyond the brief's reference shape (which
// only names the endpoint, not its payload) - useful for diagnosing a
// faulty/misaligned sensor without guessing from the averaged value alone.
String buildSensorsJson() {
  StaticJsonDocument<512> doc;
  JsonArray sensors = doc.createNestedArray("sensors");
  for (int i = 0; i < 4; i++) {
    JsonObject s = sensors.createNestedObject();
    s["id"] = i + 1;
    s["distanceCm"] = deviceState.sensorDistanceCm[i];
    s["ok"] = deviceState.sensorOk[i];
  }
  doc["sensorsOkCount"] = deviceState.sensorsOkCount;
  doc["distanceCm"] = deviceState.distanceCm;
  doc["fillLevel"] = deviceState.fillLevel;

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
