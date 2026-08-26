import { WebSocketServer, WebSocket as WsClient } from "ws";
import type { Server } from "node:http";
import type { DeviceSnapshot } from "../types/device.js";

let wss: WebSocketServer | null = null;

/** Frontend-facing WebSocket server, mounted on the same HTTP server as Express. */
export function attachWsHub(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "hello" }));
  });

  return wss;
}

/** Pushes a device snapshot to every connected frontend client. */
export function broadcastToFrontend(deviceId: string, snapshot: DeviceSnapshot) {
  if (!wss) return;
  const message = JSON.stringify({ type: "device:update", deviceId, snapshot });
  for (const client of wss.clients) {
    if (client.readyState === WsClient.OPEN) client.send(message);
  }
}

export function broadcastAlert(deviceId: string, type: string, severity: string, message: string) {
  if (!wss) return;
  const payload = JSON.stringify({ type: "alert", deviceId, alertType: type, severity, message });
  for (const client of wss.clients) {
    if (client.readyState === WsClient.OPEN) client.send(payload);
  }
}
