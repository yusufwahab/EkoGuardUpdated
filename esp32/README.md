# EkoGuard ESP32 firmware

Smart-bin firmware: reads 4 ultrasonic "tripwire" sensors mounted along the
bin's side wall to determine which 25% fill milestone has been reached,
drives a 12V fan via a MOSFET for ventilation, and exposes both over the
local WiFi network as a REST + WebSocket API. See
[../docs/device-api.md](../docs/device-api.md) for the full API contract.

Source is deliberately consolidated into 3 files: [src/main.cpp](src/main.cpp)
(setup/loop orchestration only), [src/api_wifi.h](src/api_wifi.h) /
[src/api_wifi.cpp](src/api_wifi.cpp) (everything else - device state,
sensors, WiFi/AP, time sync, and the REST + WebSocket API - see the section
comments inside `api_wifi.cpp` to navigate it), plus
[include/config.h](include/config.h) for all the tunable pins/constants.

## Hardware

4 sensors mounted **along the side wall**, each pointed horizontally across
the bin's interior at a fixed height - not a single top-down rangefinder.
Empty at that height → the pulse crosses the bin and reflects off the far
wall; trash reaching that height → it reflects off the trash instead, much
closer to the sensor ("tripped").

| Signal              | GPIO |
|----------------------|------|
| 25% tier TRIG/ECHO   | 13 / 14 |
| 50% tier TRIG/ECHO   | 16 / 17 |
| 75% tier TRIG/ECHO   | 18 / 19 |
| 100% tier TRIG/ECHO  | 21 / 22 |
| Fan MOSFET gate      | 23 |

Calibrate `BIN_INTERIOR_WIDTH_CM` / `SENSOR_TRIP_THRESHOLD_CM` in
[include/config.h](include/config.h) for your bin's actual interior width -
the shipped defaults (40cm / 20cm) are placeholders. `fillLevel` is always
exactly `0`, `25`, `50`, `75`, or `100` (or `-1` if every sensor has
failed) - never a continuous value - taken from the highest tripped tier.

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
