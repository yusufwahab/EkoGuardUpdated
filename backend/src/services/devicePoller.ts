import WebSocket from "ws";
import { DeviceClient } from "./deviceClient.js";
import { deviceRegistry } from "./deviceRegistry.js";
import { stateCache } from "./stateCache.js";
import { alertEngine } from "./alertEngine.js";
import { syncToSupabase } from "./supabase.js";
import { broadcastToFrontend } from "../ws/hub.js";
import type { DeviceLivePayload, DeviceMode, DeviceSnapshot } from "../types/device.js";
import type { DeviceRecord } from "../types/domain.js";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const POLL_FALLBACK_MS = 5000;
const READING_INSERT_MIN_INTERVAL_MS = 10000;

/**
 * Owns the live connection to one physical device: prefers its WebSocket
 * stream, falls back to HTTP polling of /api/status if the socket is down,
 * and treats every non-response as "device offline" rather than an error -
 * this is the local-first resilience the product brief requires.
 */
class DeviceConnection {
  private socket: WebSocket | null = null;
  private reconnectDelay = RECONNECT_BASE_MS;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastInsertAt = 0;
  private wasOnline = false;
  private prevFan: boolean | null = null;
  private prevMode: DeviceMode | null = null;

  constructor(private deviceId: string) {}

  // Always reads the registry fresh rather than caching a DeviceRecord at
  // construction time: deviceRegistry.patch() (PATCH /settings) replaces
  // the map entry with a new object rather than mutating in place, so a
  // cached reference would never see an edited base_url, alert threshold,
  // fan runtime limit, name, or location - this connection would keep
  // working against stale data until the backend restarted.
  private get device(): DeviceRecord {
    const device = deviceRegistry.get(this.deviceId);
    if (!device) throw new Error(`Device "${this.deviceId}" was removed from the registry`);
    return device;
  }

  start() {
    this.connectWs();
  }

  stop() {
    this.stopPollFallback();
    this.socket?.close();
    this.socket = null;
  }

  private connectWs() {
    let socket: WebSocket;
    try {
      socket = new WebSocket(new DeviceClient(this.device.base_url).wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.on("open", () => {
      this.reconnectDelay = RECONNECT_BASE_MS;
      this.stopPollFallback();
    });

    socket.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as DeviceLivePayload;
        this.handleLivePayload(payload);
      } catch (err) {
        console.error(`[devicePoller:${this.device.id}] malformed WS payload:`, err);
      }
    });

    socket.on("close", () => {
      this.socket = null;
      this.handleUnreachable();
      this.scheduleReconnect();
    });

    // "close" always follows "error" for ws sockets - avoid double handling here.
    socket.on("error", () => {});
  }

  private scheduleReconnect() {
    this.startPollFallback(); // keeps status semi-fresh via HTTP while the socket is down
    setTimeout(() => this.connectWs(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }

  private startPollFallback() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      try {
        const status = await new DeviceClient(this.device.base_url).getStatus();
        this.handleLivePayload({
          deviceId: this.device.id,
          fillLevel: status.fillLevel,
          distanceCm: status.distanceCm,
          fanStatus: status.fan,
          mode: status.mode,
          timestamp: null,
        });
      } catch {
        this.handleUnreachable();
      }
    }, POLL_FALLBACK_MS);
  }

  private stopPollFallback() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private handleLivePayload(payload: DeviceLivePayload) {
    const snapshot: DeviceSnapshot = {
      deviceId: this.device.id,
      name: this.device.name,
      location: this.device.location,
      baseUrl: this.device.base_url,
      fillLevel: payload.fillLevel,
      distanceCm: payload.distanceCm,
      fan: payload.fanStatus,
      mode: payload.mode,
      connection: "local",
      lastUpdated: payload.timestamp ?? new Date().toISOString(),
      stale: false,
    };

    stateCache.set(this.device.id, snapshot);
    broadcastToFrontend(this.device.id, snapshot);
    alertEngine.evaluate(this.device, snapshot);

    this.wasOnline = true;
    this.logTransitions(payload);
    this.maybeInsertReading(snapshot);
  }

  private logTransitions(payload: DeviceLivePayload) {
    if (this.prevFan !== null && this.prevFan !== payload.fanStatus) {
      void syncToSupabase("insert fan event", (db) =>
        db.from("fan_events").insert({
          device_id: this.device.id,
          action: payload.fanStatus ? "on" : "off",
          trigger: payload.mode === "manual" ? "manual" : "automatic",
        })
      );
    }
    this.prevFan = payload.fanStatus;

    if (this.prevMode !== null && this.prevMode !== payload.mode) {
      void syncToSupabase("insert mode event", (db) =>
        db.from("mode_events").insert({ device_id: this.device.id, mode: payload.mode })
      );
    }
    this.prevMode = payload.mode;
  }

  private maybeInsertReading(snapshot: DeviceSnapshot) {
    const now = Date.now();
    if (now - this.lastInsertAt < READING_INSERT_MIN_INTERVAL_MS) return;
    this.lastInsertAt = now;

    void syncToSupabase("insert reading", (db) =>
      db.from("readings").insert({
        device_id: this.device.id,
        fill_level: snapshot.fillLevel,
        distance_cm: snapshot.distanceCm,
        fan_status: snapshot.fan,
        mode: snapshot.mode,
      })
    );
  }

  private handleUnreachable() {
    if (this.wasOnline) {
      this.wasOnline = false;
      alertEngine.markOffline(this.device);
    }
    const cached = stateCache.get(this.device.id);
    if (cached) {
      broadcastToFrontend(this.device.id, { ...cached, connection: "offline" });
    }
  }
}

const connections: DeviceConnection[] = [];

export function startDevicePolling() {
  for (const device of deviceRegistry.list()) {
    const conn = new DeviceConnection(device.id);
    connections.push(conn);
    conn.start();
  }
}

export function stopDevicePolling() {
  for (const conn of connections) conn.stop();
  connections.length = 0;
}
