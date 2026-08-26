import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { env } from "./config/env.js";
import { deviceRegistry } from "./services/deviceRegistry.js";
import { startDevicePolling, stopDevicePolling } from "./services/devicePoller.js";
import { alertEngine } from "./services/alertEngine.js";
import { attachWsHub, broadcastAlert } from "./ws/hub.js";
import { devicesRouter } from "./routes/devices.js";
import { historyRouter } from "./routes/history.js";
import { alertsRouter } from "./routes/alerts.js";
import { settingsRouter } from "./routes/settings.js";
import { errorHandler } from "./middleware/errorHandler.js";

async function main() {
  await deviceRegistry.load();

  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, devices: deviceRegistry.list().map((d) => d.id) });
  });

  app.use("/api/devices", devicesRouter);
  app.use("/api/devices", historyRouter);
  app.use("/api/devices", settingsRouter);
  app.use("/api/alerts", alertsRouter);

  app.use(errorHandler);

  const httpServer = createServer(app);
  attachWsHub(httpServer);

  // Fan out every fired alert to connected frontend clients in real time.
  alertEngine.onAlert((deviceId, type, severity, message) => broadcastAlert(deviceId, type, severity, message));

  startDevicePolling();

  httpServer.listen(env.PORT, () => {
    console.log(`[backend] listening on http://localhost:${env.PORT} (ws on the same port at /ws)`);
  });

  const shutdown = () => {
    console.log("[backend] shutting down...");
    stopDevicePolling();
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[backend] fatal startup error:", err);
  process.exit(1);
});
