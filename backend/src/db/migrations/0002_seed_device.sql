-- Seeds one starter device row so it's persisted in Supabase (editable from
-- the frontend's Settings page afterwards) instead of falling back to the
-- DEVICE_ID / DEVICE_BASE_URL env vars on every backend restart.
--
-- Edit the values below to match your real device before running - `id`
-- must match what the firmware logs to serial at boot (getDeviceId() in
-- esp32/src/network.cpp, e.g. "esp32-a1b2c3"), and `base_url` its mDNS
-- name or local IP.
insert into devices (id, name, location, base_url)
values ('esp32-bin-001', 'EkoGuard bin', null, 'http://esp32-bin-001.local')
on conflict (id) do nothing;
