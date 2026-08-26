# EkoGuard ESP32 firmware

Smart-bin firmware: reads 4 ultrasonic sensors to estimate fill level,
drives a 12V fan via a MOSFET for ventilation, and exposes both over the
local WiFi network as a REST + WebSocket API. See
[../docs/device-api.md](../docs/device-api.md) for the full API contract.

## Hardware

| Signal          | GPIO |
|------------------|------|
| Sensor 1 TRIG/ECHO | 13 / 14 |
| Sensor 2 TRIG/ECHO | 16 / 17 |
| Sensor 3 TRIG/ECHO | 18 / 19 |
| Sensor 4 TRIG/ECHO | 21 / 22 |
| Fan MOSFET gate  | 23 |

Calibrate `BIN_EMPTY_DISTANCE_CM` / `BIN_FULL_DISTANCE_CM` in
[include/config.h](include/config.h) for your bin's actual dimensions and
sensor mounting height — the shipped defaults (45cm / 5cm) are placeholders.

## Build & flash

```
pio run             # build
pio run -t upload    # flash
pio device monitor    # serial log (115200 baud)
```

## Connecting it to WiFi

On first boot (or after a `POST /api/wifi/reset`) the device has no stored
credentials and starts its own access point:

1. Connect a phone/laptop to WiFi network **`EkoGuard-Setup`** (password
   `ekoguard123`, set in `config.h`).
2. A captive-portal-style page should open automatically (or open
   `http://192.168.4.1` manually) with a WiFi setup form.
3. Enter your local network's SSID/password and submit. The device saves the
   credentials to flash (NVS) and reboots onto that network.

For bench testing, you can instead hardcode `WIFI_SSID_DEFAULT` /
`WIFI_PASSWORD_DEFAULT` in `config.h` to skip the portal entirely.

## Finding the device on the network

Once connected, the device advertises itself over mDNS as
`http://<deviceId>.local`, where `deviceId` is derived from its WiFi MAC
address (e.g. `esp32-a1b2c3`) and logged to serial at boot. The backend's
device registry should resolve devices by this mDNS name rather than a
hardcoded IP, since DHCP leases can change.
