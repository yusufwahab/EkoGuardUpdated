-- EkoGuard cloud schema. Run this in the Supabase SQL editor (or via the
-- Supabase CLI: `supabase db push`) before starting the backend with
-- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set.
--
-- Multi-bin ready by design: every table hangs off `devices.id`, so adding
-- a second bin is a row insert, not a schema change.

create table if not exists devices (
  id text primary key,                          -- matches the firmware-derived deviceId, e.g. "esp32-a1b2c3"
  name text not null default 'Unnamed bin',
  location text,
  base_url text not null,                        -- e.g. http://esp32-a1b2c3.local
  -- 75, not 85: the firmware's fillLevel only ever reports 0/25/50/75/100
  -- (4 discrete tripwire tiers, not a continuous reading - see
  -- docs/device-api.md), so a threshold between two tiers would never fire.
  fill_alert_threshold int not null default 75 check (fill_alert_threshold between 1 and 100),
  fan_max_runtime_minutes int not null default 120 check (fan_max_runtime_minutes > 0),
  created_at timestamptz not null default now()
);

create table if not exists readings (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id) on delete cascade,
  fill_level int,
  distance_cm numeric,
  fan_status boolean,
  mode text check (mode in ('automatic', 'manual')),
  recorded_at timestamptz not null default now()
);
create index if not exists readings_device_time_idx on readings (device_id, recorded_at desc);

create table if not exists fan_events (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id) on delete cascade,
  action text not null check (action in ('on', 'off')),
  trigger text not null check (trigger in ('manual', 'automatic')),
  occurred_at timestamptz not null default now()
);
create index if not exists fan_events_device_time_idx on fan_events (device_id, occurred_at desc);

create table if not exists mode_events (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id) on delete cascade,
  mode text not null check (mode in ('automatic', 'manual')),
  occurred_at timestamptz not null default now()
);
create index if not exists mode_events_device_time_idx on mode_events (device_id, occurred_at desc);

create table if not exists alerts (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id) on delete cascade,
  type text not null check (type in ('fill_threshold', 'offline', 'fan_runtime')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  acknowledged boolean not null default false,
  occurred_at timestamptz not null default now()
);
create index if not exists alerts_device_time_idx on alerts (device_id, occurred_at desc);

-- Row Level Security: the backend talks to Supabase with the service-role
-- key (bypasses RLS), so these policies only govern anything querying with
-- the anon/public key (e.g. if the frontend is ever pointed at Supabase
-- directly in the future). Tighten before shipping a public dashboard.
alter table devices enable row level security;
alter table readings enable row level security;
alter table fan_events enable row level security;
alter table mode_events enable row level security;
alter table alerts enable row level security;

create policy "public read" on devices for select using (true);
create policy "public read" on readings for select using (true);
create policy "public read" on fan_events for select using (true);
create policy "public read" on mode_events for select using (true);
create policy "public read" on alerts for select using (true);
