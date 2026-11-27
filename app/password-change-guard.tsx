"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "../lib/supabase-browser";

export default function PasswordChangeGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/change-password" || pathname === "/login") return;
    const db = getSupabase();
    if (!db) return;

    let active = true;
    void db.auth.getUser().then(({ data: { user } }) => {
      if (active && user?.app_metadata?.must_change_password === true) {
        window.location.replace("/change-password");
      }
    }).catch(() => undefined);

    return () => { active = false; };
  }, [pathname]);

  return null;
}
