"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../../lib/supabase-browser";
type Team={id:number;name:string};
export default function NewAssignment(){
 const [teams,setTeams]=useState<Team[]>([]);
 const [selected,setSelected]=useState<number[]>([]);
 const [allowed,setAllowed]=useState(false);
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [due,setDue]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("جارٍ التحقق من صلاحية المشرفة...");
 useEffect(()=>{void (async()=>{
  const db=getSupabase();if(!db){setMessage("إعدادات Supabase غير مكتملة.");return;}
  const {data:{user}}=await db.auth.getUser();
  if(!user){window.location.replace("/login");return;}
  const p=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).single();
  if(p.error||p.data?.app_role!=="supervisor"||p.data?.approval_status!=="approved"){setMessage("الصفحة دي للمشرفة فقط.");return;}
  setAllowed(true);setMessage("");
  const t=await db.from("teams").select("id,name").order("id");
  if(t.error)setMessage("تعذر تحميل الفرق.");
  else setTeams((t.data??[]) as Team[]);
 })()},[]);
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!selected.length){setMessage("اختاري فريق واحد على الأقل.");return;}
  const db=getSupabase();if(!db)return;
  setBusy(true);setMessage("");
  try{
   const {data:{user}}=await db.auth.getUser();
   if(!user){setMessage("سجلي الدخول مرة تانية.");return;}
   const created=await db.from("assignments").insert({title:title.trim(),description:description.trim(),due_at:due?new Date(due).toISOString():null,created_by:user.id}).select("id").single();
   if(created.error||!created.data){setMessage("تعذر إنشاء التكليف. راجعي سياسات قاعدة البيانات.");return;}
   const linked=await db.from("assignment_teams").insert(selected.map(team_id=>({assignment_id:created.data.id,team_id})));
   if(linked.error){setMessage("اتعمل التكليف لكن ربطه بالفرق فشل. راجعي التكليف قبل إعادة المحاولة.");return;}
   setMessage("تم إنشاء التكليف وربطه بالفرق المحددة.");setTitle("");setDescription("");setDue("");setSelected([]);
  }catch{setMessage("حدث خطأ أثناء حفظ التكليف.");}
  finally{setBusy(false);}
 }
 const field={display:"block",width:"100%",boxSizing:"border-box" as const,marginTop:7,padding:12,border:"1px solid #596174",borderRadius:9,background:"#10131c",color:"white",fontSize:16};
 return <main style={{maxWidth:650,margin:"30px auto",padding:20}}>
  <a href="/dashboard" style={{color:"#d5a66d"}}>العودة للوحة المشرفة</a>
  <h1>تكليف جديد</h1>
  {allowed&&<form onSubmit={save} style={{display:"grid",gap:20}}>
   <label>عنوان التكليف<input required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} style={field}/></label>
   <label>التفاصيل<textarea rows={6} value={description} onChange={e=>setDescription(e.target.value)} style={field}/></label>
   <label>آخر موعد للتسليم (اختياري)<input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} style={field}/></label>
   <fieldset style={{border:"1px solid #596174",borderRadius:12,padding:15}}>
    <legend>الفرق المسؤولة</legend>
    {teams.map(t=><label key={t.id} style={{display:"flex",gap:10,padding:9}}>
     <input type="checkbox" checked={selected.includes(t.id)} onChange={()=>setSelected(old=>old.includes(t.id)?old.filter(x=>x!==t.id):[...old,t.id])}/>{t.name}
    </label>)}
   </fieldset>
   <button disabled={busy||!title.trim()} style={{padding:14,border:0,borderRadius:10,background:"#d5a66d",fontWeight:700}}>{busy?"جارٍ الحفظ...":"نشر التكليف للفرق"}</button>
  </form>}
  {message&&<p role="status" style={{color:"#ffca9f",lineHeight:1.8}}>{message}</p>}
 </main>;
}
