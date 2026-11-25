"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../lib/supabase-browser";

type Role = "student" | "supervisor" | "guest";
const destinations = [
  { href: "/", label: "Timeline", detail: "Studio updates & activity", icon: "◷" },
  { href: "/assignments", label: "Assignments", detail: "Tasks & progress", icon: "▤" },
  { href: "/submissions", label: "Quick Submit", detail: "Files, voice & written work", icon: "↥" },
  { href: "/honor-board", label: "Honors Wall", detail: "Awards & recognition", icon: "✧" },
];

export default function WelcomeGate() {
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState<Role>("guest");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setVisible(sessionStorage.getItem("plateau-welcome-seen") !== "1"); } catch { setVisible(true); }
    let active = true;
    const db = getSupabase();
    if (!db) { setReady(true); return; }
    void db.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { if (active) setReady(true); return; }
      const profile = await db.from("profiles").select("app_role").eq("id", user.id).single();
      if (active) {
        setRole(profile.data?.app_role === "supervisor" ? "supervisor" : "student");
        setReady(true);
      }
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  function enter() {
    try { sessionStorage.setItem("plateau-welcome-seen", "1"); } catch {}
    setVisible(false);
  }
  if (!visible || !ready) return null;

  const account = role === "supervisor"
    ? { href: "/dashboard", label: "Executive Office", detail: "Supervision & studio management", icon: "⌘" }
    : { href: role === "student" ? "/dashboard" : "/login", label: "My Account", detail: "Your profile & assignments", icon: "◎" };

  return (
    <section className="plateau-welcome" role="dialog" aria-modal="true" aria-label="Welcome to Plateau Crew Hub" dir="ltr">
      <div className="plateau-welcome-orbit" aria-hidden="true"/>
      <div className="plateau-welcome-inner">
        <span className="plateau-welcome-kicker">A CREATIVE PRODUCTION COMMUNITY</span>
        <div className="plateau-welcome-mark" aria-hidden="true">P<span>✦</span></div>
        <h1>Plateau <em>Crew Hub</em></h1>
        <p className="plateau-welcome-lead">One crew. One vision. A story in the making.</p>
        <div className="plateau-welcome-credits">
          <span>Academic Supervision <strong>Dr. Ahmed Abdelmoneim</strong></span>
          <span>Designed &amp; Developed by <strong>Nouran Ahmed</strong></span>
        </div>
        <div className="plateau-welcome-grid">
          {destinations.map((item, index) => (
            <Link className="plateau-welcome-card" href={item.href} key={item.label} onClick={enter} style={{ "--welcome-index": index } as React.CSSProperties}>
              <span className="plateau-welcome-icon" aria-hidden="true">{item.icon}</span>
              <span className="plateau-welcome-card-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <span className="plateau-welcome-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
          <Link className="plateau-welcome-card plateau-welcome-account" href={account.href} onClick={enter} style={{ "--welcome-index": 4 } as React.CSSProperties}>
            <span className="plateau-welcome-icon" aria-hidden="true">{account.icon}</span>
            <span className="plateau-welcome-card-copy"><strong>{account.label}</strong><small>{account.detail}</small></span>
            <span className="plateau-welcome-arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
        <button className="plateau-welcome-enter" type="button" onClick={enter}>Enter the Hub <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}
