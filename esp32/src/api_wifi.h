#pragma once

// Everything the firmware does beyond setup()/loop() orchestration, in one
// header + one .cpp: device state, the 4-tier tripwire sensors, WiFi/AP
// setup, NTP time sync, and the REST + WebSocket API. Consolidated
// deliberately (see api_wifi.cpp's section comments to navigate it).

#include <Arduino.h>
#include <ESPAsyncWebServer.h>

// =====================================================================
// Device state
// =====================================================================

// Shared in-memory device state. Single-core cooperative loop (no RTOS
// tasks touch this concurrently), so a plain global is safe without a mutex.
struct DeviceState {
  // Index 0=25% tier, 1=50%, 2=75%, 3=100% (bottom to top).
  float tierDistanceCm[4] = {-1, -1, -1, -1};
  bool tierOk[4] = {false, false, false, false};      // false = no valid echo (likely a sensor fault)
  bool tierTripped[4] = {false, false, false, false}; // true = trash has reached this tier's height

  float distanceCm = -1; // raw reading of the most relevant tier sensor right now - see updateDeviceState()
  int fillLevel = -1;    // one of -1 (unknown - every sensor has failed), 0, 25, 50, 75, 100

  bool fanOn = false;
  String mode = "automatic"; // "automatic" | "manual"

  bool timeSynced = false;
};

extern DeviceState deviceState;

// =====================================================================
// Sensors + fan
// =====================================================================

// Configures sensor and fan GPIOs. Call once from setup().
void sensorsSetup();

// Reads all 4 tripwire sensors, updates deviceState (per-tier readings,
// discrete fillLevel, distanceCm) and applies the automatic fan rule if
// deviceState.mode == "automatic". Call periodically from loop().
void updateDeviceState();

// Directly switches the fan relay/MOSFET and updates deviceState.fanOn.
// Callers (the API handlers) are responsible for enforcing the "only in
// manual mode" rule before calling this from an HTTP handler.
void setFan(bool on);

// Validates and applies a mode string ("automatic" | "manual").
// Returns false if the value is not recognized.
bool setMode(const String &mode);

// =====================================================================
// WiFi / network
// =====================================================================

// Loads stored WiFi credentials (or the config.h hardcoded defaults),
// attempts a STA connection, and falls back to a SoftAP + captive config
// portal (served on the shared `server` below) if that fails. Call once
// from setup(), BEFORE apiSetup() - if it falls back to AP mode it
// registers its own "/" captive-portal handler, which needs to win over
// apiSetup()'s "/" status page handler registered afterward.
void networkSetup();

// Pumps the captive-portal DNS server when in AP mode. No-op in STA mode.
// Call every loop() iteration.
void networkLoop();

// True once the device has a real STA IP (i.e. is on the local network and
// reachable directly or via the backend). False while in AP config mode.
bool isNetworkReady();

// Stable per-device identifier: DEVICE_ID_OVERRIDE from config.h if set,
// otherwise derived from the WiFi MAC address (e.g. "esp32-a1b2c3").
// Multi-bin fleets can rely on this being unique per device without any
// manual per-unit configuration.
String getDeviceId();

// Clears stored WiFi credentials and reboots into AP config mode.
// Used by POST /api/wifi/reset.
void resetWifiCredentials();

// =====================================================================
// Time sync
// =====================================================================

// Starts NTP sync. Call once after the device has a STA IP.
void timeSetup();

// Returns an ISO-8601 UTC timestamp ("2026-08-26T20:00:00Z") and sets
// `synced` to whether NTP has actually completed. If not yet synced, the
// returned string is empty - callers should send `null` rather than
// fabricate a wall-clock time the device doesn't actually have.
String getIsoTimestamp(bool &synced);

// =====================================================================
// REST + WebSocket API
// =====================================================================

// Shared web server + WebSocket instance. networkSetup() adds its captive
// portal routes to the same `server` before main.cpp calls server.begin().
extern AsyncWebServer server;
extern AsyncWebSocket ws;

// Registers all /api/* REST routes and the /ws WebSocket handler.
// Call once from setup(), before server.begin().
void apiSetup();

// Serializes current deviceState and pushes it to every connected
// WebSocket client. Call periodically from loop().
void apiBroadcastState();
