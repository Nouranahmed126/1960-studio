"use client";
import {useEffect,useState,type FormEvent} from "react";
import {getAuthUser,getPublicSupabase,getSupabase} from "../../lib/supabase-browser";

type Honor={id:number;student_name:string;achievement:string;award:string;stars:number;note:string|null;created_at:string};

export default function HonorBoard(){
 const [items,setItems]=useState<Honor[]>([]);
 const [supervisor,setSupervisor]=useState(false);
 const [name,setName]=useState("");
 const [achievement,setAchievement]=useState("");
 const [award,setAward]=useState("النجم الأسبوعي");
 const [stars,setStars]=useState(5);
 const [note,setNote]=useState("");
 const [status,setStatus]=useState("");

 async function load(){
  const db=getSupabase();
  const publicDb=getPublicSupabase();
  if(!publicDb)return;
  const {data:{user}}=await getAuthUser();
  if(user&&db){
   const p=await db.from("profiles").select("app_role").eq("id",user.id).maybeSingle();
   setSupervisor(!p.error&&p.data?.app_role==="supervisor");
  }else{
   setSupervisor(false);
  }
  const r=await publicDb.from("studio_honors")
   .select("id,student_name,achievement,award,stars,note,created_at")
   .order("created_at",{ascending:false})
   .limit(100);
  if(!r.error)setItems((r.data??[]) as Honor[]);
  else setStatus(r.error.message);
 }

 useEffect(()=>{
  void load();
  const db=getSupabase();
  if(!db)return;
  const channel=db.channel("honor-board-live")
   .on("postgres_changes",{event:"*",schema:"public",table:"studio_honors"},()=>void load())
   .subscribe();
  return()=>{void db.removeChannel(channel)};
 },[]);

 async function add(e:FormEvent){
  e.preventDefault();
  const db=getSupabase();
  if(!db)return;
  const {data:{user}}=await getAuthUser();
  if(!user){setStatus("سجّلي الدخول بحساب المشرفة لإضافة تكريم.");return;}
  const profile=await db.from("profiles").select("app_role").eq("id",user.id).maybeSingle();
  if(profile.error||profile.data?.app_role!=="supervisor"){setSupervisor(false);setStatus("إضافة التكريم متاحة للمشرفة المعتمدة فقط.");return;}
  const r=await db.from("studio_honors").insert({
   student_name:name.trim(),achievement:achievement.trim(),award,stars,
   note:note.trim()||null,created_by:user.id
  });
  if(r.error)setStatus(r.error.message);
  else{setName("");setAchievement("");setNote("");setStatus("تم نشر التكريم");await load();}
 }

 async function remove(id:number){
  if(!window.confirm("حذف هذا التكريم؟"))return;
  const db=getSupabase();
  if(!db)return;
  const {data:{user}}=await getAuthUser();
  if(!user){setStatus("سجّلي الدخول بحساب المشرفة لحذف التكريم.");return;}
  const profile=await db.from("profiles").select("app_role").eq("id",user.id).maybeSingle();
  if(profile.error||profile.data?.app_role!=="supervisor"){setSupervisor(false);setStatus("حذف التكريم متاح للمشرفة المعتمدة فقط.");return;}
  const r=await db.from("studio_honors").delete().eq("id",id);
  if(r.error)setStatus(r.error.message);
  else await load();
 }

 return <main dir="rtl" className="honor-board-page" style={{maxWidth:1000,margin:"auto",padding:"35px 20px 110px"}}>
  <a href="/">← الرئيسية</a>
  <p style={{color:"#e9afc2"}}>Plateau Crew Hub</p>
  <h1 className="honor-board-title">🏆 لوحة شرف الفريق</h1>
  <p>نجوم الأسبوع وتكريمات الإخراج — تقدير لكل إنجاز يستحق التصفيق 🎬</p>
  {status&&<p role="status">{status}</p>}
  {supervisor&&<form className="honor-board-form" onSubmit={add} style={{display:"grid",gap:12,padding:20,border:"1px solid #8a6074",borderRadius:18,margin:"25px 0"}}>
   <h2>🎞 إضافة تكريم جديد</h2>
   <input required maxLength={120} placeholder="اسم الطالب أو الفريق" value={name} onChange={e=>setName(e.target.value)}/>
   <textarea required maxLength={500} placeholder="الإنجاز أو التكليف المميز" value={achievement} onChange={e=>setAchievement(e.target.value)}/>
   <select value={award} onChange={e=>setAward(e.target.value)}><option>النجم الأسبوعي</option><option>الكلاكيت الذهبي</option><option>تكريمات الإخراج</option><option>إنجاز مميز</option></select>
   <label>التقييم <select value={stars} onChange={e=>setStars(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} نجوم</option>)}</select></label>
   <textarea placeholder="رسالة تقدير من المشرفة (اختياري)" value={note} onChange={e=>setNote(e.target.value)}/>
   <button type="submit">نشر التكريم ⭐</button>
  </form>}
  <div className="honor-board-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:16,marginTop:25}}>
   {items.map(item=><article className="honor-board-card" key={item.id} style={{border:"1px solid #9e7489",borderRadius:18,padding:22,background:"#39303b",boxShadow:"0 12px 30px #0003"}}>
    <span style={{color:"#f0c17d"}}>🎬 {item.award}</span>
    <h2 style={{fontSize:21}}>{item.student_name}</h2>
    <p style={{color:"#ffcf82",letterSpacing:3}}>{"★".repeat(item.stars)}{"☆".repeat(5-item.stars)}</p>
    <p style={{lineHeight:1.9}}>{item.achievement}</p>
    {item.note&&<p style={{fontStyle:"italic",color:"#e7c5d2"}}>«{item.note}»</p>}
    <small>{new Date(item.created_at).toLocaleDateString("ar-EG")}</small>
    {supervisor&&<button onClick={()=>void remove(item.id)} style={{display:"block",marginTop:12}}>حذف التكريم</button>}
   </article>)}
  </div>
  {items.length===0&&<p style={{padding:30,textAlign:"center"}}>اللوحة جاهزة لاستقبال أول تكريم من المشرفة ⭐</p>}
 </main>;
}
