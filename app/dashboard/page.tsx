"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase-browser";
type Profile={id:string;full_name:string;approval_status:string;app_role:string};
type Team={id:number;name:string};
type Request={user_id:string;team_id:number;status:string};
type Membership={team_id:number;role:string};
type Task={id:number;title:string;description:string|null;due_at:string|null};
export default function Dashboard(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const [teams,setTeams]=useState<Team[]>([]);
 const [requests,setRequests]=useState<Request[]>([]);
 const [students,setStudents]=useState<Profile[]>([]);
 const [members,setMembers]=useState<Membership[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [selected,setSelected]=useState<number[]>([]);
 const [message,setMessage]=useState("جارٍ تحميل حسابك...");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const db=getSupabase();
  if(!db){setMessage("إعدادات Supabase غير مكتملة.");return;}
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){window.location.replace("/login");return;}
  const p=await db.from("profiles").select("id,full_name,approval_status,app_role").eq("id",user.id).single();
  if(p.error||!p.data){setMessage("تعذر قراءة حسابك. راجعي إعدادات قاعدة البيانات.");return;}
  const current=p.data as Profile;setProfile(current);
  const teamResult=await db.from("teams").select("id,name").order("id");
  if(!teamResult.error)setTeams((teamResult.data??[]) as Team[]);
  if(current.app_role==="supervisor"){
   const [people,joins]=await Promise.all([
    db.from("profiles").select("id,full_name,approval_status,app_role").eq("app_role","student").order("created_at",{ascending:false}),
    db.from("team_join_requests").select("user_id,team_id,status")
   ]);
   if(people.error||joins.error)setMessage("تعذر تحميل طلبات الطلاب. راجعي سياسات المشرفة.");
   else{setStudents((people.data??[]) as Profile[]);setRequests((joins.data??[]) as Request[]);setMessage("");}
  }else{
   const [joins,membersResult,taskResult]=await Promise.all([
    db.from("team_join_requests").select("user_id,team_id,status").eq("user_id",user.id),
    db.from("team_members").select("team_id,role").eq("user_id",user.id),
    db.from("assignments").select("id,title,description,due_at").order("created_at",{ascending:false}).limit(30)
   ]);
   if(!joins.error){setRequests((joins.data??[]) as Request[]);setSelected(((joins.data??[]) as Request[]).map(x=>x.team_id));}
   if(!membersResult.error)setMembers((membersResult.data??[]) as Membership[]);
   if(!taskResult.error)setTasks((taskResult.data??[]) as Task[]);
   setMessage("");
  }
 },[]);
 useEffect(()=>{void load()},[load]);
 async function sendTeams(){
  if(selected.length<2||selected.length>3){setMessage("اختاري فريقين أو ثلاثة.");return;}
  const db=getSupabase();if(!db)return;
  setBusy(true);setMessage("");
  const {error}=await db.rpc("request_my_teams",{p_team_ids:selected});
  setBusy(false);
  if(error)setMessage("تعذر إرسال الطلب. تأكدي إن تحديث قاعدة البيانات اتنفذ.");
  else{setMessage("اتسجل طلبك بنجاح، وفي انتظار موافقة المشرفة.");await load();}
 }
 async function approve(id:string){
  const db=getSupabase();if(!db)return;
  setBusy(true);setMessage("");
  const {error}=await db.rpc("approve_student",{p_user_id:id});
  setBusy(false);
  if(error)setMessage("الموافقة ما تمتّش. تأكدي إن الطالب اختار فريقين أو ثلاثة وإن دالة الموافقة متفعلة.");
  else{await load();setMessage("تمت الموافقة على الطالب وفرق العمل.");}
 }
 async function logout(){await getSupabase()?.auth.signOut();window.location.replace("/login");}
 const teamName=(id:number)=>teams.find(t=>t.id===id)?.name??"فريق غير معروف";
 const buttonStyle={border:0,borderRadius:9,padding:"12px 18px",background:"#d5a66d",color:"#16171d",fontWeight:700 as const,cursor:"pointer"};
 return <main className="dashboard-shell">
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
   <a href="/" style={{color:"#d5a66d",fontWeight:700}}>1960 STUDIO</a>
   <button onClick={logout} style={buttonStyle}>تسجيل خروج</button>
  </header>
  {profile&&<section style={{marginTop:48}}><a href="/gallery" style={{display:"inline-block",marginBottom:22,padding:"12px 18px",background:"#583a4b",border:"1px solid #87546d",borderRadius:12,textDecoration:"none",color:"#f5c2d5",fontWeight:700}}>🎞 معرض المشروع · الصور والفيديوهات</a>
   <p style={{color:"#d5a66d"}}>{profile.app_role==="supervisor"?"لوحة المشرفة":"لوحة الطالب"}</p>
   <h1>أهلًا، {profile.full_name}</h1><p><a href="/production-hub" style={{display:"inline-block",padding:"13px 18px",background:"#4b3540",border:"1px solid #b48b65",borderRadius:12,color:"#f5d6a7",fontWeight:700,textDecoration:"none"}}>🎬 غرفة عمليات الإنتاج · المحطات والتكليفات</a></p>
   {profile.app_role==="supervisor"?<>
    <p style={{color:"#b7c0ce"}}>راجعي طلبات الانضمام قبل اعتماد الطلاب.</p><p><a href="/director-room" style={{color:"#f5c2d5",fontWeight:700}}>🎬 غرفة المخرجة الخاصة · السيناريو والتقييم</a></p><p><a href="/assignments/new" style={{color:"#d5a66d"}}>+ إنشاء تكليف جديد للفرق</a></p><p><a href="/files" style={{color:"#d5a66d"}}>عرض ملفات فرق العمل</a></p>
    <div style={{display:"grid",gap:14,marginTop:26}}>
     {students.filter(p=>p.approval_status==="pending").map(student=>{
      const own=requests.filter(r=>r.user_id===student.id&&r.status==="pending");
      return <article key={student.id} style={panel}>
       <h2 style={{marginTop:0,fontSize:19}}>{student.full_name}</h2>
       <p style={{color:"#b7c0ce"}}>{own.length?own.map(r=>teamName(r.team_id)).join(" • "):"لم يختَر الفرق بعد"}</p>
       <button style={buttonStyle} disabled={busy||own.length<2||own.length>3} onClick={()=>void approve(student.id)}>الموافقة على الطالب والفرق</button>
      </article>;
     })}
     {!students.some(p=>p.approval_status==="pending")&&<p>مفيش طلبات جديدة حاليًا.</p>}
    </div>
   </>:profile.approval_status!=="approved"?<>
    <p style={{color:"#b7c0ce"}}>حسابك لسه في انتظار موافقة المشرفة. ملفات الفرق مش متاحة قبل الموافقة.</p>
    <section style={panel}><h2>اختيار فرق العمل</h2><p>اختاري فريقين أو ثلاثة فرق.</p>
     {teams.map(t=><label key={t.id} style={{display:"flex",gap:10,padding:"9px 0",alignItems:"center"}}>
      <input type="checkbox" checked={selected.includes(t.id)} onChange={()=>setSelected(old=>old.includes(t.id)?old.filter(id=>id!==t.id):old.length<3?[...old,t.id]:old)}/>{t.name}
     </label>)}
     <button style={buttonStyle} disabled={busy||teams.length===0} onClick={()=>void sendTeams()}>حفظ طلب الفرق ({selected.length})</button>
    </section>
   </>:<>
    <section style={panel}><h2>فرقي</h2>
     {members.length?members.map(m=><p key={m.team_id}>{teamName(m.team_id)} — {m.role==="leader"?"قائد الفريق":"عضو"}</p>):<p>مفيش فرق ظاهرة حاليًا.</p>}
    </section>
    <p><a href="/contributions/new" style={{color:"#d5a66d"}}>+ إضافة مساهمة في تكليفات الفريق</a></p><p><a href="/files" style={{color:"#d5a66d"}}>+ رفع الملفات والصور والفيديوهات للفريق</a></p><section style={panel}><h2>التكليفات</h2>
     {tasks.length?tasks.map(t=><article key={t.id} style={{borderTop:"1px solid #343a49",padding:"12px 0"}}>
      <strong>{t.title}</strong><p style={{whiteSpace:"pre-wrap",color:"#b7c0ce"}}>{t.description}</p>
      {t.due_at&&<small>آخر موعد: {new Date(t.due_at).toLocaleDateString("ar-EG")}</small>}
     </article>):<p>مفيش تكليفات ظاهرة ليكي حاليًا.</p>}
    </section>
   </>}
  </section>}
  {message&&<p role="status" style={{color:"#ffca9f",lineHeight:1.8}}>{message}</p>}
 </main>;
}
const panel={padding:22,background:"#191e2a",border:"1px solid #343a49",borderRadius:16,marginBottom:18};
