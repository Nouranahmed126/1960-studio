"use client";
import {useEffect,useState} from "react";
import TeamUnseenBadge from "../team-unseen-badge";
import {getAuthUser,getPublicSupabase,getSupabase} from "../../lib/supabase-browser";

type Team={id:number;name:string};
type Counts={members:number;tasks:number;files:number};
type Access="guest"|"pending"|"member";

const descriptions:Record<number,{icon:string;subtitle:string}>={
 1:{icon:"🎨",subtitle:"الديكور والمراجع البصرية والمؤثرات والتسجيلات الصوتية"},
 2:{icon:"🎬",subtitle:"جهات الأرشيف والتصاريح والتجهيزات والممثلون"},
 3:{icon:"🎥",subtitle:"الأرشيف البصري واللقطات والكاميرات والإخراج"},
 4:{icon:"🎞️",subtitle:"التسجيلات الأرشيفية وتحليل الصوت والصورة والمونتاج"},
 5:{icon:"✍️",subtitle:"الوقائع التاريخية الموثقة والبحث وبناء الفكرة"}
};

export default function Sectors(){
 const [teams,setTeams]=useState<Team[]>([]);
 const [counts,setCounts]=useState<Record<number,Counts>>({});
 const [access,setAccess]=useState<Access>("guest");
 const [message,setMessage]=useState("جارٍ تحميل الفرق...");

 useEffect(()=>{
  let active=true;
  void(async()=>{
   const publicDb=getPublicSupabase();
   if(!publicDb){setMessage("تعذر الاتصال بالموقع.");return;}
   const t=await publicDb.from("teams").select("id,name").order("id");
   if(!active)return;
   if(t.error){setMessage("تعذر تحميل أسماء الفرق.");return;}

   const {data:{user}}=await getAuthUser();
   const db=getSupabase();
   if(user&&db){
    const p=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).single();
    if(!active)return;
    const member=!!p.data&&(p.data.app_role==="supervisor"||p.data.approval_status==="approved");
    if(member){
     setAccess("member");
     const [m,links,a,files]=await Promise.all([
      db.from("team_members").select("team_id,user_id"),
      db.from("assignment_teams").select("team_id,assignment_id"),
      db.from("assignments").select("id,archived_at"),
      db.from("attachments").select("id,team_id").limit(1000)
     ]);
     if(!active)return;
     if(m.error||links.error||a.error){setMessage("تعذر تحميل بعض بيانات الفرق.");return;}
     const allowed=new Set((m.data??[]).filter(x=>x.user_id===user.id).map(x=>x.team_id));
     const visible=((t.data??[]) as Team[]).filter(x=>p.data?.app_role==="supervisor"||allowed.has(x.id));
     const activeIds=new Set((a.data??[]).filter(x=>!x.archived_at).map(x=>x.id));
     const next:Record<number,Counts>={};
     for(const team of visible){
      next[team.id]={
       members:new Set((m.data??[]).filter(x=>x.team_id===team.id).map(x=>x.user_id)).size,
       tasks:new Set((links.data??[]).filter(x=>x.team_id===team.id&&activeIds.has(x.assignment_id)).map(x=>x.assignment_id)).size,
       files:(files.data??[]).filter(x=>x.team_id===team.id).length
      };
     }
     setTeams(visible);
     setCounts(next);
     setMessage("");
     return;
    }
    setAccess(p.data?"pending":"guest");
   }else{
    setAccess("guest");
   }

   // Guests and accounts awaiting approval can browse the public department list.
   setTeams((t.data??[]) as Team[]);
   setCounts({});
   setMessage("");
  })();
  return()=>{active=false};
 },[]);

 return <main className="film-departments-page" dir="rtl" style={{maxWidth:1180,margin:"auto",padding:"72px 18px 110px",color:"#f7edf0"}}>
  <a href={access==="member"?"/dashboard":"/"} style={{color:"#e1b78b"}}>{access==="member"?"← لوحة الحساب":"← الرئيسية"}</a>
  <header style={{margin:"12px 0 16px",padding:"18px 20px",borderRadius:22,background:"linear-gradient(115deg,#493545,#221d29)",border:"1px solid #82667a"}}>
   <small style={{color:"#e4b786",letterSpacing:2}}>Plateau Crew Hub · DEPARTMENTS</small>
   <h1 style={{fontSize:"clamp(28px,4vw,43px)",margin:"10px 0"}}>🎬 أقسام إنتاج الفيلم</h1>
   <p style={{maxWidth:690,lineHeight:1.9}}>خمسة أقسام مستقلة، لكل قسم تكليفاته وملفاته ودفتر متابعة خاص بأعضائه. اختاري القسم لفتح مساحة عمله.</p>
  </header>
  {message&&<p role="status">{message}</p>}
  {access!=="member"&&!message&&<p style={{color:"#e4c49b"}}>{access==="pending"?"يمكنك تصفح الأقسام الآن؛ مساحة العمل تُفتح بعد اعتماد الحساب.":"يمكنك تصفح الأقسام بحرية. تسجيل الدخول مطلوب فقط لفتح مساحة العمل الخاصة بالفريق."}</p>}
  <div className="film-departments-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:16}}>
   {teams.map((team,index)=>{
    const info=descriptions[team.id]??{icon:"🎬",subtitle:"مساحة عمل الفريق"};
    const count=counts[team.id]??{members:0,tasks:0,files:0};
    const href="/teams/"+team.id;
    return <article className="film-department-card" key={team.id} style={{position:"relative",display:"flex",flexDirection:"column",gap:9,padding:14,minHeight:178,border:"1px solid #806678",borderRadius:19,background:"linear-gradient(145deg,#352a38,#211d29)",color:"#f8edf0",boxShadow:"0 8px 28px #0002"}}>
     {access==="member"&&<TeamUnseenBadge teamId={team.id}/>}
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span className="film-department-icon" aria-hidden="true">{info.icon}</span><small style={{color:"#d7ad82",letterSpacing:1}}>القسم {String(index+1).padStart(2,"0")}</small></div>
     <div><h2 style={{fontSize:17,margin:"0 0 6px"}}>{team.name}</h2><p style={{fontSize:11,lineHeight:1.5,color:"#d5c4d0",margin:0}}>{info.subtitle}</p></div>
     {access==="member"
      ?<div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:"auto"}}>{[["👥",count.members,"أعضاء"],["📋",count.tasks,"تكليفات"],["📎",count.files,"ملفات"]].map(([icon,n,label])=><span key={String(label)} style={{padding:"7px 9px",borderRadius:9,background:"#4a394a",fontSize:12}}>{icon} {n} {label}</span>)}</div>
      :<small style={{marginTop:"auto",color:"#d7ad82"}}>{access==="pending"?"بانتظار اعتماد الحساب":"مساحة الأعضاء المعتمدين"}</small>}
     <a href={access==="member"?href:access==="guest"?"/login?next="+encodeURIComponent(href):"/dashboard"} style={{color:"#edc38c",fontWeight:800,fontSize:14,textDecoration:"none"}}>{access==="member"?"فتح مساحة الفريق ←":access==="guest"?"تسجيل الدخول لفتح المساحة ←":"متابعة حالة الحساب ←"}</a>
    </article>;
   })}
  </div>
  {!message&&teams.length===0&&<p>لا توجد أقسام متاحة حاليًا.</p>}
 </main>;
}
