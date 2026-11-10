"use client";
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
 const [stamps,setStamps]=useState<Record<string,GoldenStamp>>({}),[stampChoice,setStampChoice]=useState<"approved"|"revise"|"reviewing">("reviewing");
 const [notes,setNotes]=useState<Record<string,string>>({}),[stars,setStars]=useState<Record<string,number>>({}),[received,setReceived]=useState<Record<string,boolean>>({});
 const [supervisor,setSupervisor]=useState(false),[error,setError]=useState("جارٍ تحميل غرفة الفريق..."),[liveAt,setLiveAt]=useState<Date|null>(null);
 const [active,setActive]=useState<"overview"|"tasks"|"members">("overview"),[selected,setSelected]=useState<ReviewItem|null>(null),[reviewNote,setReviewNote]=useState(""),[reviewStars,setReviewStars]=useState(0),[reviewBusy,setReviewBusy]=useState(false),[previewUrl,setPreviewUrl]=useState("");
 const [quickText,setQuickText]=useState(""),[quickBusy,setQuickBusy]=useState(false),[quickNotice,setQuickNotice]=useState("");
 const look=identity[id]??{icon:"🎬",english:"1960 STUDIO",description:"مساحة عمل الفريق",vibe:"default"};
 const keyFor=(kind:string,itemId:number)=>kind+":"+itemId;

 async function load(){
  const db=getSupabase();if(!db){setError("الاتصال غير متاح.");return;}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  const [profile,membership,teams,allMemberships]=await Promise.all([db.from("profiles").select("app_role,approval_status").eq("id",user.id).single(),db.from("team_members").select("team_id").eq("user_id",user.id).eq("team_id",id),db.from("teams").select("id,name").order("id"),db.from("team_members").select("team_id,user_id")]);
  const isSupervisor=profile.data?.app_role==="supervisor";
  if(!isSupervisor&&(profile.data?.approval_status!=="approved"||!membership.data?.length)){setError("هذه المساحة مخصصة لأعضاء الفريق والمشرفة فقط.");return;}
  const [t,m,a,p,r,u,w,ar,wr,fb]=await Promise.all([
   db.from("teams").select("id,name").eq("id",id).single(),
   db.from("team_members").select("user_id").eq("team_id",id),
   db.from("assignments").select("id,title,description,due_at,assignment_teams!inner(team_id)").eq("assignment_teams.team_id",id).is("archived_at",null).order("created_at",{ascending:false}),
   db.from("profiles").select("id,full_name,approval_status,app_role").eq("approval_status","approved").eq("app_role","student"),
   db.from("assignment_receipts").select("assignment_id,student_id,received,delivery_status"),
   db.from("attachments").select("id,uploaded_by,file_name,storage_path,file_type,created_at").eq("team_id",id).order("created_at",{ascending:false}).limit(150),
   db.from("work_submissions").select("id,student_id,title,body,category,created_at").eq("team_id",id).order("created_at",{ascending:false}).limit(150),
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
 const myItems=supervisor?reviewItems:reviewItems.filter(x=>members.some(m=>m.user_id===x.studentId));
 const completed=members.filter(m=>reviewItems.some(x=>x.studentId===m.user_id)).length;
 const pending=members.length-completed;

 async function openReview(item:ReviewItem){
  if(supervisor){const db=getSupabase();if(db){const {data:{user}}=await db.auth.getUser();if(user){const r=await db.from("supervisor_submission_views").upsert({source_type:item.kind,source_id:item.id,supervisor_id:user.id},{onConflict:"source_type,source_id,supervisor_id",ignoreDuplicates:true});if(r.error)setError("تعذر حفظ حالة المشاهدة: "+r.error.message);}}}
  setStampChoice((stamps[keyFor(item.kind,item.id)]?.stamp_status as "approved"|"revise"|"reviewing")||"reviewing");setSelected(item);setReviewNote(notes[keyFor(item.kind,item.id)]??"");setReviewStars(stars[keyFor(item.kind,item.id)]??0);setPreviewUrl("");
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
  <nav className="studio-room-tabs"><button className={active==="overview"?"is-active":""} onClick={()=>setActive("overview")}>◉ غرفة العمليات</button><button className={active==="tasks"?"is-active":""} onClick={()=>setActive("tasks")}>▤ التكليفات</button><button className={active==="members"?"is-active":""} onClick={()=>setActive("members")}>♙ أعضاء الفريق</button><a href={"/chat?team="+id}>◌ شات الفريق</a></nav>
  {active==="overview"&&<div className="studio-room-grid">
   <section className="studio-panel studio-assignments-panel"><div className="studio-panel-heading"><div><small>MISSION CONTROL</small><h2>التكليفات الحالية</h2></div><span>{assignments.length} مهام</span></div>
    {assignments.slice(0,4).map(a=><article className="studio-task-line" key={a.id}><div><b>{a.title}</b><small>{a.due_at?"آخر موعد: "+new Date(a.due_at).toLocaleDateString("ar-EG",{timeZone:"Africa/Cairo"}):"موعد التسليم غير محدد"}</small></div><span>{receipts.filter(r=>r.assignment_id===a.id&&r.received).length}/{members.length} استلام</span><button onClick={()=>setActive("tasks")} aria-label="تفاصيل التكليف">↗</button></article>)}
    {!assignments.length&&<p className="studio-empty">لا توجد تكليفات نشطة حاليًا.</p>}
    <a className="studio-text-link" href="/submissions">فتح مركز التسليمات ↗</a>
   </section>
   <section className="studio-panel studio-tracker-panel"><div className="studio-panel-heading"><div><small>CREW MICRO-LOG</small><h2>دفتر متابعة الفريق</h2></div><span>{members.length} أعضاء</span></div>
    <div className="studio-member-grid">{members.map((m,i)=>{const items=reviewItems.filter(x=>x.studentId===m.user_id);const latest=items[0];const done=!!latest;return <article className="studio-member-tile" key={m.user_id}><span className={"studio-status-dot "+(done?"is-done":"is-pending")}/><div className="studio-member-copy"><b>{names[m.user_id]??"عضو الفريق"}</b><small>{latest?latest.title:"بانتظار أول تسليم"}</small></div><span className="studio-member-state">{done?"سلّم":"قيد التنفيذ"}</span>{latest&&<button onClick={()=>void openReview(latest)} aria-label={"عرض تسليم "+(names[m.user_id]??"الطالب")}>↗</button>}</article>})}</div>
    {!members.length&&<p className="studio-empty">لا يوجد أعضاء معتمدون في هذا الفريق.</p>}
   </section>
   <section className="studio-panel studio-submission-panel"><div className="studio-panel-heading"><div><small>UNIFIED MEDIA DOCK</small><h2>كبسولة التسليم السريع</h2></div><span>TEXT / MEDIA</span></div>
    <div className="studio-submit-dock"><textarea aria-label="نص التسليم" rows={2} value={quickText} onChange={e=>setQuickText(e.target.value)} placeholder="اكتبي تحديثًا أو تسليمًا سريعًا للفريق..."/><div className="studio-dock-actions"><a href={"/submissions?team="+id+"&kind=file"} title="رفع ملف أو مستند" aria-label="رفع ملف">📄</a><a href={"/submissions?team="+id+"&kind=media"} title="رفع صورة أو فيديو" aria-label="رفع صورة أو فيديو">🎬</a><a href={"/submissions?team="+id+"&kind=link"} title="إضافة رابط" aria-label="إضافة رابط">🔗</a><a href={"/submissions?team="+id+"&kind=voice"} title="تسجيل صوتي" aria-label="تسجيل صوتي">🎙️</a><button disabled={quickBusy||quickText.trim().length<20} onClick={()=>void sendQuickText()} title="إرسال النص" aria-label="إرسال النص">{quickBusy?"…":"➤"}</button></div></div>
    <div className="studio-dock-foot"><span>{quickNotice||"20 حرفًا على الأقل للنص السريع"}</span><a href={"/submissions?team="+id}>كل خيارات الرفع والتسجيل ↗</a></div>
   </section>
   <section className="studio-panel studio-deliveries-panel"><div className="studio-panel-heading"><div><small>RECENT MATERIALS</small><h2>أحدث التسليمات</h2></div><span>{reviewItems.length} عنصر</span></div>
    <div className="studio-delivery-list">{myItems.slice(0,6).map(item=><button className="studio-delivery-row" key={item.kind+item.id} onClick={()=>void openReview(item)}><span className="studio-delivery-icon">{item.kind==="file"?"📎":"✍️"}</span><span className="studio-delivery-info"><b>{item.title}</b><small>{names[item.studentId]??"عضو الفريق"} · {new Date(item.createdAt).toLocaleDateString("ar-EG")}</small></span><span className="studio-delivery-rating">{stamps[keyFor(item.kind,item.id)]?.stamp_status?<span className={"gold-stamp-mini gold-stamp-"+stamps[keyFor(item.kind,item.id)].stamp_status}>{stamps[keyFor(item.kind,item.id)].stamp_status==="approved"?"✦ معتمد":stamps[keyFor(item.kind,item.id)].stamp_status==="revise"?"🎬 تعديل بسيط":"◷ قيد المراجعة"}</span>:stars[keyFor(item.kind,item.id)]? "★ "+stars[keyFor(item.kind,item.id)]+"/5":"عرض ↗"}</span></button>)}</div>
    {!reviewItems.length&&<p className="studio-empty">أول ما يوصل تسليم هيظهر هنا.</p>}
   </section>
  </div>}
  {active==="tasks"&&<section className="studio-panel studio-full-panel"><div className="studio-panel-heading"><div><small>MISSION BOARD</small><h2>تكليفات {teamName}</h2></div><span>{assignments.length} تكليفات</span></div>{assignments.map(a=><article className="studio-task-expanded" key={a.id}><div><b>{a.title}</b><small>{a.due_at?"آخر موعد: "+new Date(a.due_at).toLocaleString("ar-EG",{timeZone:"Africa/Cairo"}):"موعد غير محدد"}</small></div>{a.description&&<p>{a.description}</p>}<span>{receipts.filter(r=>r.assignment_id===a.id&&r.received).length} تأكيدات استلام من {members.length}</span></article>)}{!assignments.length&&<p className="studio-empty">لا توجد تكليفات لهذا الفريق.</p>}</section>}
  {active==="members"&&<section className="studio-panel studio-full-panel"><div className="studio-panel-heading"><div><small>THE CREW</small><h2>أعضاء {teamName}</h2></div><span>{members.length} أعضاء</span></div><div className="studio-member-grid">{members.map(m=><article className="studio-member-tile" key={m.user_id}><span className="studio-status-dot is-pending"/><div className="studio-member-copy"><b>{names[m.user_id]??"عضو الفريق"}</b><small>{reviewItems.filter(x=>x.studentId===m.user_id).length} تسليمات مسجلة</small></div></article>)}</div></section>}
  </>}
  {selected&&<div className="studio-review-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="studio-review-modal" role="dialog" aria-modal="true" aria-labelledby="studio-review-title" dir="rtl"><header><div><small>DIRECTOR'S REVIEW WINDOW</small><h2 id="studio-review-title">مراجعة التسليم</h2></div><button onClick={()=>setSelected(null)} aria-label="إغلاق">×</button></header><div className="studio-review-meta"><b>{selected.title}</b><span>{names[selected.studentId]??"عضو الفريق"} · {new Date(selected.createdAt).toLocaleString("ar-EG")}</span></div><div className="studio-review-preview">{selected.kind==="work"?selected.body:previewUrl?(selected.fileType?.startsWith("image/")?<img src={previewUrl} alt={selected.title}/>:selected.fileType?.startsWith("video/")?<video controls src={previewUrl}/>:selected.fileType?.startsWith("audio/")?<audio controls src={previewUrl}/>:<a href={previewUrl} target="_blank" rel="noreferrer">فتح الملف في نافذة جديدة ↗</a>):<span>جارٍ تجهيز معاينة الملف…</span>}</div>{supervisor?<><label className="studio-review-label">ختم د/ نوران أحمد</label><div className="gold-stamp-options">{([["approved","✦ معتمد"],["revise","🎬 تعديل بسيط"],["reviewing","◷ قيد المراجعة"]] as const).map(([value,label])=><button key={value} type="button" className={stampChoice===value?"chosen":""} onClick={()=>setStampChoice(value)}>{label}</button>)}</div><small className="gold-stamp-hint">اختيار الختم لا يغير التقييم القديم إلا بعد الضغط على حفظ.</small><label className="studio-review-label">تقييم المشرفة بالنجوم</label><div className="studio-review-stars" aria-label="التقييم من خمسة">{[1,2,3,4,5].map(n=><button key={n} className={reviewStars>=n?"selected":""} onClick={()=>setReviewStars(n)} aria-label={n+" نجوم"}>★</button>)}</div><label className="studio-review-label" htmlFor="studio-review-note">تعليق وتوجيه للطالب</label><textarea id="studio-review-note" maxLength={500} rows={3} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="اكتبي ملاحظاتك أو المطلوب تعديله..."/><button className="studio-review-save" disabled={reviewBusy} onClick={()=>void saveReview()}>{reviewBusy?"جارٍ الحفظ…":"حفظ التقييم والتعليق"}</button></>:<div className="studio-student-feedback"><b>ملاحظات المشرفة</b>{stamps[keyFor(selected.kind,selected.id)]?.stamp_status&&<div className="gold-stamp-receipt"><strong>{stamps[keyFor(selected.kind,selected.id)].stamp_status==="approved"?"✦ معتمد — تقييم إيجابي":stamps[keyFor(selected.kind,selected.id)].stamp_status==="revise"?"🎬 تعديل بسيط":"◷ قيد المراجعة"}</strong><small>د/ نوران أحمد · {stamps[keyFor(selected.kind,selected.id)].stamp_at?new Date(stamps[keyFor(selected.kind,selected.id)].stamp_at!).toLocaleDateString("ar-EG",{timeZone:"Africa/Cairo"}):""}</small></div>}<p>{notes[keyFor(selected.kind,selected.id)]||"لا توجد ملاحظات مسجلة على هذا التسليم بعد."}</p><span>{stars[keyFor(selected.kind,selected.id)]? "التقييم: "+stars[keyFor(selected.kind,selected.id)]+"/5":"لم يتم التقييم بعد"}</span></div>}</section></div>}
 </main>;
}
