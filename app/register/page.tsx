"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";
type Team = { id: number; name: string };
export default function Register() {
 const [teams,setTeams]=useState<Team[]>([]);
 const [selected,setSelected]=useState<number[]>([]);
 const [name,setName]=useState("");
 const [username,setUsername]=useState("");
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
   const {data,error}=await db.functions.invoke("student-signup",{body:{fullName:name.trim(),username:username.trim().toLowerCase(),password,teams:selected}});
   if(error||!data?.ok){let detail=data?.message; if(!detail&&error&&"context" in error){try{const response=(error as {context?:Response}).context;if(response)detail=(await response.json()).message;}catch{}} setMessage(detail||"تعذر التسجيل. إذا كنتِ سجّلتِ بالفعل، جرّبي تسجيل الدخول بنفس اسم المستخدم وكلمة المرور.");return;}
   window.location.assign("/login?registered=1");
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
   <label>اسم المستخدم (حروف إنجليزية صغيرة وأرقام وشرطة سفلية، يبدأ بحرف، 4–24 خانة)<input style={inputStyle} required minLength={4} maxLength={24} pattern="[a-z][a-z0-9_]{3,23}" autoCapitalize="none" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value.toLowerCase())}/></label>
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
  <p style={{color:"#ffdfb2",lineHeight:1.8}}>⚠️ احتفظي باسم المستخدم وكلمة المرور. مش مطلوب بريد إلكتروني أو رسالة تأكيد.</p><p><a href="/login" style={{color:"#d5a66d",fontWeight:700}}>عندي حساب بالفعل — تسجيل الدخول</a></p>
 </main>;
}