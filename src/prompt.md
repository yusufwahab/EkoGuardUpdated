# AI Coding Assistant Prompt — Smart Waste Bin Web Application

Copy everything below into your AI coding assistant (e.g. Claude Code, Cursor, etc.) as the project brief.

---

## ROLE

You are a **senior full-stack software engineer** who specializes in building polished, production-grade web applications. You have deep expertise in **React.js, Node.js/Express, PostgreSQL (Supabase), real-time IoT dashboards, and modern UI/UX design**. You care as much about visual craftsmanship as you do about clean architecture. Build this project the way you would build a real product for a paying client — not a prototype demo.

### Before you write any code

**Study the current workspace first.** Do not assume a blank slate. Explore the existing project structure, files, configs, and any code already present, and use that to inform every decision below — folder conventions, naming patterns, existing components, existing scripts, package.json, etc. Integrate with what's already there rather than reinventing it. If something in the workspace conflicts with an instruction below, prefer matching the existing codebase's conventions and flag the conflict to me before proceeding.

Specifically:

- **Tailwind CSS is already installed and configured in this workspace.** Do not reinstall it, do not scaffold a new Tailwind config from scratch, and do not assume defaults — open the existing `tailwind.config` (and any design tokens/theme extensions already defined) and build the design system described below on top of it.
- **The ESP32 firmware code is already included in this workspace.** Locate and read it in full before building the backend/frontend integration. Do not rely solely on the data contract summarized in this prompt — treat this prompt's contract as a starting reference only, and verify (and correct, if needed) the actual endpoint names, payload shapes, field names, HTTP methods, and WebSocket behavior directly from the firmware source. If the real firmware differs from what's documented below, the firmware is the source of truth — build to match it, and tell me explicitly where it diverges from this brief.

---

## PROJECT CONTEXT

We are building a **Smart Waste Bin** system that turns an ordinary waste bin into a connected, data-generating device for waste-management accountability. An **ESP32 microcontroller** is the local "brain": it reads an ultrasonic sensor to determine fill level, and controls a 12V fan (via a MOSFET) for air filtration/ventilation inside the waste compartment. The ESP32 operates **local-first** — it keeps working even without internet access — and exposes its state over the local Wi-Fi network via REST/WebSocket endpoints.

Your job is **only the software layer**: the web application that talks to the ESP32 locally and to Supabase in the cloud. You are not writing embedded/firmware code, but you must design the frontend and backend to match the ESP32's local API and data contract described below.

### Long-term vision

This isn't just a monitoring tool — it's the beginning of a **waste-accountability data platform**. Design the information architecture and data model so it can later support multiple bins, multiple locations/organizations, historical trend reporting, and public-facing accountability dashboards (e.g. "how full were bins on this street this week").

---

## TECH STACK (required)

- **Frontend:** React.js (Vite), TypeScript, Tailwind CSS _(already installed in this workspace — build on the existing config, don't reinitialize it)_
- **Backend:** Node.js + Express.js
- **Database / Cloud layer:** Supabase (PostgreSQL) — used for historical data, device registry, alerts, and sync; **never** part of the real-time control loop
- **Local device communication:** REST calls to the ESP32's local IP (`http://<esp32-local-ip>/api/...`) + WebSocket for live updates
- **Images:** Unsplash API (for contextual/hero imagery — recycling, sustainability, smart cities, clean environments)
- **Optional supporting free APIs** (use if they add real value, don't force them in):
  - Open-Meteo or similar free weather API (ambient context, since fan/ventilation behavior can be weather-relevant)
  - A free air-quality index API (e.g. OpenAQ) if you want to contextualize the "filtration" angle
- **State/data fetching:** React Query (TanStack Query) for server state, WebSocket hook for live sensor stream
- **Charts:** Recharts (fill-level history, fan activity over time)
- **Auth (if needed):** Supabase Auth

---

## DEVICE DATA CONTRACT (reference only — verify against the actual firmware in this workspace)

The ESP32 firmware is already in this workspace. **Read it before building anything that talks to the device.** The contract below is a reference/starting point, not a guarantee of what's actually implemented — confirm real endpoint paths, methods, request/response shapes, field names, and WebSocket event structure directly from the source code, and build the backend/frontend to match reality.

Expected shape, per the original project brief:

```
GET  /api/status        → { online, fillLevel, distanceCm, fan, mode }
GET  /api/sensors
GET  /api/fill-level
POST /api/fan/on
POST /api/fan/off
POST /api/mode           { mode: "automatic" | "manual" }
```

Example live payload pushed over WebSocket / polled from `/api/status`:

```json
{
  "deviceId": "farm-001",
  "fillLevel": 80,
  "distanceCm": 12.5,
  "fanStatus": true,
  "mode": "automatic",
  "timestamp": "2026-08-26T20:00:00Z"
}
```

The Node/Express backend's job:

1. Talk to the ESP32 on the local network (proxy/relay so the React app doesn't need to hardcode device IPs).
2. Sync readings, fan events, and alerts to Supabase for history.
3. Serve a clean REST/WebSocket API to the React frontend.
4. Keep working (serving cached last-known state) if the ESP32 or Supabase is briefly unreachable — never let a network hiccup break the UI.

---

## FUNCTIONAL REQUIREMENTS

1. **Live Dashboard** — real-time fill level (with a visual gauge/progress indicator), distance reading, fan status, mode (auto/manual), device online/offline state, last update timestamp.
2. **Fan Control** — manual ON/OFF toggle plus automatic mode; show current mode clearly; disable manual controls (or warn) when in automatic mode.
3. **Fill-Level History** — a chart showing fill level over time (hour/day/week views), pulled from Supabase.
4. **Alerts & Notifications** — visual alert when fill level crosses a configurable threshold, when the device goes offline, or when the fan has been running abnormally long. Use a toast/notification system plus a persistent alerts panel.
5. **Device Settings** — configurable thresholds (e.g. "alert at 85% full"), fan automation rules, device naming/location.
6. **Multi-bin ready data model** — even if the UI only shows one bin today, design the Supabase schema and API around a `devices` table so more bins can be added later without a rewrite.
7. **Offline/Local-first resilience in the UI** — clearly show connection state (Local network / Cloud synced / Offline) so the user always understands whether they're seeing live local data or last-synced cloud data.
8. **Historical event log** — fan on/off events, mode changes, alerts triggered, all timestamped and viewable.

---

## UI / UX & VISUAL DESIGN REQUIREMENTS (critical — do not treat as an afterthought)

This must look like a **premium, modern IoT/sustainability product** — think the visual quality of Linear, Vercel, or a well-funded climate-tech startup, not a bootstrap admin template.

- **Design a real design system first**: a defined color palette (a primary "eco/tech" color, a dark mode–friendly neutral scale, semantic colors for status — online/offline, low/medium/high/full, success/warning/danger), spacing scale, and typography pairing (a clean geometric sans for headings, e.g. Inter/Manrope/Space Grotesk, paired with a highly readable body font). Support **light and dark mode**.
- **Every screen, click, modal, and state must be intentionally designed** — no default browser alerts, no unstyled native form elements, no jarring layout shifts. Include:
  - Smooth micro-interactions and transitions (hover, press, toggle states) using Tailwind + Framer Motion.
  - Skeleton loaders / shimmer states while data loads — never a blank white screen.
  - Empty states that are actually designed (illustration or icon + helpful copy), not just "No data."
  - Error states that are calm and actionable, not raw stack traces.
  - A well-designed offline/reconnecting state (since local-first resilience is core to the product).
- **Imagery**: use the Unsplash API to source real, high-quality photography for hero/marketing sections and empty states — themes like recycling, clean cities, sustainability, technology, air quality. Cache/attribute images per Unsplash API guidelines (include photographer credit where Unsplash's API terms require it).
- **The fill-level gauge should be a genuinely nice custom visual** (e.g. an animated circular or vertical "tank" gauge) — not a plain HTML progress bar.
- **Fan status** should have a satisfying animated visual (e.g. a subtly spinning fan icon when ON).
- **Responsive design** — must look excellent on mobile, tablet, and desktop; this is a dashboard people may check on their phone.
- **Accessibility**: proper contrast ratios, keyboard navigation, focus states, ARIA labels on interactive/status elements.
- **Landing/marketing page** (in addition to the dashboard app) that introduces the product vision — "turning ordinary bins into accountability data" — with Unsplash hero imagery, a short explainer of how it works (sensor → ESP32 → dashboard), and a CTA into the live dashboard. This should feel like a real product, not just an admin panel.

---

## PAGES / VIEWS TO BUILD

1. **Landing page** — product story, visuals, CTA
2. **Dashboard (main app)** — live status, gauge, fan control, alerts panel
3. **History / Analytics** — charts, filterable by time range, event log
4. **Device Settings** — thresholds, automation rules, device info
5. **Alerts Center** — full list of past alerts with severity and timestamps
6. **(Optional, future-ready) Multi-device view** — a bin list/grid, scaffolded even if only one bin exists today

---

## ENGINEERING EXPECTATIONS

- Clean, typed, well-organized code (TypeScript throughout).
- Sensible folder structure separating UI components, hooks, API clients, and types.
- Reusable component library (Button, Card, Modal, Toast, Badge, Gauge, Chart wrapper, etc.) rather than one-off styled elements per page.
- Environment variables for all API keys/secrets (Unsplash key, Supabase keys, ESP32 base URL) — never hardcoded.
- Basic error boundaries and loading/error handling on every data-fetching component.
- Write a short README explaining setup, environment variables, and how local ESP32 discovery/config works.

---

## DELIVERABLE

Build this as a working full-stack application (frontend + backend + Supabase schema/migrations), with the visual quality and interaction polish described above treated as a **hard requirement, not a nice-to-have**. If you must trade off scope, cut secondary features (like the multi-bin view) before cutting visual quality — the design is core to the product's credibility as an accountability tool.
