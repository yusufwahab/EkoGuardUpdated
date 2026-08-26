import { Router } from "express";
import { z } from "zod";
import { deviceRegistry } from "../services/deviceRegistry.js";
import { supabase } from "../services/supabase.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../errors.js";

export const settingsRouter = Router();

function requireDevice(id: string) {
  const device = deviceRegistry.get(id);
  if (!device) throw new HttpError(404, `Unknown device "${id}".`);
  return device;
}

// GET /api/devices/:id/settings -> name/location/thresholds/automation rules
settingsRouter.get(
  "/:id/settings",
  asyncHandler(async (req, res) => {
    const device = requireDevice(req.params.id);
    res.json({ device });
  })
);

const settingsPatch = z
  .object({
    name: z.string().min(1).max(80),
    location: z.string().max(160).nullable(),
    fill_alert_threshold: z.number().int().min(1).max(100),
    fan_max_runtime_minutes: z.number().int().min(1).max(1440),
  })
  .partial();

// PATCH /api/devices/:id/settings -> device naming/location + alert threshold + fan automation rules
settingsRouter.patch(
  "/:id/settings",
  asyncHandler(async (req, res) => {
    const device = requireDevice(req.params.id);
    const changes = settingsPatch.parse(req.body);

    if (supabase) {
      const { data, error } = await supabase.from("devices").update(changes).eq("id", device.id).select().single();
      if (error) throw new HttpError(502, `Failed to save settings: ${error.message}`);
      deviceRegistry.patch(device.id, data);
      res.json({ device: data });
      return;
    }

    // No cloud configured: settings changes only last for this process's lifetime.
    deviceRegistry.patch(device.id, changes);
    res.json({ device: deviceRegistry.get(device.id), warning: "Cloud sync not configured; settings will not persist across restarts." });
  })
);
