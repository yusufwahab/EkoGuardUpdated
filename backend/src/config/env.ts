import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),

  // Default device for the single-bin setup. Once more bins exist, use the
  // `devices` table (device registry) instead of this env var - see
  // services/deviceRegistry.ts.
  DEVICE_ID: z.string().default("default"),
  DEVICE_BASE_URL: z.string().url().default("http://esp32-bin.local"),

  // Supabase is optional: the backend must keep serving local/live data
  // even with no cloud configured (never part of the real-time control loop).
  // Blank env vars (as shipped in .env.example) mean "not configured", not
  // an invalid URL - normalize "" to undefined before validating.
  SUPABASE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
