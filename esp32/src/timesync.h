#pragma once

#include <Arduino.h>

// Starts NTP sync. Call once after the device has a STA IP.
void timeSetup();

// Returns an ISO-8601 UTC timestamp ("2026-08-26T20:00:00Z") and sets
// `synced` to whether NTP has actually completed. If not yet synced,
// the returned string is empty - callers should send `null` rather than
// fabricate a wall-clock time the device doesn't actually have.
String getIsoTimestamp(bool &synced);
