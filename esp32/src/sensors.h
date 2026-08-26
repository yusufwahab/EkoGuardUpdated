#pragma once

#include <Arduino.h>

// Configures sensor and fan GPIOs. Call once from setup().
void sensorsSetup();

// Reads all 4 ultrasonic sensors, updates deviceState (raw readings,
// averaged distanceCm, fillLevel) and applies the automatic fan rule if
// deviceState.mode == "automatic". Call periodically from loop().
void updateDeviceState();

// Directly switches the fan relay/MOSFET and updates deviceState.fanOn.
// Callers (api.cpp) are responsible for enforcing the "only in manual mode"
// rule before calling this from an HTTP handler.
void setFan(bool on);

// Validates and applies a mode string ("automatic" | "manual").
// Returns false if the value is not recognized.
bool setMode(const String &mode);
