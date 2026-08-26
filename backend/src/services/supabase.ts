import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, supabaseConfigured } from "../config/env.js";

let client: SupabaseClient | null = null;

if (supabaseConfigured) {
  client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
} else {
  console.warn(
    "[supabase] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set - running with no cloud sync. " +
      "Live status/control still works; history, alerts persistence, and multi-device registry will not."
  );
}

export const supabase = client;

/**
 * Runs a Supabase write and swallows any failure. Supabase is a sync target,
 * never part of the real-time control loop - a cloud hiccup (or no cloud
 * configured at all) must never break device status/control for the user.
 */
export async function syncToSupabase(label: string, fn: (db: SupabaseClient) => PromiseLike<{ error: unknown }>) {
  if (!supabase) return;
  try {
    const { error } = await fn(supabase);
    if (error) console.error(`[supabase] ${label} failed:`, error);
  } catch (err) {
    console.error(`[supabase] ${label} threw:`, err);
  }
}
