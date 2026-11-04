"use client";
import {useEffect,useState,type FormEvent} from "react";
import {getSupabase} from "../../../lib/supabase-browser";
type Team={id:number;name:string};
type Assignment={id:number;title:string};
type Pair={assignment_id:number;team_id:number};
type Contribution={id:number;assignment_id:number;team_id:number;title:string;content:string|null;created_at:string};
export default function Contributions(){
 const [teams,setTeams]=useState<Team[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [pairs,setPairs]=useState<Pair[]>([]);
 const [entries,setEntries]=useState<Contribution[]>([]);
 const [team,setTeam]=useState("");
 const [assignment,setAssignment]=useState("");
 const [title,setTitle]=useState("");
 const [content,setContent]=useState("");
 const [message,setMessage]=useState("جارٍ تحميل البيانات...");
 const [busy,setBusy]=useState(false);
 async function load(){
  const db=getSupabase();if(!db){setMessage("إعدادات Supabase غير مكتملة.");return;}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  const p=await db.from("profiles").select("approval_status,app_role").eq("id",user.id).single();
  if(p.error||p.data?.approval_status!=="approved"||p.data?.app_role!=="student"){setMessage("الصفحة متاحة للطلاب المعتمدين فقط.");return;}
  const [members,allTeams,links,allAssignments,contributions]=await Promise.all([
   db.from("team_members").select("team_id").eq("user_id",user.id),
   db.from("teams").select("id,name"),
   db.from("assignment_teams").select("assignment_id,team_id"),
   db.from("assignments").select("id,title"),
   db.from("contributions").select("id,assignment_id,team_id,title,content,created_at").order("created_at",{ascending:false}).limit(50)
  ]);
  if(members.error||allTeams.error||links.error||allAssignments.error||contributions.error){setMessage("تعذر تحميل المساهمات. راجعي سياسات RLS في Supabase.");return;}
  const myIds=new Set((members.data??[]).map(m=>m.team_id));
  setTeams(((allTeams.data??[]) as Team[]).filter(t=>myIds.has(t.id)));
  setPairs(((links.data??[]) as Pair[]).filter(x=>myIds.has(x.team_id)));
  setAssignments((allAssignments.data??[]) as Assignment[]);
  setEntries((contributions.data??[]) as Contribution[]);
  setMessage("");
 }
 useEffect(()=>{void load()},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const teamId=Number(team),assignmentId=Number(assignment);
  if(!pairs.some(p=>p.team_id===teamId&&p.assignment_id===assignmentId)){setMessage("اختاري تكليف تابع لفريقك.");return;}
  const db=getSupabase();if(!db)return;
  setBusy(true);setMessage("");
  const {data:{user}}=await db.auth.getUser();
  if(!user){setBusy(false);window.location.replace("/login");return;}
  const result=await db.from("contributions").insert({team_id:teamId,assignment_id:assignmentId,user_id:user.id,title:title.trim(),content:content.trim()});
  setBusy(false);
  if(result.error){setMessage("تعذر حفظ المساهمة. تأكدي إن صلاحية إضافة المساهمات مفعلة.");return;}
  setTitle("");setContent("");setMessage("اتحفظت مساهمتك داخل فريقك.");await load();
 }
 const options=pairs.filter(p=>String(p.team_id)===team).map(p=>assignments.find(a=>a.id===p.assignment_id)).filter((a):a is Assignment=>Boolean(a));
 const field={width:"100%",boxSizing:"border-box" as const,background:"#10131c",color:"#fff",border:"1px solid #596174",borderRadius:9,padding:12,marginTop:8,fontSize:16};
 return <main style={{maxWidth:720,margin:"25px auto",padding:20}}>
  <a href="/dashboard" style={{color:"#d5a66d"}}>العودة للوحة الطالب</a>
  <h1>مساهمات الفريق</h1><p>اكتبي مساهمتك في التكليف الخاص بفريقك، وهتظهر لأعضاء الفريق المعتمدين والمشرفة.</p>
  <form onSubmit={submit} style={{display:"grid",gap:16,padding:20,border:"1px solid #343a49",borderRadius:14}}>
   <label>الفريق<select required value={team} onChange={e=>{setTeam(e.target.value);setAssignment("");}} style={field}>
    <option value="">اختاري الفريق</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
   </select></label>
   <label>التكليف<select required value={assignment} onChange={e=>setAssignment(e.target.value)} style={field}>
    <option value="">اختاري التكليف</option>{options.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
   </select></label>
   <label>عنوان المساهمة<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} style={field}/></label>
   <label>تفاصيل المساهمة<textarea required rows={6} value={content} onChange={e=>setContent(e.target.value)} style={field}/></label>
   <button disabled={busy||!team||!assignment||!title.trim()||!content.trim()} style={{background:"#d5a66d",border:0,borderRadius:9,padding:14,fontWeight:700}}>{busy?"جارٍ الحفظ...":"حفظ المساهمة"}</button>
  </form>
  {message&&<p role="status" style={{color:"#ffca9f"}}>{message}</p>}
  <h2 style={{marginTop:35}}>آخر مساهمات فرقك</h2>
  {entries.length===0&&<p>مفيش مساهمات محفوظة لحد دلوقتي.</p>}
  {entries.map(c=><article key={c.id} style={{padding:18,border:"1px solid #343a49",borderRadius:12,marginBottom:12}}>
   <strong>{c.title}</strong><p style={{color:"#aeb8ca"}}>{teams.find(t=>t.id===c.team_id)?.name} • {assignments.find(a=>a.id===c.assignment_id)?.title}</p>
   <p style={{whiteSpace:"pre-wrap"}}>{c.content}</p><small>{new Date(c.created_at).toLocaleDateString("ar-EG")}</small>
  </article>)}
 </main>;
}
