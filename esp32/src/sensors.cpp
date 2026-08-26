#include "sensors.h"
#include "config.h"
#include "state.h"

#include <math.h> // round()

namespace {

const int TRIG_PINS[4] = {TRIG_1, TRIG_2, TRIG_3, TRIG_4};
const int ECHO_PINS[4] = {ECHO_1, ECHO_2, ECHO_3, ECHO_4};

// Same measurement approach as the original bench-test sketch: 10us trigger
// pulse, pulseIn with a 30ms timeout (~5m max range), speed of sound
// 0.0343 cm/us. Returns -1.0 on timeout / no echo.
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

// Converts a distance reading into a 0-100 fill percentage using the
// BIN_EMPTY_DISTANCE_CM / BIN_FULL_DISTANCE_CM calibration in config.h.
// Closer distance = fuller bin. Returns -1 if the distance is unknown.
int computeFillLevel(float distanceCm) {
  if (distanceCm < 0) return -1;

  float clamped = constrain(distanceCm, BIN_FULL_DISTANCE_CM, BIN_EMPTY_DISTANCE_CM);
  float pct = (BIN_EMPTY_DISTANCE_CM - clamped) /
              (BIN_EMPTY_DISTANCE_CM - BIN_FULL_DISTANCE_CM) * 100.0f;
  return (int)round(pct);
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
    pinMode(TRIG_PINS[i], OUTPUT);
    pinMode(ECHO_PINS[i], INPUT);
    digitalWrite(TRIG_PINS[i], LOW);
  }

  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);
}

void updateDeviceState() {
  float sum = 0;
  int okCount = 0;

  for (int i = 0; i < 4; i++) {
    float d = readDistanceCM(TRIG_PINS[i], ECHO_PINS[i]);
    deviceState.sensorDistanceCm[i] = d;
    deviceState.sensorOk[i] = d > 0;

    if (deviceState.sensorOk[i]) {
      sum += d;
      okCount++;
    }

    delay(50); // preserved from the original sketch - avoids ultrasonic crosstalk between sensors
  }

  deviceState.sensorsOkCount = okCount;
  deviceState.distanceCm = okCount > 0 ? (sum / okCount) : -1.0f;
  deviceState.fillLevel = computeFillLevel(deviceState.distanceCm);

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
