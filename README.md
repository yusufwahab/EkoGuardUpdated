# EkoGuard

A smart waste-bin platform: an ESP32 reads ultrasonic fill-level sensors and
drives a ventilation fan locally, exposing a REST + WebSocket API over the
local network. **The React dashboard talks to it directly** - no backend
hop for live status/control when the two are on the same Wi-Fi - and falls
back to going through the Node/Express backend only when a direct
connection isn't possible (e.g. the frontend is deployed on Vercel over
HTTPS and the browser blocks the plain-HTTP local device as mixed content).
The backend also independently syncs history/alerts to Supabase regardless
of what any dashboard is doing. Local-first throughout - the UI keeps
working (with clearly-labeled cached data) if the device or the cloud is
briefly unreachable. Full architecture: [docs/device-api.md](docs/device-api.md).

## Structure

```
ekoguard/
├── src/            # React + TypeScript frontend (this package, Vite root)
├── backend/        # Node/Express + TypeScript API, Supabase sync
├── esp32/          # PlatformIO firmware (WiFi, REST + WebSocket API, fan control)
└── docs/
    └── device-api.md   # the real device contract all three talk to
```

Each of `backend/` and `esp32/` has its own README with setup specific to
that piece. This one covers the frontend and how to run everything together.

## Running everything locally

1. **Firmware** (optional for frontend/backend dev - see [esp32/README.md](esp32/README.md)):
   ```
   cd esp32 && pio run -t upload
   ```
   Connect it to WiFi via its setup portal, note the mDNS name it logs
   (`esp32-xxxxxx.local`).

2. **Backend** (see [backend/README.md](backend/README.md)):
   ```
   cd backend
   cp .env.example .env   # set DEVICE_BASE_URL to the firmware's mDNS name
   npm install
   npm run dev             # http://localhost:4000
   ```
   Supabase is optional - live status/control work without it; history and
   persisted alerts require it (schema: `backend/src/db/migrations/0001_init.sql`).

3. **Frontend** (this package):
   ```
   cp .env.example .env
   npm install
   npm run dev              # http://localhost:5173
   ```

Without any real ESP32 or Supabase configured, the app still runs end to
end: the dashboard shows a designed "Offline" state instead of erroring,
and History/Alerts show a "cloud sync not configured" empty state.

## Environment variables (frontend)

| Var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (default `http://localhost:4000`) |
| `VITE_WS_BASE_URL` | Backend WebSocket URL (default `ws://localhost:4000/ws`) |
| `VITE_UNSPLASH_ACCESS_KEY` | Optional - enables real hero/empty-state photography. Without it, those spots use a designed gradient placeholder instead of a broken image. Free key: https://unsplash.com/developers |

## Tech stack

React 19 + Vite + TypeScript, Tailwind CSS v4 (CSS-first config - see the
`@theme` block in [src/index.css](src/index.css) for the whole design
system: palette, semantic status colors, type scale), TanStack Query +
a WebSocket hook for live data, Recharts, Framer Motion.

## Scripts

- `npm run dev` - Vite dev server
- `npm run build` - typecheck (`tsc -b`) + production build
- `npm run typecheck` - typecheck only
- `npm run lint` - ESLint

## Design system

Defined entirely in [src/index.css](src/index.css) (Tailwind v4 has no
`tailwind.config.js` - tokens are CSS custom properties under `@theme`):
an eco/tech green scale (`eco-*`), a shared light/dark neutral scale
(`ink-*`), and semantic colors for connection/fill/alert states. Dark mode
is class-based (`useTheme()` toggles `.dark` on `<html>`, persisted to
`localStorage`), not just `prefers-color-scheme`.
