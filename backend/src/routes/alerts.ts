import { Router } from "express";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { listRecentAlerts } from "../services/alertEngine.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../errors.js";

export const alertsRouter = Router();

// GET /api/alerts?deviceId=&limit= -> alerts center feed
alertsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const deviceId = req.query.deviceId ? z.string().parse(req.query.deviceId) : undefined;
    const limit = z.coerce.number().min(1).max(500).default(100).parse(req.query.limit);
    const alerts = await listRecentAlerts(deviceId, limit);
    res.json({ cloudConfigured: Boolean(supabase), alerts });
  })
);

// POST /api/alerts/:id/ack -> acknowledge one alert
alertsRouter.post(
  "/:id/ack",
  asyncHandler(async (req, res) => {
    if (!supabase) throw new HttpError(503, "Cloud sync is not configured; alerts cannot be persisted or acknowledged.");

    const id = z.coerce.number().parse(req.params.id);
    const { data, error } = await supabase.from("alerts").update({ acknowledged: true }).eq("id", id).select().single();
    if (error) throw new HttpError(502, `Failed to acknowledge alert: ${error.message}`);
    res.json({ alert: data });
  })
);
