#include <Arduino.h>
#include <ESPmDNS.h>

#include "config.h"
#include "state.h"
#include "sensors.h"
#include "network.h"
#include "timesync.h"
#include "api.h"

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- EkoGuard smart bin booting ---");

  sensorsSetup();
  // networkSetup() must run first: if it falls back to AP mode it registers
  // its own "/" captive-portal handler on `server`, which needs to win over
  // apiSetup()'s "/" status page handler registered afterward.
  networkSetup();  // connects STA, or adds the AP captive-portal routes to `server`
  apiSetup();      // register /api/* + /ws routes on `server`
  server.begin();

  if (isNetworkReady()) {
    timeSetup();
    if (MDNS.begin(getDeviceId().c_str())) {
      Serial.printf("[mdns] reachable at http://%s.local\n", getDeviceId().c_str());
      MDNS.addService("http", "tcp", 80);
    }
    Serial.printf("[net] device id: %s\n", getDeviceId().c_str());
  } else {
    Serial.println("[net] in AP config mode - device is not yet on the local network");
  }
}

void loop() {
  networkLoop(); // pumps the captive-portal DNS server while in AP mode
  ws.cleanupClients();

  static unsigned long lastSensorRead = 0;
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = millis();
    if (isNetworkReady()) {
      updateDeviceState();
    }
  }

  static unsigned long lastBroadcast = 0;
  if (millis() - lastBroadcast >= WS_BROADCAST_INTERVAL_MS) {
    lastBroadcast = millis();
    if (isNetworkReady()) {
      apiBroadcastState();
    }
  }
}
