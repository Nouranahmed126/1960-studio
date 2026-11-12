"use client";
import { assignmentLabel } from "../../../lib/assignment-label";
import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import {getSupabase} from "../../../lib/supabase-browser";

type Team={id:number;name:string};
type Assignment={id:number;title:string;description:string|null;due_at:string|null};
type Member={user_id:string};
type Receipt={assignment_id:number;student_id:string;received:boolean;delivery_status:string|null};
type Upload={id:number;uploaded_by:string;file_name:string;storage_path:string|null;file_type?:string|null;created_at:string};
type Written={id:number;student_id:string;title:string;body:string;category:string;created_at:string};
type ReviewItem={kind:"work"|"file";id:number;studentId:string;title:string;body?:string;path?:string|null;fileType?:string|null;createdAt:string;assignmentId?:number};
type ReviewNote={source_type:string;source_id:number;note:string};
type GoldenStamp={stamp_status:string|null;stamp_at:string|null;stamp_by:string|null};
type StarReview={source_type?:string;source_id?:number;attachment_id?:number;assignment_id?:number;student_id?:string;stars:number;received?:boolean};

const identity:Record<number,{icon:string;english:string;description:string;vibe:string}>={
1:{icon:"🎨",english:"ART DIRECTION & SOUND",description:"الديكور · المراجع البصرية · المؤثرات · التسجيلات الصوتية",vibe:"sound"},
2:{icon:"🎬",english:"PRODUCTION & CASTING",description:"الإنتاج · الأرشيف · التصاريح · تجهيز الممثلين",vibe:"production"},
3:{icon:"🎥",english:"CINEMATOGRAPHY & DIRECTING",description:"اللغة البصرية · الأرشيف المصور · تخطيط المشاهد",vibe:"camera"},
4:{icon:"🎞️",english:"EDITING & POST-PRODUCTION",description:"المونتاج · بناء المشاهد · الإيقاع · الصوت والصورة",vibe:"editing"},
5:{icon:"✍️",english:"STORY & SCREENPLAY",description:"البحث التاريخي · تطوير الفكرة · البناء الدرامي",vibe:"writing"}
};
const teamLinks=[{id:5,label:"الكتابة والسيناريو",icon:"✍️"},{id:3,label:"التصوير والإخراج",icon:"🎥"},{id:4,label:"المونتاج",icon:"🎞️"},{id:1,label:"التصميم والصوت",icon:"🎨"},{id:2,label:"الإنتاج والممثلين",icon:"🎬"}];

export default function TeamRoom(){
 const params=useParams();const id=Number(params.id);
 const [team,setTeam]=useState<Team|null>(null),[allTeams,setAllTeams]=useState<Team[]>([]),[teamCounts,setTeamCounts]=useState<Record<number,number>>({}),[members,setMembers]=useState<Member[]>([]),[names,setNames]=useState<Record<string,string>>({});
 const [assignments,setAssignments]=useState<Assignment[]>([]),[receipts,setReceipts]=useState<Receipt[]>([]),[uploads,setUploads]=useState<Upload[]>([]),[written,setWritten]=useState<Written[]>([]);
 const [stamps,setStamps]=useState<Record<string,GoldenStamp>>({}),[stampChoice,setStampChoice]=useState<"approved"|"revise"|"reviewing"|"weak">("reviewing");
 const [notes,setNotes]=useState<Record<string,string>>({}),[stars,setStars]=useState<Record<string,number>>({}),[received,setReceived]=useState<Record<string,boolean>>({});
 const [currentUserId,setCurrentUserId]=useState<string|null>(null);
 const [supervisor,setSupervisor]=useState(false),[error,setError]=useState("جارٍ تحميل غرفة الفريق..."),[liveAt,setLiveAt]=useState<Date|null>(null);
 const [active,setActive]=useState<"overview"|"tasks"|"members">("overview"),[selected,setSelected]=useState<ReviewItem|null>(null),[reviewNote,setReviewNote]=useState(""),[reviewStars,setReviewStars]=useState(0),[reviewBusy,setReviewBusy]=useState(false),[previewUrl,setPreviewUrl]=useState("");
 const [deliveryFilter,setDeliveryFilter]=useState("all"),[deliveryStudent,setDeliveryStudent]=useState("all"),[openedBundle,setOpenedBundle]=useState<ReviewItem[]|null>(null),[openedStudent,setOpenedStudent]=useState<string|null>(null);
 const [quickText,setQuickText]=useState(""),[quickBusy,setQuickBusy]=useState(false),[quickNotice,setQuickNotice]=useState("");
 const look=identity[id]??{icon:"🎬",english:"1960 STUDIO",description:"مساحة عمل الفريق",vibe:"default"};
 const keyFor=(kind:string,itemId:number)=>kind+":"+itemId;

 async function load(){
  const db=getSupabase();if(!db){setError("الاتصال غير متاح.");return;}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  const [profile,membership,teams,allMemberships]=await Promise.all([db.from("profiles").select("app_role,approval_status").eq("id",user.id).single(),db.from("team_members").select("team_id").eq("user_id",user.id).eq("team_id",id),db.from("teams").select("id,name").order("id"),db.from("team_members").select("team_id,user_id")]);
  setCurrentUserId(user.id);
  const isSupervisor=profile.data?.app_role==="supervisor";
  if(!isSupervisor&&(profile.data?.approval_status!=="approved"||!membership.data?.length)){setError("هذه المساحة مخصصة لأعضاء الفريق والمشرفة فقط.");return;}
  const [t,m,a,p,r,u,w,ar,wr,fb]=await Promise.all([
   db.from("teams").select("id,name").eq("id",id).single(),
   db.from("team_members").select("user_id").eq("team_id",id),
   db.from("assignments").select("id,title,description,due_at,assignment_teams!inner(team_id)").eq("assignment_teams.team_id",id).is("archived_at",null).order("created_at",{ascending:false}),
   db.from("profiles").select("id,full_name,approval_status,app_role").eq("approval_status","approved").eq("app_role","student"),
   db.from("assignment_receipts").select("assignment_id,student_id,received,delivery_status"),
   db.from("attachments").select("id,uploaded_by,file_name,storage_path,file_type,created_at").eq("team_id",id).order("created_at",{ascending:false}).limit(1000),
   db.from("work_submissions").select("id,student_id,title,body,category,created_at").eq("team_id",id).order("created_at",{ascending:false}).limit(1000),
   db.from("attachment_reviews").select("attachment_id,stars,received,stamp_status,stamp_at,stamp_by"),
   db.from("written_submission_reviews").select("source_type,source_id,stars,received,stamp_status,stamp_at,stamp_by"),
   db.from("submission_feedback_notes").select("source_type,source_id,note")
  ]);
  if(t.error||m.error||a.error){setError("تعذر تحميل مساحة الفريق. تحققي من الصلاحيات.");return;}
  const approved=new Set((p.data??[]).map((x:any)=>x.id));
  const roster=(m.data??[]).filter((x:Member)=>approved.has(x.user_id));
  const assignmentIds=new Set((a.data??[]).map((x:any)=>x.id));
  setTeam(t.data);setAllTeams((teams.data??[]) as Team[]);setTeamCounts(Object.fromEntries((teams.data??[]).map((x:any)=>[x.id,new Set((allMemberships.data??[]).filter((m:any)=>m.team_id===x.id&&approved.has(m.user_id)).map((m:any)=>m.user_id)).size])));setMembers(roster);setNames(Object.fromEntries((p.data??[]).map((x:any)=>[x.id,x.full_name])));
  setAssignments((a.data??[]) as Assignment[]);setReceipts(((r.data??[]) as Receipt[]).filter(x=>assignmentIds.has(x.assignment_id)&&approved.has(x.student_id)));
  setUploads((u.data??[]) as Upload[]);setWritten((w.data??[]) as Written[]);setSupervisor(isSupervisor);
  {
   const nextStars:Record<string,number>={},nextReceived:Record<string,boolean>={},nextNotes:Record<string,string>={},nextStamps:Record<string,GoldenStamp>={};
   for(const x of ar.data??[]){nextStars["file:"+x.attachment_id]=x.stars??0;nextReceived["file:"+x.attachment_id]=!!x.received;nextStamps["file:"+x.attachment_id]={stamp_status:x.stamp_status,stamp_at:x.stamp_at,stamp_by:x.stamp_by};}
   for(const x of wr.data??[]){nextStars[x.source_type+":"+x.source_id]=x.stars??0;nextReceived[x.source_type+":"+x.source_id]=!!x.received;nextStamps[x.source_type+":"+x.source_id]={stamp_status:x.stamp_status,stamp_at:x.stamp_at,stamp_by:x.stamp_by};}
   for(const x of fb.data??[])nextNotes[x.source_type+":"+x.source_id]=x.note??"";
   setStars(nextStars);setReceived(nextReceived);setNotes(nextNotes);setStamps(nextStamps);
  }
  setError("");
 }
 useEffect(()=>{if(!Number.isInteger(id)||id<1||id>5){setError("الفريق غير موجود.");return;}let alive=true;const db=getSupabase();if(!db){setError("الاتصال غير متاح.");return;}
  void load();
  const channel=db.channel("team-room-live-"+id)
   .on("postgres_changes",{event:"*",schema:"public",table:"assignments"},()=>{if(alive)void load();})
   .on("postgres_changes",{event:"*",schema:"public",table:"team_members",filter:"team_id=eq."+id},()=>{if(alive)void load();})
   .on("postgres_changes",{event:"*",schema:"public",table:"assignment_receipts"},()=>{if(alive)void load();})
   .on("postgres_changes",{event:"*",schema:"public",table:"attachments",filter:"team_id=eq."+id},()=>{if(alive)void load();})
   .on("postgres_changes",{event:"*",schema:"public",table:"work_submissions",filter:"team_id=eq."+id},()=>{if(alive)void load();})
   .subscribe(status=>{if(status==="SUBSCRIBED")setLiveAt(new Date());});
  return()=>{alive=false;void db.removeChannel(channel)};
 },[id]);

 const reviewItems=useMemo<ReviewItem[]>(()=>[
  ...written.map(x=>({kind:"work" as const,id:x.id,studentId:x.student_id,title:x.title,body:x.body,createdAt:x.created_at})),
  ...uploads.map(x=>({kind:"file" as const,id:x.id,studentId:x.uploaded_by,title:x.file_name,path:x.storage_path,fileType:x.file_type,createdAt:x.created_at}))
 ].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()),[written,uploads]);
 const myItems=supervisor?reviewItems:reviewItems.filter(x=>x.studentId===currentUserId);

 const bundles=useMemo(()=>{const groups=new Map<string,{label:string;studentId:string;items:ReviewItem[];createdAt:string}>();for(const item of myItems){const label=assignmentLabel(item);const key=item.studentId+"|"+label.toLocaleLowerCase("ar");const group=groups.get(key);if(group)group.items.push(item);else groups.set(key,{label,studentId:item.studentId,items:[item],createdAt:item.createdAt});}return [...groups.values()];},[myItems]);
 const filteredBundles=bundles.filter(b=>(deliveryStudent==="all"||b.studentId===deliveryStudent)&&(deliveryFilter==="all"||b.label.includes("التكليف "+deliveryFilter)));
 const completed=members.filter(m=>reviewItems.some(x=>x.studentId===m.user_id)).length;
 const pending=members.length-completed;

 async function archiveAssignment(item:Assignment){
  if(!supervisor)return;
  if(!window.confirm("هل تريدين إخفاء التكليف «"+item.title+"» من التكليفات النشطة؟ لن يتم حذف تسليمات الطلاب أو تقييماتهم، ويمكن استرجاع التكليف من قاعدة البيانات."))return;
  const db=getSupabase();if(!db)return;
  const result=await db.from("assignments").update({archived_at:new Date().toISOString()}).eq("id",item.id).is("archived_at",null).select("id");
  if(result.error){setError("تعذر أرشفة التكليف: "+result.error.message);return;}
  if(!result.data?.length){setError("لم يتم تعديل التكليف. تحققي من الصلاحيات.");return;}
  setAssignments(prev=>prev.filter(x=>x.id!==item.id));setError("تمت أرشفة التكليف دون حذف تسليمات الطلاب ✓");
 }
 async function openReview(item:ReviewItem){
  if(supervisor){const db=getSupabase();if(db){const {data:{user}}=await db.auth.getUser();if(user){const r=await db.from("supervisor_submission_views").upsert({source_type:item.kind,source_id:item.id,supervisor_id:user.id},{onConflict:"source_type,source_id,supervisor_id",ignoreDuplicates:true});if(r.error)setError("تعذر حفظ حالة المشاهدة: "+r.error.message);}}}
  setStampChoice((stamps[keyFor(item.kind,item.id)]?.stamp_status as "approved"|"revise"|"reviewing"|"weak")||"reviewing");setSelected(item);setReviewNote(notes[keyFor(item.kind,item.id)]??"");setReviewStars(stars[keyFor(item.kind,item.id)]??0);setPreviewUrl("");
  if(item.kind==="file"&&item.path){const db=getSupabase();if(db){const signed=await db.storage.from("studio-files").createSignedUrl(item.path,60);if(signed.data?.signedUrl)setPreviewUrl(signed.data.signedUrl);}}
 }
 async function saveReview(){
  if(!selected||!supervisor)return;const db=getSupabase();if(!db)return;setReviewBusy(true);
  const sourceType=selected.kind==="file"?"file":"work";const k=keyFor(sourceType,selected.id);
  const reviewer=(await db.auth.getUser()).data.user?.id??null;const stampFields={stamp_status:stampChoice,stamp_at:new Date().toISOString(),stamp_by:reviewer};
  const noteResult=await db.from("submission_feedback_notes").upsert({source_type:sourceType,source_id:selected.id,note:reviewNote.trim(),updated_by:(await db.auth.getUser()).data.user?.id??null},{onConflict:"source_type,source_id"});
  let ratingError:any=null;
  if(selected.kind==="file"){
   const r=await db.from("attachment_reviews").upsert({attachment_id:selected.id,stars:reviewStars,received:true,reviewed_by:reviewer,...stampFields},{onConflict:"attachment_id"});ratingError=r.error;
  }else{
   const r=await db.from("written_submission_reviews").upsert({source_type:"work",source_id:selected.id,stars:reviewStars,received:true,reviewed_by:reviewer,...stampFields},{onConflict:"source_type,source_id"});ratingError=r.error;
  }
  setReviewBusy(false);
  if(noteResult.error||ratingError){setError("تعذر حفظ المراجعة: "+(noteResult.error?.message??ratingError?.message));return;}
  setNotes(v=>({...v,[k]:reviewNote.trim()}));setStars(v=>({...v,[k]:reviewStars}));setReceived(v=>({...v,[k]:true}));setStamps(v=>({...v,[k]:stampFields}));setSelected(null);setError("تم حفظ ختم د/ نوران أحمد والتقييم بنجاح ✓");
 }
 async function openFile(path:string){const db=getSupabase();if(!db)return;const r=await db.storage.from("studio-files").createSignedUrl(path,60);if(r.data?.signedUrl)window.open(r.data.signedUrl,"_blank","noopener,noreferrer");else setError("تعذر فتح الملف.");}
 async function sendQuickText(){
  const db=getSupabase();if(!db||quickText.trim().length<20)return;const {data:{user}}=await db.auth.getUser();if(!user)return;
  setQuickBusy(true);const r=await db.from("work_submissions").insert({student_id:user.id,team_id:id,title:look.english+" — تسليم سريع",category:"أخرى",body:quickText.trim()});
  setQuickBusy(false);if(r.error){setError("تعذر إرسال النص: "+r.error.message);return;}setQuickText("");setQuickNotice("وصل التسليم النصي للمشرفة ✓");await load();
 }
 const teamName=team?.name??"الفريق";
 return <main className={"cinema-team-room mini-studio-room vibe-"+look.vibe} dir="rtl">
  <div className="studio-room-topline"><a href="/sectors">← كل الفرق</a><span className="cinema-live-status"><i/> {liveAt?"متصل · مباشر":"غرفة الفريق"}</span><span className="studio-room-brand">1960 / STUDIO HUB</span></div>
  <header className="studio-room-hero"><div><small>{look.english}</small><h1>{look.icon} {teamName}</h1><p>{look.description}</p></div><div className="studio-room-hero-mark">{String(id).padStart(2,"0")}<span>DEPT.</span></div></header>
  <nav className="studio-team-switcher" aria-label="الفرق الخمسة">{teamLinks.map(t=><a key={t.id} href={"/teams/"+t.id} aria-current={id===t.id?"page":undefined}><span>{t.icon}</span><b>{t.label}</b><small>{(teamCounts[t.id]??0)+" طلاب"}</small></a>)}</nav>
  {error&&<p className="studio-room-message" role="status">{error}</p>}
  {team&&<><section className="studio-room-metrics">
   <div><small>أعضاء الفريق</small><strong>{members.length}</strong><span>TEAM MEMBERS</span></div>
   <div><small>التكليفات النشطة</small><strong>{assignments.length}</strong><span>ACTIVE TASKS</span></div>
   <div><small>تسليمات وصلت</small><strong>{reviewItems.length}</strong><span>DELIVERIES</span></div>
   <div><small>بانتظار التسليم</small><strong>{pending}</strong><span>IN PROGRESS</span></div>
  </section>
  <nav className="studio-room-tabs"><button className={active==="overview"?"is-active":""} onClick={()=>setActive("overview")}>◉ غرفة العمليات</button><button className={active==="tasks"?"is-active":""} onClick={()=>setActive("tasks")}>▤ التكليفات</button><button className={active==="members"?"is-active":""} onClick={()=>setActive("members")}>♙ أعضاء الفريق</button></nav>
  {active==="overview"&&<div className="studio-room-grid">
   <section className="studio-panel studio-assignments-panel"><div className="studio-panel-heading"><div><small>MISSION CONTROL</small><h2>التكليفات الحالية</h2></div><span>{assignments.length} مهام</span></div>
    {assignments.slice(0,4).map(a=><article className="studio-task-line" key={a.id}><div><b>{a.title}</b><small>{a.due_at?"آخر موعد: "+new Date(a.due_at).toLocaleDateString("ar-EG",{timeZone:"Africa/Cairo"}):"موعد التسليم غير محدد"}</small></div><span>{receipts.filter(r=>r.assignment_id===a.id&&r.received).length}/{members.length} استلام</span><button onClick={()=>setActive("tasks")} aria-label="تفاصيل التكليف">↗</button>{supervisor&&<button type="button" className="studio-archive-assignment" onClick={()=>void archiveAssignment(a)} aria-label={"أرشفة التكليف "+a.title}>أرشفة</button>}</article>)}
    {!assignments.length&&<p className="studio-empty">لا توجد تكليفات نشطة حاليًا.</p>}
    <a className="studio-text-link" href="/submissions">فتح مركز التسليمات ↗</a>
   </section>
   <section className="studio-panel studio-tracker-panel"><div className="studio-panel-heading"><div><small>CREW MICRO-LOG</small><h2>دفتر متابعة الفريق</h2></div><span>{members.length} أعضاء</span></div>
    <div className="studio-member-grid">{members.map(m=>{const items=supervisor||m.user_id===currentUserId?reviewItems.filter(x=>x.studentId===m.user_id):[];const done=items.length>0;const labels=[...new Set(items.map(assignmentLabel))];return <button type="button" className="studio-member-tile studio-member-clickable" key={m.user_id} onClick={()=>{if(supervisor||m.user_id===currentUserId)setOpenedStudent(m.user_id)}}><span className={"studio-status-dot "+(done?"is-done":"is-pending")}/><span className="studio-member-copy"><b>{names[m.user_id]??"عضو الفريق"}</b><small>{!supervisor&&m.user_id!==currentUserId?"التسليمات خاصة بصاحبها":labels.length?labels.join(" ✓ · ")+" — "+items.length+" ملفات/تسليمات":"بانتظار أول تسليم"}</small></span><span className="studio-member-state">{!supervisor&&m.user_id!==currentUserId?"🔒 خاص":done?items.length+" ملفات":"قيد التنفيذ"}</span><span aria-hidden="true">↗</span></button>})}</div>
    {!members.length&&<p className="studio-empty">لا يوجد أعضاء معتمدون في هذا الفريق.</p>}
   </section>
   <section className="studio-panel studio-submission-panel"><div className="studio-panel-heading"><div><small>UNIFIED MEDIA DOCK</small><h2>كبسولة التسليم السريع</h2></div><span>TEXT / MEDIA</span></div>
    <div className="studio-submit-dock"><textarea aria-label="نص التسليم" rows={2} value={quickText} onChange={e=>setQuickText(e.target.value)} placeholder="اكتبي تحديثًا أو تسليمًا سريعًا للفريق..."/><div className="studio-dock-actions"><a href={"/submissions?team="+id+"&kind=file"} title="رفع ملف أو مستند" aria-label="رفع ملف">📄</a><a href={"/submissions?team="+id+"&kind=media"} title="رفع صورة أو فيديو" aria-label="رفع صورة أو فيديو">🎬</a><a href={"/submissions?team="+id+"&kind=link"} title="إضافة رابط" aria-label="إضافة رابط">🔗</a><a href={"/submissions?team="+id+"&kind=voice"} title="تسجيل صوتي" aria-label="تسجيل صوتي">🎙️</a><button disabled={quickBusy||quickText.trim().length<20} onClick={()=>void sendQuickText()} title="إرسال النص" aria-label="إرسال النص">{quickBusy?"…":"➤"}</button></div></div>
    <div className="studio-dock-foot"><span>{quickNotice||"20 حرفًا على الأقل للنص السريع"}</span><a href={"/submissions?team="+id}>كل خيارات الرفع والتسجيل ↗</a></div>
   </section>
   <section className="studio-panel studio-deliveries-panel"><div className="studio-panel-heading"><div><small>RECENT MATERIALS</small><h2>أحدث التسليمات</h2></div><span>{supervisor?"كل تسليمات الفريق":"تسليماتي وتقييماتي"} · {myItems.length} عنصر</span></div>
    <div className="studio-delivery-filters"><label>عرض <select aria-label="فلترة التكليف" value={deliveryFilter} onChange={e=>setDeliveryFilter(e.target.value)}><option value="all">كل التكليفات ({bundles.length})</option><option value="1">التكليف الأول</option><option value="2">التكليف الثاني</option></select></label>{supervisor&&<label>الطالب <select aria-label="فلترة الطالب" value={deliveryStudent} onChange={e=>setDeliveryStudent(e.target.value)}><option value="all">كل الطلاب</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{names[m.user_id]??"عضو الفريق"}</option>)}</select></label>}</div>
    <div className="studio-delivery-list studio-delivery-scroll">{filteredBundles.map(bundle=><button type="button" className="studio-delivery-row" key={bundle.studentId+"|"+bundle.label} onClick={()=>setOpenedBundle(bundle.items)}><span className="studio-delivery-icon">📁</span><span className="studio-delivery-info"><b>{names[bundle.studentId]??"عضو الفريق"} — {bundle.label}</b><small>{bundle.items.length} مرفقات/تسليمات · {new Date(bundle.createdAt).toLocaleDateString("ar-EG")}</small></span><span className="studio-delivery-rating">{supervisor?"عرض الكل ↗":bundle.items.some(item=>stamps[keyFor(item.kind,item.id)]?.stamp_status)?"⭐ تم التقييم · عرض":"بانتظار التقييم · عرض"}</span></button>)}</div>
    {!filteredBundles.length&&<p className="studio-empty">لا توجد تسليمات مطابقة للفلتر.</p>}
   </section>
  </div>}
  {active==="tasks"&&<section className="studio-panel studio-full-panel"><div className="studio-panel-heading"><div><small>MISSION BOARD</small><h2>تكليفات {teamName}</h2></div><span>{assignments.length} تكليفات</span></div>{assignments.map(a=><article className="studio-task-expanded" key={a.id}><div><b>{a.title}</b><small>{a.due_at?"آخر موعد: "+new Date(a.due_at).toLocaleString("ar-EG",{timeZone:"Africa/Cairo"}):"موعد غير محدد"}</small></div>{a.description&&<p>{a.description}</p>}<span>{receipts.filter(r=>r.assignment_id===a.id&&r.received).length} تأكيدات استلام من {members.length}</span>{supervisor&&<button type="button" className="studio-archive-assignment" onClick={()=>void archiveAssignment(a)}>🗂 أرشفة التكليف المكرر</button>}</article>)}{!assignments.length&&<p className="studio-empty">لا توجد تكليفات لهذا الفريق.</p>}</section>}
  {active==="members"&&<section className="studio-panel studio-full-panel"><div className="studio-panel-heading"><div><small>THE CREW</small><h2>أعضاء {teamName}</h2></div><span>{members.length} أعضاء</span></div><div className="studio-member-grid">{members.map(m=><article className="studio-member-tile" key={m.user_id}><span className="studio-status-dot is-pending"/><div className="studio-member-copy"><b>{names[m.user_id]??"عضو الفريق"}</b><small>{reviewItems.filter(x=>x.studentId===m.user_id).length} تسليمات مسجلة</small></div></article>)}</div></section>}
  </>}
  {openedBundle&&<div className="studio-review-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpenedBundle(null)}}><section className="studio-review-modal" role="dialog" aria-modal="true" aria-label="مرفقات التسليم" dir="rtl"><header><h2>📁 كل مرفقات التسليم ({openedBundle.length})</h2><button onClick={()=>setOpenedBundle(null)} aria-label="إغلاق">×</button></header><div className="studio-bundle-items">{openedBundle.map(item=><button type="button" key={item.kind+item.id} onClick={()=>{setOpenedBundle(null);void openReview(item)}}><span>{item.kind==="file"?"📎":"✍️"} {item.title}</span><small>{new Date(item.createdAt).toLocaleString("ar-EG")} · {supervisor?"عرض وتقييم":"عرض تقييمي"} ↗</small></button>)}</div></section></div>}
  {openedStudent&&<div className="studio-review-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpenedStudent(null)}}><section className="studio-review-modal" role="dialog" aria-modal="true" aria-label="أرشيف تسليمات الطالب" dir="rtl"><header><h2>أرشيف {names[openedStudent]??"الطالب"}</h2><button onClick={()=>setOpenedStudent(null)} aria-label="إغلاق">×</button></header><div className="studio-bundle-items">{reviewItems.filter(x=>x.studentId===openedStudent).map(item=><button type="button" key={item.kind+item.id} onClick={()=>{setOpenedStudent(null);void openReview(item)}}><span>{item.kind==="file"?"📎":"✍️"} {item.title}</span><small>{new Date(item.createdAt).toLocaleDateString("ar-EG")} · {supervisor?"عرض وتقييم":"عرض تقييمي"} ↗</small></button>)}</div></section></div>}
  {selected&&<div className="studio-review-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="studio-review-modal" role="dialog" aria-modal="true" aria-labelledby="studio-review-title" dir="rtl"><header><div><small>DIRECTOR'S REVIEW WINDOW</small><h2 id="studio-review-title">مراجعة التسليم</h2></div><button onClick={()=>setSelected(null)} aria-label="إغلاق">×</button></header><div className="studio-review-meta"><b>{selected.title}</b><span>{names[selected.studentId]??"عضو الفريق"} · {new Date(selected.createdAt).toLocaleString("ar-EG")}</span></div><div className="studio-review-preview">{selected.kind==="work"?selected.body:previewUrl?(selected.fileType?.startsWith("image/")?<img src={previewUrl} alt={selected.title}/>:selected.fileType?.startsWith("video/")?<video controls src={previewUrl}/>:selected.fileType?.startsWith("audio/")?<audio controls src={previewUrl}/>:<a href={previewUrl} target="_blank" rel="noreferrer">فتح الملف في نافذة جديدة ↗</a>):<span>جارٍ تجهيز معاينة الملف…</span>}</div>{supervisor?<><label className="studio-review-label">ختم د/ نوران أحمد</label><div className="gold-stamp-options">{([["approved","✦ معتمد"],["revise","🎬 تعديل بسيط"],["reviewing","◷ قيد المراجعة"],["weak","⚠ ضعيف"]] as const).map(([value,label])=><button key={value} type="button" className={stampChoice===value?"chosen":""} onClick={()=>setStampChoice(value)}>{label}</button>)}</div><small className="gold-stamp-hint">اختيار الختم لا يغير التقييم القديم إلا بعد الضغط على حفظ.</small><label className="studio-review-label">تقييم المشرفة بالنجوم</label><div className="studio-review-stars" aria-label="التقييم من خمسة">{[1,2,3,4,5].map(n=><button key={n} className={reviewStars>=n?"selected":""} onClick={()=>setReviewStars(n)} aria-label={n+" نجوم"}>★</button>)}</div><label className="studio-review-label" htmlFor="studio-review-note">تعليق وتوجيه للطالب</label><textarea id="studio-review-note" maxLength={500} rows={3} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="اكتبي ملاحظاتك أو المطلوب تعديله..."/><div className="studio-review-actions"><button type="button" className="studio-review-save" disabled={reviewBusy} onClick={()=>void saveReview()}>{reviewBusy?"جارٍ الحفظ…":"✓ حفظ التقييم والتعليق"}</button></div></>:<div className="studio-student-feedback"><b>ملاحظات المشرفة</b>{stamps[keyFor(selected.kind,selected.id)]?.stamp_status&&<div className="gold-stamp-receipt"><strong>{stamps[keyFor(selected.kind,selected.id)].stamp_status==="approved"?"✦ معتمد — تقييم إيجابي":stamps[keyFor(selected.kind,selected.id)].stamp_status==="revise"?"🎬 تعديل بسيط":stamps[keyFor(selected.kind,selected.id)].stamp_status==="weak"?"⚠ ضعيف — يحتاج إعادة عمل":"◷ قيد المراجعة"}</strong><small>د/ نوران أحمد · {stamps[keyFor(selected.kind,selected.id)].stamp_at?new Date(stamps[keyFor(selected.kind,selected.id)].stamp_at!).toLocaleDateString("ar-EG",{timeZone:"Africa/Cairo"}):""}</small></div>}<p>{notes[keyFor(selected.kind,selected.id)]||"لا توجد ملاحظات مسجلة على هذا التسليم بعد."}</p><span>{stars[keyFor(selected.kind,selected.id)]? "التقييم: "+stars[keyFor(selected.kind,selected.id)]+"/5":"لم يتم التقييم بعد"}</span></div>}</section></div>}
 </main>;
}
