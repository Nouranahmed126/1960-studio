"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function checkAccount() {
      const db = getSupabase();
      if (!db) {
        if (active) { setMessage("تعذر الاتصال بالموقع."); setLoading(false); }
        return;
      }
      const { data: { user }, error } = await db.auth.getUser();
      if (!active) return;
      if (error || !user) {
        window.location.replace("/login");
        return;
      }
      if (user.app_metadata?.must_change_password !== true) {
        window.location.replace("/");
        return;
      }
      setLoading(false);
    }
    void checkAccount();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setMessage("كلمة المرور يجب أن تكون 12 حرفًا على الأقل وتحتوي على حروف وأرقام.");
      return;
    }
    if (password !== confirm) {
      setMessage("كلمتا المرور غير متطابقتين.");
      return;
    }

    const db = getSupabase();
    if (!db) { setMessage("تعذر الاتصال بالموقع."); return; }
    setBusy(true);
    setMessage("");

    const { data, error } = await db.functions.invoke("supervisor-reset-student-password", {
      body: { action: "complete_password_change", password },
    });

    if (error) {
      setMessage(data?.message || "تعذر تحديث كلمة المرور. حاولي مرة أخرى.");
      setBusy(false);
      return;
    }

    const { error: refreshError } = await db.auth.refreshSession();
    if (refreshError) {
      await db.auth.signOut();
      window.location.replace("/login");
      return;
    }

    window.location.replace("/");
  }

  return (
    <main className="studio-login-page" dir="rtl">
      <section className="studio-login-frame" aria-label="تغيير كلمة المرور">
        <form className="studio-login-form" onSubmit={submit}>
          <h1 style={{ color: "#4b3554", textAlign: "center", margin: "0 0 8px", fontSize: 24 }}>تعيين كلمة مرور جديدة</h1>
          <p style={{ color: "#75647d", textAlign: "center", lineHeight: 1.8, margin: "0 0 16px" }}>
            كلمة المرور الحالية مؤقتة. اختاري كلمة مرور جديدة لحماية حسابك.
          </p>
          {loading ? <p style={{ textAlign: "center" }}>جارٍ التحقق من الحساب...</p> : <>
            <input
              className="studio-login-input"
              type="password"
              aria-label="كلمة المرور الجديدة"
              placeholder="كلمة المرور الجديدة"
              autoComplete="new-password"
              minLength={12}
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              disabled={busy}
            />
            <input
              className="studio-login-input"
              type="password"
              aria-label="تأكيد كلمة المرور"
              placeholder="تأكيد كلمة المرور"
              autoComplete="new-password"
              minLength={12}
              required
              value={confirm}
              onChange={event => setConfirm(event.target.value)}
              disabled={busy}
            />
            <p style={{ color: "#75647d", fontSize: 13, margin: 0 }}>12 حرفًا على الأقل، وبها حروف وأرقام.</p>
            <button className="studio-login-submit" type="submit" disabled={busy}>
              {busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </>}
          {message && <p className="studio-login-error" role="alert">{message}</p>}
        </form>
      </section>
    </main>
  );
}
