#pragma once

#include <Arduino.h>

// Loads stored WiFi credentials (or the config.h hardcoded defaults),
// attempts a STA connection, and falls back to a SoftAP + captive config
// portal (served on the shared `server` from api.h) if that fails.
// Call once from setup(), AFTER apiSetup() has registered the /api routes,
// so this can add its own routes to the same server before server.begin().
void networkSetup();

// Pumps the captive-portal DNS server when in AP mode. No-op in STA mode.
// Call every loop() iteration.
void networkLoop();

// True once the device has a real STA IP (i.e. is on the local network and
// reachable by the backend). False while in AP config mode.
bool isNetworkReady();

// Stable per-device identifier: DEVICE_ID_OVERRIDE from config.h if set,
// otherwise derived from the WiFi MAC address (e.g. "esp32-a1b2c3").
// Multi-bin fleets can rely on this being unique per device without any
// manual per-unit configuration.
String getDeviceId();

// Clears stored WiFi credentials and reboots into AP config mode.
// Exposed to api.cpp for POST /api/wifi/reset.
void resetWifiCredentials();
