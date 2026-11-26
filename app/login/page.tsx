"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";
const REMEMBER_EMAIL_KEY = "studio1960:remembered-login-email";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const db = getSupabase();
    try {
      const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberEmail(true);
      }
    } catch {
      // Browser storage can be disabled.
    }
    if (!db) return;
    let active = true;
    void db.auth.getSession().then(({ data: { session } }) => {
      if (active && session?.user) window.location.replace("/");
    });
    return () => { active = false; };
  }, []);
  async function resendConfirmation(){const db=getSupabase();if(!db)return;if(!email.trim()){setMessage("اكتبي بريدك الإلكتروني الأول، وبعدها اضغطي إعادة إرسال التأكيد.");return;}setBusy(true);const {error}=await db.auth.resend({type:"signup",email:email.trim()});setBusy(false);setMessage(error?"تعذر طلب رسالة التأكيد: "+error.message:"لو البريد مسجل ولسه محتاج تأكيد، هتوصلك رسالة جديدة. راجعي البريد والرسائل غير المرغوبة.");}
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) { setMessage("لسه محتاجين نضبط إعدادات اتصال Supabase."); return; }
    const loginEmail = email.trim();
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email:loginEmail.includes("@")?loginEmail:loginEmail.toLowerCase()+"@students.1960.invalid", password });
      if (error) { setMessage(error.message.toLowerCase().includes("email not confirmed")?"بريدك لسه غير مؤكَّد. افتحي رسالة التأكيد من البريد أو استخدمي زر إعادة إرسال التأكيد تحت.":"تعذر تسجيل الدخول: "+error.message); return; }
      try {
        if (rememberEmail) window.localStorage.setItem(REMEMBER_EMAIL_KEY, loginEmail);
        else window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        // Sign-in remains available when browser storage is disabled.
      }
      window.location.replace("/");
    } catch { setMessage("حصلت مشكلة في الاتصال. حاولي تاني."); }
    finally { setBusy(false); }
  }
  return <main className="studio-login-page" dir="rtl">
    <section className="studio-login-card">
      <a className="studio-login-brand" href="/">Plateau Crew Hub</a>
      <h1>تسجيل الدخول</h1>
      <p className="studio-login-intro">لأعضاء مشروع التخرج والمشرفة.</p>
      <form onSubmit={submit} className="studio-login-form">
        <label>اسم المستخدم (الطالب) أو البريد الإلكتروني (المشرفة)<input type="text" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>كلمة المرور<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label className="studio-remember-login"><input type="checkbox" checked={rememberEmail} onChange={e=>setRememberEmail(e.target.checked)}/> تذكّر بريدي الإلكتروني على هذا الجهاز</label>
        <button type="submit" disabled={busy}>{busy?"جارٍ الدخول...":"دخول"}</button>
      </form>
      {message && <p role="alert" className="studio-login-message">{message}</p>}
      <button className="studio-resend-confirmation" type="button" disabled={busy} onClick={()=>void resendConfirmation()}>إعادة إرسال التأكيد</button>
      <p className="studio-login-note">سيظل تسجيل الدخول نشطًا على هذا الجهاز حتى تسجّلي الخروج. لا نحفظ كلمة المرور في المتصفح.</p>
      <p className="studio-login-register">طالب جديد؟ <a href="/register">إنشاء حساب وطلب الانضمام</a></p>
    </section>
  </main>;
}
