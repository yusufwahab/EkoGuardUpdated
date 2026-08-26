import { Router } from "express";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { deviceRegistry } from "../services/deviceRegistry.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../errors.js";

export const historyRouter = Router();

const RANGE_TO_MS: Record<string, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

const rangeSchema = z.enum(["hour", "day", "week"]).default("day");

function requireDevice(id: string) {
  const device = deviceRegistry.get(id);
  if (!device) throw new HttpError(404, `Unknown device "${id}".`);
  return device;
}

// GET /api/devices/:id/history?range=hour|day|week -> fill-level/fan history for charts
historyRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const device = requireDevice(req.params.id);
    const range = rangeSchema.parse(req.query.range);

    if (!supabase) {
      res.json({ range, cloudConfigured: false, readings: [] });
      return;
    }

    const since = new Date(Date.now() - RANGE_TO_MS[range]).toISOString();
    const { data, error } = await supabase
      .from("readings")
      .select("fill_level, distance_cm, fan_status, mode, recorded_at")
      .eq("device_id", device.id)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true });

    if (error) throw new HttpError(502, `Failed to read history: ${error.message}`);
    res.json({ range, cloudConfigured: true, readings: data });
  })
);

// GET /api/devices/:id/events -> combined fan on/off + mode-change event log
historyRouter.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const device = requireDevice(req.params.id);
    const limit = z.coerce.number().min(1).max(500).default(100).parse(req.query.limit);

    if (!supabase) {
      res.json({ cloudConfigured: false, events: [] });
      return;
    }

    const [fanEvents, modeEvents] = await Promise.all([
      supabase
        .from("fan_events")
        .select("*")
        .eq("device_id", device.id)
        .order("occurred_at", { ascending: false })
        .limit(limit),
      supabase
        .from("mode_events")
        .select("*")
        .eq("device_id", device.id)
        .order("occurred_at", { ascending: false })
        .limit(limit),
    ]);

    if (fanEvents.error) throw new HttpError(502, `Failed to read fan events: ${fanEvents.error.message}`);
    if (modeEvents.error) throw new HttpError(502, `Failed to read mode events: ${modeEvents.error.message}`);

    const events = [
      ...fanEvents.data.map((e) => ({ kind: "fan" as const, ...e })),
      ...modeEvents.data.map((e) => ({ kind: "mode" as const, ...e })),
    ]
      .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))
      .slice(0, limit);

    res.json({ cloudConfigured: true, events });
  })
);
