"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase-browser";
type Profile = {full_name:string; approval_status:string; app_role:string};
export default function Dashboard() {
 const [profile,setProfile]=useState<Profile|null>(null);
 const [state,setState]=useState("جارٍ التحقق من الحساب...");
 useEffect(()=>{
  let active=true;
  async function load(){
   const supabase=getSupabase();
   if(!supabase){if(active)setState("إعدادات Supabase غير مكتملة.");return;}
   const {data:{user},error}=await supabase.auth.getUser();
   if(error||!user){window.location.replace("/login");return;}
   const result=await supabase.from("profiles").select("full_name,approval_status,app_role").eq("id",user.id).single();
   if(!active)return;
   if(result.error||!result.data){setState("تعذر قراءة بيانات الحساب. تواصلي مع المشرفة.");return;}
   setProfile(result.data as Profile);setState("");
  }
  void load();return()=>{active=false};
 },[]);
 async function logout(){await getSupabase()?.auth.signOut();window.location.replace("/login");}
 return <main style={{maxWidth:800,margin:"auto",padding:28}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
   <a href="/" style={{color:"#d5a66d"}}>1960 STUDIO</a>
   <button onClick={logout} style={{padding:10,borderRadius:8}}>خروج</button>
  </header>
  {profile ? <section style={{marginTop:60}}>
    <h1>أهلًا، {profile.full_name}</h1>
    {profile.approval_status!=="approved" ? <p>حسابك في انتظار موافقة المشرفة. مش هتظهر ملفات الفرق قبل الموافقة.</p>
      : <><p>{profile.app_role==="supervisor"?"حساب المشرفة":"تم اعتماد حسابك"}.</p><p>لوحة الفرق والتكليفات قيد التطوير والاختبار.</p></>}
   </section> : <p role="status" style={{marginTop:50}}>{state}</p>}
 </main>;
}
