#pragma once

// =====================================================================
// EkoGuard ESP32 firmware configuration
// Tune these constants per physical bin/deployment. Nothing here should
// require touching application logic in sensors.cpp / network.cpp / api.cpp.
// =====================================================================

// ---- Ultrasonic sensor pins (4x HC-SR04 style) ----
#define TRIG_1 13
#define ECHO_1 14
#define TRIG_2 16
#define ECHO_2 17
#define TRIG_3 18
#define ECHO_3 19
#define TRIG_4 21
#define ECHO_4 22

// ---- Fan / MOSFET control ----
// GPIO23 is unused by the 4 sensor pins above. Re-check your wiring if you
// move this — it drives the MOSFET gate that switches the 12V fan.
#define FAN_PIN 23

// ---- Fill-level calibration ----
// Distance (cm) from the sensor to the waste surface when the bin is
// considered EMPTY vs FULL. Measure these for your actual bin and sensor
// mounting height — the defaults below are placeholders for a ~45cm bin.
#define BIN_EMPTY_DISTANCE_CM 45.0f
#define BIN_FULL_DISTANCE_CM 5.0f

// ---- Automatic fan mode thresholds (hysteresis to avoid flapping) ----
// ASSUMPTION (not specified in the product brief): in "automatic" mode the
// fan ventilates the compartment once the bin gets full enough that odor/
// gas buildup is likely, and switches off once it drops back down.
// Tune or replace this rule if the real automation requirement differs.
#define FAN_AUTO_ON_THRESHOLD 60
#define FAN_AUTO_OFF_THRESHOLD 45

// ---- Timing ----
#define SENSOR_READ_INTERVAL_MS 2000
#define WS_BROADCAST_INTERVAL_MS 2000
#define WIFI_CONNECT_TIMEOUT_MS 15000

// ---- WiFi ----
// Optional hardcoded fallback credentials for bench testing. Leave blank to
// require configuration via the AP captive portal (see network.h/.cpp) --
// the normal path for a real field deployment.
#define WIFI_SSID_DEFAULT ""
#define WIFI_PASSWORD_DEFAULT ""

// SoftAP shown when the device has no working WiFi credentials yet.
#define AP_SSID "EkoGuard-Setup"
#define AP_PASSWORD "ekoguard123" // must be 8+ chars for WPA2; change for production

// ---- Device identity ----
// Leave blank to auto-derive a stable id from the WiFi MAC address
// (recommended for multi-bin fleets - see network.cpp getDeviceId()).
#define DEVICE_ID_OVERRIDE ""

// ---- NTP ----
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.nist.gov"
