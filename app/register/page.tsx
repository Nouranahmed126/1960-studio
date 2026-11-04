"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";
type Team = { id: number; name: string };
export default function Register() {
 const [teams,setTeams]=useState<Team[]>([]);
 const [selected,setSelected]=useState<number[]>([]);
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const db=getSupabase();
  if(!db){setMessage("الاتصال بـ Supabase لسه مش متضبط.");return;}
  void db.from("teams").select("id,name").order("id").then(({data,error})=>{
   if(error)setMessage("تعذر تحميل الفرق. لازم تفعيل سياسة عرض أسماء الفرق في Supabase.");
   else setTeams((data??[]) as Team[]);
  });
 },[]);
 function toggle(id:number){setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<3?[...old,id]:old);}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage("");
  const parts=name.trim().split(/\s+/).filter(Boolean);
  if(parts.length<3){setMessage("اكتبي الاسم الثلاثي على الأقل.");return;}
  if(selected.length<2||selected.length>3){setMessage("اختاري فريقين أو ثلاثة فرق.");return;}
  if(password.length<8){setMessage("كلمة المرور لازم تكون 8 حروف على الأقل.");return;}
  const db=getSupabase();if(!db){setMessage("الاتصال بـ Supabase لسه مش متضبط.");return;}
  setBusy(true);
  try{
   const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name.trim(),requested_team_ids:selected}}});
   if(error){setMessage(error.message.toLowerCase().includes("already")||error.message.toLowerCase().includes("registered")?"البريد ده مسجل بالفعل. اضغطي «عندي حساب بالفعل» وسجّلي الدخول، وبعدها اختاري الفرق من لوحة الطالب.":"تعذر إنشاء الحساب: "+error.message+" — لو عندك حساب سابق، استخدمي تسجيل الدخول بدل إنشاء حساب جديد.");return;}
   if(!data.session){setMessage("تم إنشاء طلب الحساب. افتحي رسالة تأكيد البريد الإلكتروني (وافحصي الرسائل غير المرغوبة)، وبعد التأكيد سجّلي الدخول. اختيارات الفرق محفوظة مع طلبك وسيحاول الموقع إرسالها عند أول دخول.");return;}
   const result=await db.rpc("request_my_teams",{p_team_ids:selected});
   if(result.error){setMessage("الحساب اتعمل، لكن طلب الفرق لم يُحفظ. سجّلي الدخول وكمّلي اختيار الفرق.");return;}
   window.location.assign("/dashboard");
  }catch{setMessage("حصلت مشكلة اتصال. حاولي تاني.");}
  finally{setBusy(false);}
 }
 const inputStyle={width:"100%",boxSizing:"border-box" as const,display:"block",padding:12,marginTop:6,borderRadius:9,border:"1px solid #596174",background:"#10131c",color:"white",fontSize:16};
 return <main style={{maxWidth:480,margin:"45px auto",padding:20}}>
  <a href="/" style={{color:"#d5a66d"}}>1960 STUDIO</a>
  <h1>انضمي لفريق الفيلم</h1>
  <p style={{color:"#aeb8ca",lineHeight:1.8}}>اختاري فريقين أو ثلاثة. العضوية بتتفعل بعد موافقة المشرفة.</p>
  <form onSubmit={submit} style={{display:"grid",gap:18}}>
   <label>الاسم الثلاثي<input style={inputStyle} required autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>البريد الإلكتروني<input style={inputStyle} required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>كلمة المرور<input style={inputStyle} required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <fieldset style={{border:"1px solid #596174",borderRadius:12,padding:15}}>
    <legend>الفرق المطلوبة ({selected.length} من 2–3)</legend>
    {teams.map(team=><label key={team.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
      <input type="checkbox" checked={selected.includes(team.id)} onChange={()=>toggle(team.id)}/>{team.name}
    </label>)}
    {!teams.length&&<p>جارٍ تحميل الفرق...</p>}
   </fieldset>
   <button disabled={busy||teams.length===0} style={{padding:15,border:0,borderRadius:10,background:"#d5a66d",fontWeight:700}}>{busy?"جارٍ التسجيل...":"إنشاء حساب وطلب الانضمام"}</button>
  </form>
  {message&&<p role="status" style={{lineHeight:1.8,color:"#ffca9f"}}>{message}</p>}
  <p style={{color:"#ffdfb2",lineHeight:1.8}}>⚠️ لو سجلتي قبل كده، حتى لو طلب الفرق ما اتحفظش، ما تعمليش حساب جديد. ادخلي بحسابك القديم واختاري الفرق من لوحة الطالب.</p><p><a href="/login" style={{color:"#d5a66d",fontWeight:700}}>عندي حساب بالفعل — تسجيل الدخول</a></p>
 </main>;
}