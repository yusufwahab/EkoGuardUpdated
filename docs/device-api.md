# EkoGuard ESP32 device API — contract

This is the **real, implemented** contract exposed by [esp32/src/api.cpp](../esp32/src/api.cpp),
verified against the firmware source (not just the original product brief).

Base URL: `http://<device-ip-or-mdns-name>` (mDNS: `http://<deviceId>.local`,
e.g. `http://esp32-a1b2c3.local`, once the device has joined the local WiFi network).

## Who talks to this, and how

**The frontend talks to the device directly** — plain `fetch()`/`WebSocket` calls
from the browser straight to the device's local address, exactly like opening
`http://<device>/api/status` in a new tab. No SDK, no backend hop, when the
browser and the device are on the same network. The frontend gets the
address itself from the backend's device registry (`GET /api/devices`), then
never needs the backend again for live reads/control.

**The backend is the fallback, not the primary path** — it exposes the same
endpoints as a proxy (`backend/src/routes/devices.ts`) purely for when direct
access fails: the frontend is served over HTTPS (e.g. deployed on Vercel) and
the browser refuses to fetch a plain-HTTP local address as mixed content, or
the viewer simply isn't on the bin's local network. See
`src/lib/deviceTransport.ts` for the try-direct-then-fall-back-to-backend logic.

**The backend also connects to the device independently**, all the time,
regardless of what any frontend is doing — this is what feeds Supabase
history and the alert engine (`backend/src/services/devicePoller.ts`). That
connection has nothing to do with the frontend's direct link; the backend
would keep logging readings even with no dashboard open anywhere.

## Divergences from the original brief

The original brief assumed a single ultrasonic sensor and didn't specify an
automatic-fan rule or a device-identity scheme. The actual firmware:

- Has **4 ultrasonic sensors** (bench-test hardware already wired). `distanceCm`
  in every payload below is the **average of the sensors currently returning a
  valid reading**; per-sensor raw values are exposed separately via `/api/sensors`
  for diagnostics.
- Derives `deviceId` from the device's WiFi MAC address (`esp32-<last 3 MAC
  octets>`), not a hardcoded string — this is what makes the data model
  multi-bin-ready without per-unit firmware config. Override via
  `DEVICE_ID_OVERRIDE` in `esp32/include/config.h` if you want a fixed id.
- Automatic-mode fan rule (not specified in the brief): fan turns ON at
  `fillLevel >= 60`, OFF at `fillLevel <= 45` (hysteresis to avoid flapping).
  Tunable in `esp32/include/config.h` (`FAN_AUTO_ON_THRESHOLD` /
  `FAN_AUTO_OFF_THRESHOLD`).
- `POST /api/fan/on` / `/off` return **409** if the device is currently in
  `"automatic"` mode, rather than silently accepting a command the automatic
  loop would immediately override. Switch to manual mode first.
- The device does not always know the real time (NTP may not have synced
  yet). `timestamp` in the WebSocket payload is `null` until synced — the
  backend should stamp its own receive time as a fallback, not assume the
  device's timestamp is always present.
- Two extra endpoints beyond the brief: `GET /api/sensors` (raw per-sensor
  diagnostics) and `POST /api/wifi/reset` (wipes stored WiFi credentials and
  reboots into AP config mode — see [esp32/README.md](../esp32/README.md)).

## REST endpoints

### `GET /api/status`

```json
{
  "online": true,
  "fillLevel": 62,
  "distanceCm": 17.8,
  "fan": false,
  "mode": "automatic"
}
```

- `online`: whether the device currently has a WiFi STA connection (always
  `true` when you can reach this endpoint at all — see note below).
- `fillLevel`: `0-100`, or `-1` if no sensor has ever returned a valid reading.
- `fan` / `mode`: current state, not a request.

> Note: because this is a pull request/response, `online: false` should never
> actually be observed here — if the device were offline you couldn't reach
> it. The backend synthesizes `online: false` itself (see below) when a
> request to the device times out or is refused.

### `GET /api/sensors`

```json
{
  "sensors": [
    { "id": 1, "distanceCm": 18.1, "ok": true },
    { "id": 2, "distanceCm": 17.4, "ok": true },
    { "id": 3, "distanceCm": -1, "ok": false },
    { "id": 4, "distanceCm": 17.9, "ok": true }
  ],
  "sensorsOkCount": 3,
  "distanceCm": 17.8,
  "fillLevel": 62
}
```

### `GET /api/fill-level`

```json
{ "fillLevel": 62 }
```

### `POST /api/fan/on` / `POST /api/fan/off`

No body. Returns the updated `/api/status` body on success (200).
Returns **409** `{ "error": "..." }` if `mode` is `"automatic"`.

### `POST /api/mode`

Body: `{ "mode": "automatic" | "manual" }`. Returns the updated `/api/status`
body on success (200), or **400** `{ "error": "..." }` for an invalid value.

### `POST /api/wifi/reset`

No body. Clears stored WiFi credentials and reboots the device into its
SoftAP config portal (`EkoGuard-Setup`). Use when relocating a bin to a new
network.

## WebSocket — `ws://<device>/ws`

Pushed every ~2s (`WS_BROADCAST_INTERVAL_MS`), and once immediately on
connect:

```json
{
  "deviceId": "esp32-a1b2c3",
  "fillLevel": 62,
  "distanceCm": 17.8,
  "fanStatus": false,
  "mode": "automatic",
  "timestamp": "2026-08-26T20:00:00Z"
}
```

`timestamp` is `null` if the device hasn't completed NTP sync yet.

## Backend responsibilities

- Own the device registry (id → name/location/base_url), so the frontend
  never hardcodes an address — it reads `base_url` from `GET /api/devices`
  and talks to the device directly from there.
- Maintain its own independent connection to every registered device (WS
  with an HTTP-poll fallback) to log readings/events to Supabase and run
  the alert engine — this runs regardless of whether any dashboard is open.
- Expose this same contract as a fallback proxy for when a browser can't
  reach the device directly (see "Who talks to this, and how" above).
- Treat "device unreachable" as a normal degraded state, not an error —
  serve last-known-good state (with a staleness flag) rather than
  propagating a failure to the UI.
