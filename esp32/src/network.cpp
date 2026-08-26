#include "network.h"
#include "config.h"
#include "api.h"

#include <WiFi.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>

namespace {

Preferences prefs;
DNSServer dnsServer;
bool apMode = false;
String cachedDeviceId;

const byte DNS_PORT = 53;

String loadSsid() {
  prefs.begin("wifi", true);
  String v = prefs.getString("ssid", "");
  prefs.end();
  return v;
}

String loadPassword() {
  prefs.begin("wifi", true);
  String v = prefs.getString("pass", "");
  prefs.end();
  return v;
}

void saveCredentials(const String &ssid, const String &pass) {
  prefs.begin("wifi", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.end();
}

bool connectSta(const String &ssid, const String &pass) {
  if (ssid.length() == 0) return false;

  Serial.printf("[wifi] connecting to \"%s\"...\n", ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected, IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println("[wifi] connect failed / timed out");
  return false;
}

const char AP_CONFIG_PAGE[] PROGMEM = R"HTML(
<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EkoGuard WiFi Setup</title>
<style>
body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;color:#1a2e22}
h1{font-size:1.25rem}
label{display:block;margin-top:12px;font-size:.9rem;color:#4b5b52}
input{width:100%;padding:10px;margin-top:4px;box-sizing:border-box;border:1px solid #ccc;border-radius:6px}
button{margin-top:20px;width:100%;padding:12px;background:#16a34a;color:#fff;border:0;border-radius:6px;font-size:1rem}
</style></head><body>
<h1>Connect this EkoGuard bin to WiFi</h1>
<form action="/save" method="POST">
<label>Network name (SSID)</label><input name="ssid" required>
<label>Password</label><input name="pass" type="password">
<button type="submit">Save &amp; reboot</button>
</form>
</body></html>
)HTML";

void startApPortal() {
  apMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  IPAddress apIp = WiFi.softAPIP();
  Serial.printf("[wifi] AP config mode: connect to \"%s\" and open http://%s\n", AP_SSID, apIp.toString().c_str());

  dnsServer.start(DNS_PORT, "*", apIp); // captive-portal-style: redirect all DNS lookups to us

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/html", AP_CONFIG_PAGE);
  });

  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (!request->hasParam("ssid", true)) {
      request->send(400, "text/plain", "Missing ssid");
      return;
    }
    String ssid = request->getParam("ssid", true)->value();
    String pass = request->hasParam("pass", true) ? request->getParam("pass", true)->value() : "";
    saveCredentials(ssid, pass);
    request->send(200, "text/html", "<p>Saved. Rebooting...</p>");
    delay(500);
    ESP.restart();
  });

  // Any other request while in captive-portal mode: bounce back to the setup page.
  server.onNotFound([](AsyncWebServerRequest *request) {
    request->redirect("/");
  });
}

} // namespace

void networkSetup() {
  String ssid = loadSsid();
  String pass = loadPassword();

  if (ssid.length() == 0 && strlen(WIFI_SSID_DEFAULT) > 0) {
    ssid = WIFI_SSID_DEFAULT;
    pass = WIFI_PASSWORD_DEFAULT;
    saveCredentials(ssid, pass); // promote the config.h default into persistent storage
  }

  if (!connectSta(ssid, pass)) {
    startApPortal();
  }
}

void networkLoop() {
  if (apMode) {
    dnsServer.processNextRequest();
  }
}

bool isNetworkReady() {
  return !apMode && WiFi.status() == WL_CONNECTED;
}

String getDeviceId() {
  if (strlen(DEVICE_ID_OVERRIDE) > 0) return String(DEVICE_ID_OVERRIDE);

  if (cachedDeviceId.length() == 0) {
    String mac = WiFi.macAddress(); // "AA:BB:CC:DD:EE:FF"
    mac.replace(":", "");
    cachedDeviceId = "esp32-" + mac.substring(6); // last 3 octets, lowercase-ish hex
    cachedDeviceId.toLowerCase();
  }
  return cachedDeviceId;
}

void resetWifiCredentials() {
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();
  ESP.restart();
}
