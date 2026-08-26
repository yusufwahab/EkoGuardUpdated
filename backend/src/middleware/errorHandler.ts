import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DeviceRejectedError, DeviceUnreachableError } from "../services/deviceClient.js";
import { HttpError } from "../errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request body.", detail: err.flatten() });
    return;
  }
  if (err instanceof DeviceUnreachableError) {
    res.status(503).json({ error: "Device is unreachable on the local network.", detail: err.message });
    return;
  }
  if (err instanceof DeviceRejectedError) {
    res.status(err.status).json({ error: "Device rejected the request.", detail: err.body });
    return;
  }

  console.error("[backend] unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
}
