# EkoGuard backend

Node/Express + TypeScript service for EkoGuard. **The frontend talks to the
ESP32 directly** (plain `fetch`/`WebSocket` over the local network) - this
backend is not on that critical path. Its job is:

1. Own the device registry, so the frontend knows each device's address
   without hardcoding one.
2. Maintain its own independent connection to every device (regardless of
   whether any dashboard is open) to sync history/alerts to Supabase.
3. Expose the same device API as a **fallback proxy**, for whenever a
   browser can't reach a device directly - most commonly, this frontend
   deployed over HTTPS (Vercel) blocked from fetching a plain-HTTP local
   address as mixed content, or a viewer who isn't on the bin's network.
4. Keep serving last-known-good data if a device or Supabase is briefly
   unreachable, rather than erroring.

See [../docs/device-api.md](../docs/device-api.md) for the full device
contract and the direct-vs-relayed architecture in more detail.

## Setup

```
cp .env.example .env   # then fill in DEVICE_BASE_URL and (optionally) Supabase
npm install
npm run dev              # tsx watch, http://localhost:4000
```

`npm run build && npm start` for a production run (compiles to `dist/`).

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `PORT` | no (default 4000) | HTTP + WebSocket port |
| `DEVICE_ID` | no | Fallback single-device id, used only when Supabase's `devices` table is empty/unreachable |
| `DEVICE_BASE_URL` | yes (for the fallback device) | ESP32's mDNS name or local IP, e.g. `http://esp32-a1b2c3.local` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | no | Enables history, persisted alerts, and the multi-device registry. Leave blank to run fully local-only |
| `CORS_ORIGIN` | no (default `http://localhost:5173`) | Frontend origin allowed to call this API |

Without Supabase configured, live status/control still work end-to-end;
`/api/devices/:id/history` and `/api/devices/:id/events` return an empty
list with `cloudConfigured: false` rather than erroring, and alerts aren't
persisted (though they still broadcast live over WebSocket).

## Cloud schema

Run [src/db/migrations/0001_init.sql](src/db/migrations/0001_init.sql) in
the Supabase SQL editor (or `supabase db push`) before setting
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.

## API surface

REST (mounted under `/api`):

- `GET /health`
- `GET /devices` — registry overview with live snapshot per bin
- `GET /devices/:id/status`, `GET /devices/:id/sensors`
- `POST /devices/:id/fan/on`, `POST /devices/:id/fan/off`
- `POST /devices/:id/mode` `{ mode: "automatic" | "manual" }`
- `GET /devices/:id/settings`, `PATCH /devices/:id/settings`
- `GET /devices/:id/history?range=hour|day|week`
- `GET /devices/:id/events`
- `GET /alerts?deviceId=&limit=`, `POST /alerts/:id/ack`

WebSocket: `ws://localhost:4000/ws` — pushes `{ type: "device:update", deviceId, snapshot }`
on every live reading and `{ type: "alert", deviceId, alertType, severity, message }`
whenever the alert engine fires.

## How device discovery works

The frontend never hardcodes an IP either — it reads `baseUrl` off every
device returned by `GET /api/devices` and uses that to talk to the ESP32
directly from then on. This backend resolves that address itself: from
`DEVICE_BASE_URL` (an mDNS name like `http://esp32-a1b2c3.local`, printed by
the firmware to serial at boot — see [../esp32/README.md](../esp32/README.md))
when Supabase isn't configured, or from each row's `base_url` in the
`devices` table once it is — so multiple physical bins can be added without
touching frontend or backend code.
