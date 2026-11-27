import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

/**
 * Authenticated browser client.
 * Supabase JS persists the browser session in localStorage by default.
 * Avoid duplicating rotating refresh tokens in a second custom cookie store.
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
 * Public read-only client. It deliberately never loads or stores a user
 * session, so public archive/highlight queries keep using the anon role even
 * when an unapproved or signed-in user is browsing the site.
 */
export function getPublicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!publicClient) {
    publicClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return publicClient;
}

/**
 * Read the restored browser session without making an extra /user request
 * on every route change. RLS remains the authority for every database action.
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
