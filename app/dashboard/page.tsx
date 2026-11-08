"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase-browser";
type Profile={id:string;full_name:string;approval_status:string;app_role:string};
type Team={id:number;name:string};
type Star={id:string;full_name:string};
type StarDetail={user_id:string;film_role:string;photo_path:string|null};
type Request={user_id:string;team_id:number;status:string};
type Membership={team_id:number;role:string};
type Task={id:number;title:string;description:string|null;due_at:string|null};
export default function Dashboard(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const [teams,setTeams]=useState<Team[]>([]);
 const [stars,setStars]=useState<Star[]>([]);
 const [starDetails,setStarDetails]=useState<StarDetail[]>([]);
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
   const [crew,crewInfo]=await Promise.all([db.rpc("list_approved_crew"),db.from("crew_profiles").select("user_id,film_role,photo_path")]);
   if(!crew.error)setStars((crew.data??[]) as Star[]);
   if(!crewInfo.error)setStarDetails((crewInfo.data??[]) as StarDetail[]);
   const [people,joins]=await Promise.all([
    db.from("profiles").select("id,full_name,approval_status,app_role").eq("app_role","student").order("created_at",{ascending:false}),
    db.from("team_join_requests").select("user_id,team_id,status")
   ]);
   if(people.error||joins.error)setMessage("تعذر تحميل طلبات الطلاب: "+(people.error?.message||joins.error?.message));
   else{setStudents((people.data??[]) as Profile[]);setRequests((joins.data??[]) as Request[]);setMessage("");}
  }else{
   const [joins,membersResult,taskResult]=await Promise.all([
    db.from("team_join_requests").select("user_id,team_id,status").eq("user_id",user.id),
    db.from("team_members").select("team_id,role").eq("user_id",user.id),
    db.from("assignments").select("id,title,description,due_at").order("created_at",{ascending:false}).limit(30)
   ]);
   if(!joins.error){const existing=(joins.data??[]) as Request[];setRequests(existing);setSelected(existing.map(x=>x.team_id));if(current.approval_status==="pending"&&existing.length===0){const stored=user.user_metadata?.requested_team_ids; if(Array.isArray(stored)&&stored.length>=2&&stored.length<=3&&stored.every((x:unknown)=>typeof x==="number"&&Number.isInteger(x))){const saved=await db.rpc("request_my_teams",{p_team_ids:stored});if(!saved.error){setSelected(stored);setRequests(stored.map((team_id:number)=>({user_id:user.id,team_id,status:"pending"})));}else setMessage("تعذر حفظ الفرق المختارة أثناء التسجيل: "+saved.error.message);}}}
   if(!membersResult.error)setMembers((membersResult.data??[]) as Membership[]);
   if(!taskResult.error)setTasks((taskResult.data??[]) as Task[]);
   if(joins.error)setMessage("تعذر تحميل اختيارات الفرق: "+joins.error.message);
  }
 },[]);
 useEffect(()=>{void load()},[load]);
 async function sendTeams(){
  if(selected.length<2||selected.length>3){setMessage("اختاري فريقين أو ثلاثة.");return;}
  const db=getSupabase();if(!db)return;
  setBusy(true);setMessage("");
  const {error}=await db.rpc("request_my_teams",{p_team_ids:selected});
  setBusy(false);
  if(error)setMessage("لم يتم حفظ اختيار الفرق: "+error.message);
  else{await load();setMessage("تم حفظ اختيار الفرق بنجاح، وفي انتظار موافقة المشرفة.");}
 }
 async function approve(id:string){
  const db=getSupabase();if(!db)return;
  setBusy(true);setMessage("");
  const {error}=await db.rpc("approve_student",{p_user_id:id});
  setBusy(false);
  if(error)setMessage("الموافقة لم تتم: "+error.message);
  else{await load();setMessage("تمت الموافقة على الطالب وفرق العمل.");}
 }
 async function logout(){await getSupabase()?.auth.signOut();window.location.replace("/login");}
 const visiblePending=students.filter(s=>s.approval_status==="pending"&&requests.some(r=>r.user_id===s.id&&r.status==="pending"));
 const teamName=(id:number)=>teams.find(t=>t.id===id)?.name??"فريق غير معروف";
 const buttonStyle={border:0,borderRadius:9,padding:"12px 18px",background:"#d5a66d",color:"#16171d",fontWeight:700 as const,cursor:"pointer"};
 return <main className="dashboard-shell">
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
   <a href="/" style={{color:"#d5a66d",fontWeight:700}}>1960 STUDIO</a>
   <button onClick={logout} style={buttonStyle}>تسجيل خروج</button>
  </header>
  {profile&&<section style={{marginTop:48}}><a href="/gallery" style={{display:"inline-block",marginBottom:22,padding:"12px 18px",background:"#583a4b",border:"1px solid #87546d",borderRadius:12,textDecoration:"none",color:"#f5c2d5",fontWeight:700}}>🎞 معرض المشروع · الصور والفيديوهات</a>
   {profile.app_role==="supervisor"&&<section className="executive-office" aria-label="مكتب قيادة استوديو 1960">
    <div className="executive-office-art"><div className="executive-office-light"/><div className="executive-office-window"><span>1960</span></div><div className="executive-office-desk"><div className="executive-office-reel">◉</div><div className="executive-office-plaque">1960 STUDIO<br/>EXECUTIVE OFFICE</div><div className="executive-office-script">FILM<br/>1960</div></div></div>
    <div className="executive-office-content"><p className="executive-eyebrow">1960 STUDIO · EXECUTIVE OFFICE</p><h2>أهلًا بحضرتك، {profile.full_name.includes("أحمد عبد المنعم")?"يا دكتور أحمد":profile.full_name}</h2><p>مكتب قيادة الاستوديو — كل مراحل صناعة الفيلم، وكل إبداعات الفريق، في مكان واحد.</p><div className="executive-office-links">
    {([{href:"/production-hub",icon:"🎬",name:"غرفة عمليات الإنتاج",sub:"المحطات والتكليفات"},{href:"/director-room",icon:"🎞️",name:"غرفة العرض والإخراج",sub:"السيناريو والتقييم"},{href:"/gallery",icon:"📽️",name:"سينما الكواليس",sub:"الصور والفيديوهات"},{href:"/crew",icon:"🎭",name:"طاقم الفيلم",sub:"أعضاء الفريق وأدوارهم"},{href:"/sectors",icon:"🗂️",name:"قطاعات العمل",sub:"الفرق والمهام والمحادثات"},{href:"/files",icon:"📁",name:"أرشيف الاستوديو",sub:"ملفات المشروع"},{href:"/requests",icon:"✉️",name:"رسائل الفريق",sub:"الطلبات والمراسلات"},{href:"/chat",icon:"💬",name:"غرفة التواصل",sub:"شات فريق الفيلم"},{href:"/assignments/new",icon:"✍️",name:"التكليفات الجديدة",sub:"إدارة أعمال الفرق"}] as const).map(link=><a className="executive-office-link" key={link.href} href={link.href}><span className="executive-office-icon">{link.icon}</span><strong>{link.name}</strong><small>{link.sub}</small></a>)}
    </div><div className="executive-special"><h3>✦ المساحات الحصرية لمكتب القيادة</h3><div className="executive-special-grid"><article><span>01 · PRIVATE SCREENING</span><h4>غرفة العرض الخاصة</h4><p>مدخل مباشر لمشاهدة الفيديوهات والكواليس المنشورة، ومراجعة مواد الفيلم بصريًا.</p><a href="/gallery">دخول غرفة العرض ←</a></article><article><span>02 · MAKING OF 1960</span><h4>رحلة صناعة الفيلم</h4><p>متابعة مراحل العمل والتكليفات والتقدم من غرفة عمليات الإنتاج.</p><a href="/production-hub">استعراض الرحلة ←</a></article><article><span>03 · CREATIVE ARCHIVE</span><h4>أرشيف الإبداع</h4><p>العودة إلى ملفات الفرق وأعمالهم والتصورات التي طُورت خلال المشروع.</p><a href="/files">فتح الأرشيف ←</a></article></div><div className="executive-mentor"><span>THE MENTOR'S LEGACY · بصمة المشرف</span><p>مساحة تقدير لرحلة التعلم والإبداع التي تجمع فريق 1960 بمشرفيه. محتوى الإهداء سيُضاف عند اعتماده، دون عرض رسائل منسوبة للفريق قبل كتابتها.</p></div></div><section className="executive-stars" aria-label="نجوم فيلم 1960"><div className="executive-stars-heading"><div><span>1960 · CAST & CREW</span><h3>✦ نجوم فيلم 1960</h3><p>الناس اللي ورا كل لقطة وكل فكرة — بطاقاتهم الحقيقية بتتحدث من الاستوديو تلقائيًا.</p></div><a href="/crew">كل نجوم الفيلم ←</a></div>{stars.length>0?<div className="executive-stars-viewport" dir="ltr" tabIndex={0} aria-label="شريط متحرك لنجوم الفيلم، يتوقف عند التفاعل معه"><div className="executive-stars-track">{[0,1].map(copy=><div className="executive-stars-set" key={copy} aria-hidden={copy===1}>{stars.map((star,i)=>{const info=starDetails.find(d=>d.user_id===star.id);const photo=info?.photo_path?getSupabase()?.storage.from("crew-photos").getPublicUrl(info.photo_path).data.publicUrl:null;return <a href="/crew" className="executive-star-card" key={star.id} dir="rtl" tabIndex={copy===1?-1:0}><div className="executive-star-portrait">{photo?<img src={photo} alt="" loading="lazy"/>:<span>✦</span>}</div><small>1960 · STAR {String(i+1).padStart(2,"0")}</small><strong>{star.full_name}</strong><span>{info?.film_role||"عضو طاقم الفيلم"}</span></a>})}</div></div></div></div>:<p className="executive-stars-empty">بطاقات النجوم هتظهر هنا تلقائيًا بمجرد تحميل بيانات الطاقم المعتمد.</p>}</section><p className="executive-office-footer">مساحة مشتركة لإدارة 1960 — نفس الواجهة ونفس الأدوات لكل حساب مشرف معتمد.</p></div>
   </section>}
   <p style={{color:"#d5a66d"}}>{profile.app_role==="supervisor"?"لوحة المشرفة":"لوحة الطالب"}</p>
   <h1>أهلًا، {profile.full_name}</h1><nav style={{display:"flex",gap:12,flexWrap:"wrap",margin:"18px 0"}}><a href="/sectors" style={{color:"#f5d6a7",padding:12,border:"1px solid #795a70",borderRadius:10}}>🎬 قطاعات فرق العمل · الشات والمهام والملفات</a><a href="/chat" style={{color:"#f5c2d5",padding:12,border:"1px solid #795a70",borderRadius:10}}>💬 شات فريق الفيلم</a><a href="/requests" style={{color:"#f5d6a7",padding:12,border:"1px solid #795a70",borderRadius:10}}>✉️ {profile.app_role==="supervisor"?"طلبات ورسائل الطلاب":"رسالة إلى نوران · طلب محاضرة"}</a></nav><p><a href="/crew" style={{color:"#f5c2d5",fontWeight:700}}>🎞 طاقم الفيلم · بطاقات الأعضاء المعتمدين</a></p><p><a href="/production-hub" style={{display:"inline-block",padding:"13px 18px",background:"#4b3540",border:"1px solid #b48b65",borderRadius:12,color:"#f5d6a7",fontWeight:700,textDecoration:"none"}}>🎬 غرفة عمليات الإنتاج · المحطات والتكليفات</a></p>
   {profile.app_role==="supervisor"?<>
    <p style={{color:"#b7c0ce"}}>راجعي طلبات الانضمام قبل اعتماد الطلاب.</p><section style={{...panel,borderColor:"#886277"}}><h2>🎞 متابعة طاقم الفيلم</h2><p>الأعضاء المعتمدون: <strong>{students.filter(s=>s.approval_status==="approved").length}</strong> من العدد المستهدف 18</p><p>طلبات بانتظار الاعتماد: <strong>{visiblePending.length}</strong></p>{students.filter(s=>s.approval_status==="approved").length>=18&&<p>تنبيه: العدد المستهدف اكتمل أو تم تجاوزه؛ راجعي الأسماء قبل الموافقة على حسابات إضافية.</p>}<a href="/crew">عرض بطاقات الطاقم والأدوار</a></section><p><a href="/director-room" style={{color:"#f5c2d5",fontWeight:700}}>🎬 غرفة المخرجة الخاصة · السيناريو والتقييم</a></p><p><a href="/assignments/new" style={{color:"#d5a66d"}}>+ إنشاء تكليف جديد للفرق</a></p><p><a href="/files" style={{color:"#d5a66d"}}>عرض ملفات فرق العمل</a></p>
    <div style={{display:"grid",gap:14,marginTop:26}}>
     {visiblePending.map(student=>{
      const own=requests.filter(r=>r.user_id===student.id&&r.status==="pending");
      return <article key={student.id} style={panel}>
       <h2 style={{marginTop:0,fontSize:19}}>{student.full_name}</h2>
       <p style={{color:"#b7c0ce"}}>{own.length?own.map(r=>teamName(r.team_id)).join(" • "):"لم يختَر الفرق بعد"}</p>
       <button style={buttonStyle} disabled={busy||own.length<2||own.length>3} onClick={()=>void approve(student.id)}>الموافقة على الطالب والفرق</button>
      </article>;
     })}
     {visiblePending.length===0&&<p>مفيش طلبات جديدة حاليًا.</p>}
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
     </article>):<p>لا توجد تكليفات متاحة لك حاليًا.</p>}
    </section>
   </>}
  </section>}
  {message&&<p role="status" style={{color:"#ffca9f",lineHeight:1.8}}>{message}</p>}
 </main>;
}
const panel={padding:22,background:"#191e2a",border:"1px solid #343a49",borderRadius:16,marginBottom:18};
