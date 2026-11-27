"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {getAuthUser,getPublicSupabase,getSupabase} from "../../lib/supabase-browser";

type Honor={id:number;student_name:string;achievement:string;award:string;stars:number;note:string|null;created_at:string};
type CrewMember={id:string;full_name:string;created_at?:string};
type PhotoRow={user_id:string;photo_path:string|null};

const burstStars=Array.from({length:28},(_,i)=>({
 left:(3+(i*37)%94)+"%",
 top:(4+(i*53)%90)+"%",
 delay:(i%7)*75+"ms",
 size:14+(i%4)*5
}));

function normalizeName(value:string){
 return value.normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("ar-EG");
}

function findStudentPhoto(studentName:string,crew:CrewMember[],photos:Record<string,string>){
 const target=normalizeName(studentName);
 const matches=crew.filter(member=>{
  const candidate=normalizeName(member.full_name);
  return candidate===target||candidate.startsWith(target+" ")||target.startsWith(candidate+" ");
 });
 if(matches.length!==1)return null;
 return photos[matches[0].id]??null;
}

function dateLabel(value:string){
 return new Date(value).toLocaleDateString("ar-EG",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

function SignatureStamp(){
 return <div className="honor-signature-stamp">
  <span className="honor-signature-caption">SIGNED &amp; APPROVED BY</span>
  <strong>Dr. Nouran Ahmed</strong>
  <span className="honor-signature-role">STUDIO SUPERVISOR</span>
 </div>;
}

function StudentPortrait({name,photo,large=false}:{name:string;photo:string|null;large?:boolean}){
 return <div className={"honor-student-portrait"+(large?" is-large":"")}>
  {photo?<img src={photo} alt={"صورة "+name} loading="lazy"/>:<span aria-hidden="true">{name.trim().slice(0,1)||"✦"}</span>}
 </div>;
}

export default function HonorBoard(){
 const [items,setItems]=useState<Honor[]>([]);
 const [crew,setCrew]=useState<CrewMember[]>([]);
 const [photoByUser,setPhotoByUser]=useState<Record<string,string>>({});
 const [supervisor,setSupervisor]=useState(false);
 const [name,setName]=useState("");
 const [selectedCrewId,setSelectedCrewId]=useState("");
 const [achievement,setAchievement]=useState("");
 const [award,setAward]=useState("النجم الأسبوعي");
 const [stars,setStars]=useState(5);
 const [note,setNote]=useState("");
 const [status,setStatus]=useState("");
 const [selected,setSelected]=useState<Honor|null>(null);
 const [celebrating,setCelebrating]=useState(false);

 const load=useCallback(async()=>{
  const db=getSupabase();
  const publicDb=getPublicSupabase();
  if(!publicDb){setStatus("تعذر الاتصال بقاعدة البيانات.");return;}

  const {data:{user}}=await getAuthUser();
  let mayReadCrew=false;
  if(user&&db){
   const profile=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).maybeSingle();
   const isSupervisor=!profile.error&&profile.data?.app_role==="supervisor";
   setSupervisor(isSupervisor);
   mayReadCrew=isSupervisor||(!profile.error&&profile.data?.approval_status==="approved");
  }else{
   setSupervisor(false);
  }

  if(mayReadCrew&&db){
   const [crewResult,photoResult]=await Promise.all([
    db.rpc("list_approved_crew"),
    db.from("crew_profiles").select("user_id,photo_path")
   ]);
   if(!crewResult.error&&!photoResult.error){
    const crewRows=(crewResult.data??[]) as CrewMember[];
    const photoRows=(photoResult.data??[]) as PhotoRow[];
    const photoRowsByUser=new Map(photoRows.filter(row=>row.photo_path).map(row=>[row.user_id,row.photo_path as string]));
    const urls:Record<string,string>={};
    for(const member of crewRows){
     const path=photoRowsByUser.get(member.id);
     if(path){
      const result=db.storage.from("crew-photos").getPublicUrl(path);
      if(result.data?.publicUrl)urls[member.id]=result.data.publicUrl;
     }
    }
    setCrew(crewRows);
    setPhotoByUser(urls);
   }else{
    setCrew([]);
    setPhotoByUser({});
   }
  }else{
   setCrew([]);
   setPhotoByUser({});
  }

  const result=await publicDb.from("studio_honors")
   .select("id,student_name,achievement,award,stars,note,created_at")
   .order("created_at",{ascending:false})
   .limit(100);
  if(!result.error)setItems((result.data??[]) as Honor[]);
  else setStatus("تعذر تحميل التكريمات: "+result.error.message);
 },[]);

 useEffect(()=>{
  void load();
  const db=getSupabase();
  if(!db)return;
  const channel=db.channel("honor-board-live")
   .on("postgres_changes",{event:"*",schema:"public",table:"studio_honors"},()=>void load())
   .on("postgres_changes",{event:"*",schema:"public",table:"crew_profiles"},()=>void load())
   .subscribe();
  return()=>{void db.removeChannel(channel)};
 },[load]);

 useEffect(()=>{
  if(!selected){setCelebrating(false);return;}
  setCelebrating(true);
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const timer=window.setTimeout(()=>setCelebrating(false),4200);
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.key==="Escape")setSelected(null);
  };
  window.addEventListener("keydown",onKeyDown);
  return()=>{
   window.clearTimeout(timer);
   window.removeEventListener("keydown",onKeyDown);
   document.body.style.overflow=previousOverflow;
  };
 },[selected?.id]);

 async function add(event:FormEvent){
  event.preventDefault();
  const db=getSupabase();
  if(!db)return;
  const {data:{user}}=await getAuthUser();
  if(!user){setStatus("سجّلي الدخول بحساب المشرفة لإضافة تكريم.");return;}
  const profile=await db.from("profiles").select("app_role").eq("id",user.id).maybeSingle();
  if(profile.error||profile.data?.app_role!=="supervisor"){
   setSupervisor(false);
   setStatus("إضافة التكريم متاحة للمشرفة المعتمدة فقط.");
   return;
  }
  const result=await db.from("studio_honors").insert({
   student_name:name.trim(),achievement:achievement.trim(),award,stars,
   note:note.trim()||null,created_by:user.id
  });
  if(result.error)setStatus("تعذر نشر التكريم: "+result.error.message);
  else{
   setName("");
   setSelectedCrewId("");
   setAchievement("");
   setNote("");
   setStatus("تم نشر شهادة التكريم بنجاح ⭐");
   await load();
  }
 }

 async function remove(id:number){
  if(!window.confirm("حذف هذا التكريم؟"))return;
  const db=getSupabase();
  if(!db)return;
  const {data:{user}}=await getAuthUser();
  if(!user){setStatus("سجّلي الدخول بحساب المشرفة لحذف التكريم.");return;}
  const profile=await db.from("profiles").select("app_role").eq("id",user.id).maybeSingle();
  if(profile.error||profile.data?.app_role!=="supervisor"){
   setSupervisor(false);
   setStatus("حذف التكريم متاح للمشرفة المعتمدة فقط.");
   return;
  }
  const result=await db.from("studio_honors").delete().eq("id",id);
  if(result.error)setStatus("تعذر حذف التكريم: "+result.error.message);
  else{
   if(selected?.id===id)setSelected(null);
   setStatus("تم حذف التكريم.");
   await load();
  }
 }

 return <main dir="rtl" className="honor-board-page">
  <a href="/" className="honor-board-back">← الرئيسية</a>
  <header className="honor-board-header">
   <p className="honor-board-eyebrow">PLATEAU CREW HUB · FILM STARS &amp; HONORS</p>
   <h1 className="honor-board-title">🏆 لوحة شرف الفريق</h1>
   <p className="honor-board-subtitle">كل إنجاز يستحق لحظة تقدير تليق بصاحبه 🎬</p>
  </header>

  {status&&<p className="honor-board-status" role="status">{status}</p>}

  {supervisor&&<form className="honor-board-form" onSubmit={add}>
   <div className="honor-form-heading">
    <span className="honor-form-icon">✦</span>
    <div><h2>إضافة شهادة تكريم</h2><p>احتفي بإنجاز جديد من إنجازات الفريق</p></div>
   </div>
   {crew.length>0&&<label className="honor-form-field">
    <span>اختيار طالب من طاقم الفيلم لربط صورته تلقائيًا</span>
    <select value={selectedCrewId} onChange={event=>{
     const id=event.target.value;
     setSelectedCrewId(id);
     const member=crew.find(item=>item.id===id);
     setName(member?.full_name??"");
    }}>
     <option value="">اختيار طالب (اختياري)</option>
     {crew.map(member=><option key={member.id} value={member.id}>{member.full_name}</option>)}
    </select>
   </label>}
   <label className="honor-form-field">
    <span>اسم الطالب أو الفريق</span>
    <input required maxLength={120} placeholder="اكتب الاسم أو اختَر طالبًا من القائمة" value={name} onChange={event=>{setName(event.target.value);setSelectedCrewId("");}}/>
   </label>
   <label className="honor-form-field">
    <span>الإنجاز أو التكليف المميز</span>
    <textarea required maxLength={500} rows={3} placeholder="عنوان الإنجاز الذي يستحق التكريم" value={achievement} onChange={event=>setAchievement(event.target.value)}/>
   </label>
   <div className="honor-form-row">
    <label className="honor-form-field">
     <span>نوع التكريم</span>
     <select value={award} onChange={event=>setAward(event.target.value)}>
      <option>النجم الأسبوعي</option><option>الكلاكيت الذهبي</option><option>تكريمات الإخراج</option><option>إنجاز مميز</option>
     </select>
    </label>
    <label className="honor-form-field">
     <span>التقييم</span>
     <select value={stars} onChange={event=>setStars(Number(event.target.value))}>
      {[5,4,3,2,1].map(value=><option key={value} value={value}>{value} نجوم</option>)}
     </select>
    </label>
   </div>
   <label className="honor-form-field">
    <span>رسالة تقدير من المشرفة</span>
    <textarea maxLength={1200} rows={4} placeholder="اكتبي كلمات التقدير التي ستظهر كاملة داخل الشهادة..." value={note} onChange={event=>setNote(event.target.value)}/>
   </label>
   <button className="honor-publish-button" type="submit">نشر شهادة التكريم ⭐</button>
  </form>}

  {items.length>0?<section className="honor-board-grid" aria-label="شهادات تكريم الفريق">
   {items.map(item=>{
    const photo=findStudentPhoto(item.student_name,crew,photoByUser);
    return <button type="button" className="honor-certificate-card" key={item.id} onClick={()=>setSelected(item)} aria-haspopup="dialog" aria-label={"عرض شهادة تكريم "+item.student_name}>
     <span className="honor-certificate-topline"><span>PLATEAU CREW HUB</span><span>✦ CERTIFICATE OF HONOR ✦</span></span>
     <span className="honor-certificate-award">🎬 {item.award}</span>
     <span className="honor-certificate-person">
      <StudentPortrait name={item.student_name} photo={photo}/>
      <span className="honor-certificate-name">{item.student_name}</span>
     </span>
     <span className="honor-certificate-achievement">{item.achievement}</span>
     <span className="honor-certificate-stars" aria-label={"التقييم "+item.stars+" من 5"}>{"★".repeat(item.stars)}{"☆".repeat(Math.max(0,5-item.stars))}</span>
     <span className="honor-certificate-footer">
      <SignatureStamp/>
      <span className="honor-certificate-open">عرض الشهادة كاملة <span aria-hidden="true">←</span></span>
     </span>
    </button>;
   })}
  </section>:<section className="honor-board-empty"><span>✦</span><strong>بانتظار أول لحظة تكريم</strong><p>ستظهر شهادات إنجازات الفريق هنا.</p></section>}

  {selected&&<div className="honor-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null);}}>
   {celebrating&&<div className="honor-golden-burst" aria-hidden="true">
    {burstStars.map((star,index)=><span key={index} style={{left:star.left,top:star.top,animationDelay:star.delay,fontSize:star.size+"px"}}>{index%3===0?"✦":"★"}</span>)}
   </div>}
   <section className="honor-modal" role="dialog" aria-modal="true" aria-labelledby="honor-modal-title">
    <button type="button" className="honor-modal-close" onClick={()=>setSelected(null)} aria-label="إغلاق الشهادة">×</button>
    <div className="honor-modal-certificate">
     <div className="honor-modal-ornament">✦ ━━━━━━━━━ ✦</div>
     <p className="honor-modal-kicker">PLATEAU CREW HUB · SPECIAL RECOGNITION</p>
     <p className="honor-modal-award">{selected.award}</p>
     <StudentPortrait name={selected.student_name} photo={findStudentPhoto(selected.student_name,crew,photoByUser)} large/>
     <p className="honor-modal-presented">تُمنح هذه الشهادة بكل فخر وتقدير إلى</p>
     <h2 id="honor-modal-title">{selected.student_name}</h2>
     <div className="honor-modal-achievement">{selected.achievement}</div>
     <div className="honor-modal-stars" aria-label={"التقييم "+selected.stars+" من 5"}>{"★".repeat(selected.stars)}{"☆".repeat(Math.max(0,5-selected.stars))}</div>
     <div className="honor-modal-message">
      <span>رسالة المشرفة</span>
      <p>{selected.note?.trim()||"لم تُضف رسالة تقدير لهذا التكريم."}</p>
     </div>
     <p className="honor-modal-date">تاريخ التكريم · {dateLabel(selected.created_at)}</p>
     <SignatureStamp/>
     <div className="honor-modal-bottom">WITH PRIDE · WITH APPRECIATION</div>
    </div>
    {supervisor&&<button type="button" className="honor-modal-delete" onClick={()=>void remove(selected.id)}>حذف هذا التكريم</button>}
   </section>
  </div>}
 </main>;
}
