"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    let active = true;
    void db.auth.getSession().then(({ data: { session } }) => {
      if (active && session?.user) window.location.replace("/dashboard");
    });
    return () => { active = false; };
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) { setMessage("لسه محتاجين نضبط إعدادات اتصال Supabase."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email:email.includes("@")?email.trim():email.trim().toLowerCase()+"@students.1960.invalid", password });
      if (error) { setMessage(error.message.toLowerCase().includes("email not confirmed")?"بريدك لسه غير مؤكَّد. افتحي رسالة التأكيد من البريد أو استخدمي زر إعادة إرسال التأكيد تحت.":"تعذر تسجيل الدخول: "+error.message); return; }
      window.location.replace("/dashboard");
    } catch { setMessage("حصلت مشكلة في الاتصال. حاولي تاني."); }
    finally { setBusy(false); }
  }
  return <main className="studio-login-page" dir="rtl">
    <section className="studio-login-card">
      <a className="studio-login-brand" href="/">STUDIO 1960</a>
      <h1>تسجيل الدخول</h1>
      <p className="studio-login-intro">لأعضاء مشروع التخرج والمشرفة.</p>
      <form onSubmit={submit} className="studio-login-form">
        <label>اسم المستخدم للطالب أو البريد الإلكتروني للمشرفة<input type="text" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>كلمة المرور<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <button type="submit" disabled={busy}>{busy?"جارٍ الدخول...":"دخول"}</button>
      </form>
      {message && <p role="alert" className="studio-login-message">{message}</p>}
      <p className="studio-login-note">الطلاب الجدد لا يحتاجون بريدًا إلكترونيًا. حساب المشرفة القديم يعمل بالبريد.</p>
      <p className="studio-login-register">طالب جديد؟ <a href="/register">إنشاء حساب وطلب الانضمام</a></p>
    </section>
  </main>;
}
