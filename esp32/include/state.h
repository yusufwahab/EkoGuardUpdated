#pragma once

#include <Arduino.h>

// Shared in-memory device state. Single-core cooperative loop (no RTOS
// tasks touch this concurrently), so a plain global is safe without a mutex.
struct DeviceState {
  float sensorDistanceCm[4] = {-1, -1, -1, -1};
  bool sensorOk[4] = {false, false, false, false};
  int sensorsOkCount = 0;

  float distanceCm = -1;   // averaged across the sensors that returned a valid reading
  int fillLevel = -1;      // 0-100, or -1 if unknown (no sensor has ever reported)

  bool fanOn = false;
  String mode = "automatic"; // "automatic" | "manual"

  bool timeSynced = false;
};

extern DeviceState deviceState;
