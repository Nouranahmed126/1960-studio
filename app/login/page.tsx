"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    let active = true;
    void db.auth.getSession().then(({ data: { session } }) => {
      if (active && session?.user) window.location.replace(session.user.app_metadata?.must_change_password === true ? "/change-password" : "/");
    });
    return () => { active = false; };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) { setMessage("Connection unavailable."); return; }
    setBusy(true);
    setMessage("");
    try {
      const value = username.trim();
      const email = value.includes("@") ? value : value.toLowerCase() + "@students.1960.invalid";
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message.toLowerCase().includes("email not confirmed")
          ? "Email not confirmed."
          : "Unable to sign in.");
        return;
      }
      window.location.replace(data.user?.app_metadata?.must_change_password === true ? "/change-password" : "/");
    } catch {
      setMessage("Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="studio-login-page">
      <section className="studio-login-frame" aria-label="Login">
        <form className="studio-login-form" onSubmit={submit}>
          <input
            className="studio-login-input"
            type="text"
            aria-label="Username"
            placeholder="Username"
            autoComplete="username"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={busy}
          />
          <input
            className="studio-login-input"
            type="password"
            aria-label="Password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={busy}
          />
          <button className="studio-login-submit" type="submit" disabled={busy}>
            {busy ? "…" : "Login"}
          </button>
          {message && <p className="studio-login-error" role="alert">{message}</p>}
          <p style={{ margin: "10px 0 0", color: "#6d5a75", fontSize: 14, textAlign: "center", lineHeight: 1.7 }}>نسيت بيانات الدخول؟ تواصلي مع المشرفة لاستعادة اسم المستخدم أو طلب كلمة مرور مؤقتة.</p>
        </form>
      </section>
    </main>
  );
}
