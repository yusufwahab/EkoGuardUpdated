#pragma once

// =====================================================================
// EkoGuard ESP32 firmware configuration
// Tune these constants per physical bin/deployment. Nothing here should
// require touching application logic in src/api_wifi.cpp.
// =====================================================================

// ---- 4-tier side-mounted ultrasonic sensors (HC-SR04 style) ----
// Unlike a single top-down rangefinder, these 4 sensors are mounted along
// the SIDE wall of the bin, pointing horizontally across its interior, one
// per fill-level milestone (25/50/75/100%). Bottom to top:
#define TIER_25_TRIG 13
#define TIER_25_ECHO 14
#define TIER_50_TRIG 16
#define TIER_50_ECHO 17
#define TIER_75_TRIG 18
#define TIER_75_ECHO 19
#define TIER_100_TRIG 21
#define TIER_100_ECHO 22

// ---- Fan / MOSFET control ----
// GPIO23 is unused by the 4 sensor pins above. Re-check your wiring if you
// move this — it drives the MOSFET gate that switches the 12V fan.
#define FAN_PIN 23

// ---- Tripwire calibration ----
// With nothing blocking a tier's beam, the pulse crosses the bin's
// interior and reflects off the FAR wall - measured distance is roughly
// the bin's interior width. Once trash piles up to that height, the pulse
// reflects off the trash instead, much closer to the sensor. A tier counts
// as "tripped" (trash has reached that height) once its reading drops
// below SENSOR_TRIP_THRESHOLD_CM - keep a healthy margin below
// BIN_INTERIOR_WIDTH_CM so sensor noise near the far wall doesn't cause a
// false trip. Measure both for your actual bin.
#define BIN_INTERIOR_WIDTH_CM 40.0f
#define SENSOR_TRIP_THRESHOLD_CM 20.0f

// ---- Automatic fan mode thresholds (hysteresis to avoid flapping) ----
// ASSUMPTION (not specified in the product brief): in "automatic" mode the
// fan ventilates the compartment once the bin gets full enough that odor/
// gas buildup is likely, and switches off once it drops back down. Aligned
// to the discrete tiers (fillLevel is always 0/25/50/75/100) rather than
// an arbitrary percentage that could fall between two tiers and never
// actually be crossed.
#define FAN_AUTO_ON_THRESHOLD 75
#define FAN_AUTO_OFF_THRESHOLD 50

// ---- Timing ----
#define SENSOR_READ_INTERVAL_MS 2000
#define WS_BROADCAST_INTERVAL_MS 2000
#define WIFI_CONNECT_TIMEOUT_MS 15000

// ---- WiFi ----
// Optional hardcoded fallback credentials for bench testing. Leave blank to
// require configuration via the AP captive portal (see api_wifi.h/.cpp) --
// the normal path for a real field deployment.
#define WIFI_SSID_DEFAULT ""
#define WIFI_PASSWORD_DEFAULT ""

// SoftAP shown when the device has no working WiFi credentials yet.
#define AP_SSID "EkoGuard-Setup"
#define AP_PASSWORD "ekoguard123" // must be 8+ chars for WPA2; change for production

// ---- Device identity ----
// Leave blank to auto-derive a stable id from the WiFi MAC address
// (recommended for multi-bin fleets - see getDeviceId() in api_wifi.cpp).
#define DEVICE_ID_OVERRIDE ""

// ---- NTP ----
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.nist.gov"
