import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function createPersistentBrowserStorage(projectUrl: string) {
  const projectRef = new URL(projectUrl).hostname.split(".")[0].replace(/[^a-zA-Z0-9_-]/g, "");
  const prefix = `pch_auth_${projectRef}`;
  const chunkSize = 3000;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";

  function readCookie(name: string): string | null {
    const match = document.cookie.split("; ").find(part => part.startsWith(name + "="));
    return match ? match.slice(name.length + 1) : null;
  }

  function writeCookie(name: string, value: string, maxAge = 31536000) {
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }

  function removeCookie(name: string) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }

  return {
    getItem(key: string): string | null {
      try {
        const base = `${prefix}_${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        const count = Number(readCookie(base + "_count") || "0");
        if (count > 0 && count < 10) {
          let encoded = "";
          for (let i = 0; i < count; i++) {
            const part = readCookie(base + "_" + i);
            if (part === null) { encoded = ""; break; }
            encoded += part;
          }
          if (encoded) {
            const value = decodeURIComponent(encoded);
            try { localStorage.setItem(key, value); } catch {}
            return value;
          }
        }
        const legacy = localStorage.getItem(key);
        if (legacy) {
          this.setItem(key, legacy);
          return legacy;
        }
      } catch {}
      return null;
    },
    setItem(key: string, value: string) {
      try {
        const base = `${prefix}_${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        const encoded = encodeURIComponent(value);
        const chunks = encoded.match(new RegExp(`[\\s\\S]{1,${chunkSize}}`, "g")) || [""];
        const oldCount = Number(readCookie(base + "_count") || "0");
        for (let i = 0; i < Math.max(oldCount, chunks.length); i++) {
          if (i < chunks.length) writeCookie(base + "_" + i, chunks[i]);
          else removeCookie(base + "_" + i);
        }
        writeCookie(base + "_count", String(chunks.length));
        try { localStorage.setItem(key, value); } catch {}
      } catch {
        try { localStorage.setItem(key, value); } catch {}
      }
    },
    removeItem(key: string) {
      try {
        const base = `${prefix}_${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        const count = Number(readCookie(base + "_count") || "0");
        for (let i = 0; i < Math.min(count, 10); i++) removeCookie(base + "_" + i);
        removeCookie(base + "_count");
        try { localStorage.removeItem(key); } catch {}
      } catch {}
    },
  };
}

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    const storage = typeof document !== "undefined" ? createPersistentBrowserStorage(url) : undefined;
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        ...(storage ? { storage } : {}),
      },
    });
  }
  return client;
}
