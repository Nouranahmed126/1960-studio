import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser-only Supabase client.
 *
 * Supabase JS already persists browser sessions in localStorage by default.
 * Keep one client per tab and avoid mirroring rotating refresh tokens into
 * a second, hand-written cookie store (which can become stale on Safari).
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

/**
 * Read the already-restored browser session without making an extra /user
 * network request on every route change. Database RLS remains the authority
 * for every read/write; this helper is only for client-side UI state.
 */
export async function getAuthUser() {
  const db = getSupabase();
  if (!db) return { data: { user: null }, error: null };

  const { data, error } = await db.auth.getSession();
  return {
    data: { user: data.session?.user ?? null },
    error,
  };
}
