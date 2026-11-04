"use client";
import { useEffect } from "react";
import { getSupabase } from "../lib/supabase-browser";

export default function ReturningUserRedirect() {
  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    let active = true;
    void db.auth.getSession().then(({ data: { session }, error }) => {
      if (active && !error && session?.user) window.location.replace("/dashboard");
    });
    return () => { active = false; };
  }, []);
  return null;
}
