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
  async function resendConfirmation(){const db=getSupabase();if(!db)return;if(!email.trim()){setMessage("اكتبي بريدك الإلكتروني الأول، وبعدها اضغطي إعادة إرسال التأكيد.");return;}setBusy(true);const {error}=await db.auth.resend({type:"signup",email:email.trim()});setBusy(false);setMessage(error?"تعذر طلب رسالة التأكيد: "+error.message:"لو البريد مسجل ولسه محتاج تأكيد، هتوصلك رسالة جديدة. راجعي البريد والرسائل غير المرغوبة.");}
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
  return <main style={{ minHeight:"100vh",display:"grid",placeItems:"center",padding:20 }}>
    <section style={{width:"100%",maxWidth:410,padding:28,background:"#191e2a",border:"1px solid #343a49",borderRadius:20}}>
      <a href="/" style={{color:"#d5a66d",textDecoration:"none"}}>1960 STUDIO</a>
      <h1>تسجيل الدخول</h1>
      <p style={{color:"#aeb8ca",lineHeight:1.8}}>لأعضاء مشروع التخرج والمشرفة.</p>
      <form onSubmit={submit} style={{display:"grid",gap:15}}>
        <label>اسم المستخدم للطالب أو البريد الإلكتروني للمشرفة<input type="text" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} style={field}/></label>
        <label>كلمة المرور<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={field}/></label>
        <button type="submit" disabled={busy} style={{padding:14,background:"#d5a66d",border:0,borderRadius:10,fontWeight:700,cursor:"pointer"}}>{busy?"جارٍ الدخول...":"دخول"}</button>
      </form>
      {message && <p role="alert" style={{color:"#ffb5a9",lineHeight:1.8}}>{message}</p>}
      <button type="button" disabled={busy} onClick={()=>void resendConfirmation()} style={{display:"none"}} data-legacy="email-confirmation" style={{background:"transparent",border:"1px solid #7d6072",borderRadius:9,padding:11,color:"#f5c2d5",cursor:"pointer"}}>إعادة إرسال تأكيد البريد الإلكتروني</button>
      <p style={{fontSize:13,color:"#aeb8ca"}}>الطلاب الجدد لا يحتاجون بريدًا إلكترونيًا. حساب المشرفة القديم يعمل بالبريد.</p><p style={{fontSize:13,color:"#aeb8ca"}}>طالب جديد؟ <a href="/register" style={{color:"#d5a66d"}}>إنشاء حساب وطلب الانضمام</a></p>
    </section>
  </main>;
}
const field = {display:"block",width:"100%",boxSizing:"border-box" as const,padding:13,marginTop:7,borderRadius:9,border:"1px solid #596174",background:"#10131c",color:"white",fontSize:16};
