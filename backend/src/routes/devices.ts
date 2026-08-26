import { Router } from "express";
import { z } from "zod";
import { deviceRegistry } from "../services/deviceRegistry.js";
import { stateCache } from "../services/stateCache.js";
import { DeviceClient } from "../services/deviceClient.js";
import { supabase } from "../services/supabase.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../errors.js";
import type { DeviceMode, DeviceSnapshot } from "../types/device.js";
import type { DeviceRecord } from "../types/domain.js";

export const devicesRouter = Router();

function offlinePlaceholder(device: DeviceRecord): DeviceSnapshot {
  return {
    deviceId: device.id,
    name: device.name,
    location: device.location,
    baseUrl: device.base_url,
    fillLevel: -1,
    distanceCm: -1,
    fan: false,
    mode: "automatic",
    connection: "offline",
    lastUpdated: new Date(0).toISOString(),
    stale: true,
  };
}

/**
 * Three-way connection state the brief requires: a live snapshot ("local"),
 * else the most recent Supabase reading ("cloud-cached" - last-synced data,
 * clearly marked stale), else the offline placeholder if neither exists.
 */
async function resolveSnapshot(device: DeviceRecord): Promise<DeviceSnapshot> {
  const live = stateCache.get(device.id);
  if (live) return live;

  if (supabase) {
    const { data } = await supabase
      .from("readings")
      .select("fill_level, distance_cm, fan_status, mode, recorded_at")
      .eq("device_id", device.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        deviceId: device.id,
        name: device.name,
        location: device.location,
        baseUrl: device.base_url,
        fillLevel: data.fill_level ?? -1,
        distanceCm: data.distance_cm ?? -1,
        fan: data.fan_status ?? false,
        mode: (data.mode as DeviceMode | null) ?? "automatic",
        connection: "cloud-cached",
        lastUpdated: data.recorded_at,
        stale: true,
      };
    }
  }

  return offlinePlaceholder(device);
}

function requireDevice(id: string) {
  const device = deviceRegistry.get(id);
  if (!device) {
    throw new HttpError(404, `Unknown device "${id}".`);
  }
  return device;
}

// GET /api/devices - registry overview (multi-bin ready even with one bin today)
devicesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const devices = await Promise.all(deviceRegistry.list().map(resolveSnapshot));
    res.json({ devices });
  })
);

// GET /api/devices/:id/status - the primary read the dashboard polls/subscribes to
devicesRouter.get(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const device = requireDevice(req.params.id);
    res.json(await resolveSnapshot(device));
  })
);

// GET /api/devices/:id/sensors - proxies the device live (best-effort diagnostics, not cached)
devicesRouter.get(
  "/:id/sensors",
  asyncHandler(async (req, res) => {
    const device = requireDevice(req.params.id);
    const client = new DeviceClient(device.base_url);
    const sensors = await client.getSensors();
    res.json(sensors);
  })
);

const fanBody = z.object({}).optional();

devicesRouter.post(
  "/:id/fan/:action(on|off)",
  asyncHandler(async (req, res) => {
    fanBody.parse(req.body);
    const device = requireDevice(req.params.id);
    const client = new DeviceClient(device.base_url);
    const status = await client.setFan(req.params.action === "on");
    res.json(status);
  })
);

const modeBody = z.object({ mode: z.enum(["automatic", "manual"]) });

devicesRouter.post(
  "/:id/mode",
  asyncHandler(async (req, res) => {
    const { mode } = modeBody.parse(req.body);
    const device = requireDevice(req.params.id);
    const client = new DeviceClient(device.base_url);
    const status = await client.setMode(mode);
    res.json(status);
  })
);
