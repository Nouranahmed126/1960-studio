"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Team={id:number;name:string};
const descriptions:Record<number,{icon:string;subtitle:string}>={1:{icon:"🎨",subtitle:"الديكور والمراجع البصرية والمؤثرات والتسجيلات الصوتية"},2:{icon:"🎬",subtitle:"جهات الأرشيف والتصاريح والتجهيزات والممثلون"},3:{icon:"🎥",subtitle:"الأرشيف البصري واللقطات والكاميرات والإخراج"},4:{icon:"🎞️",subtitle:"التسجيلات الأرشيفية وتحليل الصوت والصورة والمونتاج"},5:{icon:"✍️",subtitle:"الوقائع التاريخية الموثقة والبحث وبناء الفكرة"}};
export default function Sectors(){
 const [teams,setTeams]=useState<Team[]>([]),[counts,setCounts]=useState<Record<number,{members:number;tasks:number;files:number}>>({}),[message,setMessage]=useState("جارٍ تحميل الفرق...");
 useEffect(()=>{void(async()=>{const db=getSupabase();if(!db){setMessage("تعذر الاتصال بالموقع.");return;}const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}const p=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).single();if(!p.data||(p.data.app_role!=="supervisor"&&p.data.approval_status!=="approved")){setMessage("الفرق متاحة للأعضاء المعتمدين فقط.");return;}
 const [t,m,links,a,files]=await Promise.all([db.from("teams").select("id,name").order("id"),db.from("team_members").select("team_id,user_id"),db.from("assignment_teams").select("team_id,assignment_id"),db.from("assignments").select("id,archived_at"),db.from("attachments").select("id,team_id").limit(1000)]);
 if(t.error||m.error||links.error||a.error){setMessage("تعذر تحميل بيانات الفرق.");return;}
 const allowed=new Set((m.data??[]).filter(x=>x.user_id===user.id).map(x=>x.team_id));const visible=((t.data??[]) as Team[]).filter(x=>p.data?.app_role==="supervisor"||allowed.has(x.id));const activeIds=new Set((a.data??[]).filter(x=>!x.archived_at).map(x=>x.id));
 const next:Record<number,{members:number;tasks:number;files:number}>={};for(const team of visible){next[team.id]={members:new Set((m.data??[]).filter(x=>x.team_id===team.id).map(x=>x.user_id)).size,tasks:new Set((links.data??[]).filter(x=>x.team_id===team.id&&activeIds.has(x.assignment_id)).map(x=>x.assignment_id)).size,files:(files.data??[]).filter(x=>x.team_id===team.id).length};}setTeams(visible);setCounts(next);setMessage("");})();},[]);
 return <main dir="rtl" style={{maxWidth:1180,margin:"auto",padding:"32px 18px 110px",color:"#f7edf0"}}>
 <a href="/dashboard" style={{color:"#e1b78b"}}>← لوحة الحساب</a>
 <header style={{margin:"24px 0 26px",padding:"30px 25px",borderRadius:22,background:"linear-gradient(115deg,#493545,#221d29)",border:"1px solid #82667a"}}>
 <small style={{color:"#e4b786",letterSpacing:2}}>1960 STUDIO · DEPARTMENTS</small><h1 style={{fontSize:"clamp(28px,4vw,43px)",margin:"10px 0"}}>🎬 أقسام إنتاج الفيلم</h1><p style={{maxWidth:690,lineHeight:1.9}}>خمسة أقسام مستقلة، لكل قسم تكليفاته وملفاته ودفتر متابعة خاص بأعضائه. اختاري القسم لفتح مساحة عمله.</p></header>
 {message&&<p role="status">{message}</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,290px),1fr))",gap:16}}>
 {teams.map((team,index)=>{const info=descriptions[team.id]??{icon:"🎬",subtitle:"مساحة عمل الفريق"};const count=counts[team.id]??{members:0,tasks:0,files:0};return <a key={team.id} href={"/teams/"+team.id} style={{display:"flex",flexDirection:"column",gap:15,padding:23,minHeight:250,border:"1px solid #806678",borderRadius:19,background:"linear-gradient(145deg,#352a38,#211d29)",textDecoration:"none",color:"#f8edf0",boxShadow:"0 8px 28px #0002"}}>
 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:35}}>{info.icon}</span><small style={{color:"#d7ad82",letterSpacing:1}}>القسم {String(index+1).padStart(2,"0")}</small></div>
 <div><h2 style={{fontSize:21,margin:"0 0 9px"}}>{team.name}</h2><p style={{fontSize:13,lineHeight:1.8,color:"#d5c4d0",margin:0}}>{info.subtitle}</p></div>
 <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:"auto"}}>{[["👥",count.members,"أعضاء"],["📋",count.tasks,"تكليفات"],["📎",count.files,"ملفات"]].map(([icon,n,label])=><span key={String(label)} style={{padding:"7px 9px",borderRadius:9,background:"#4a394a",fontSize:12}}>{icon} {n} {label}</span>)}</div>
 <span style={{color:"#edc38c",fontWeight:800,fontSize:14}}>فتح مساحة الفريق ←</span>
 </a>})}</div>
 {!message&&teams.length===0&&<p>ليس لديك فريق معتمد حاليًا.</p>}
 </main>;
}