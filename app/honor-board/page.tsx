"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {createPortal} from "react-dom";
import {getAuthUser,getPublicSupabase,getSupabase} from "../../lib/supabase-browser";

type Honor={id:number;student_name:string;achievement:string;award:string;stars:number;note:string|null;created_at:string};
type CrewMember={id:string;full_name:string;created_at?:string};
type PhotoRow={user_id:string;photo_path:string|null};

const burstStars=Array.from({length:44},(_,i)=>({
 left:(2+(i*47)%96)+"%",
 top:(3+(i*53)%91)+"%",
 delay:(i%9)*65+"ms",
 duration:(3.2+(i%5)*0.18)+"s",
 size:17+(i%5)*5
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
 return <div className="honor-signature-lockup" dir="ltr">
  <span className="honor-signature-caption">SIGNED &amp; APPROVED BY</span>
  <strong className="honor-signature-script">Dr. Nouran Ahmed</strong>
  <span className="honor-signature-role">TEACHING ASSISTANT &amp; SUPERVISOR</span>
 </div>;
}

function StudentPortrait({name,photo}:{name:string;photo:string|null}){
 return <div className="honor-student-portrait">
  {photo?<img src={photo} alt={"صورة "+name} loading="lazy"/>:<span aria-hidden="true">{name.trim().slice(0,1)||"✦"}</span>}
 </div>;
}

function GoldenStar({index,star}:{index:number;star:(typeof burstStars)[number]}){
 const gradientId="honor-gold-star-"+index;
 return <span className="honor-page-star" style={{left:star.left,top:star.top,animationDelay:star.delay,animationDuration:star.duration,width:star.size,height:star.size}} aria-hidden="true">
  <svg viewBox="0 0 100 100" focusable="false">
   <defs>
    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
     <stop offset="0%" stopColor="#fff9ce"/>
     <stop offset="28%" stopColor="#ffe58a"/>
     <stop offset="58%" stopColor="#d89b27"/>
     <stop offset="82%" stopColor="#fff0a8"/>
     <stop offset="100%" stopColor="#a66b16"/>
    </linearGradient>
   </defs>
   <polygon points="50,3 62,36 97,37 69,59 79,94 50,73 21,94 31,59 3,37 38,36" fill={"url(#"+gradientId+")"} stroke="#fff0ad" strokeWidth="3" strokeLinejoin="round"/>
   <path d="M50 13 L59 39 L86 40 L65 57 L72 82 L50 66 L28 82 L35 57 L14 40 L41 39 Z" fill="none" stroke="#fff8d8" strokeWidth="1.5" opacity=".9"/>
   <circle cx="50" cy="50" r="5" fill="#fffbe4"/>
  </svg>
 </span>;
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
 const [celebrating,setCelebrating]=useState(false);
 const [mounted,setMounted]=useState(false);

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
  setMounted(true);
  setCelebrating(true);
  const timer=window.setTimeout(()=>setCelebrating(false),4400);
  return()=>window.clearTimeout(timer);
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
  if(!window.confirm("هل تريدين حذف شهادة التكريم هذه؟"))return;
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
   setStatus("تم حذف التكريم.");
   await load();
  }
 }

 const burstLayer=mounted&&celebrating?createPortal(
  <div className="honor-page-star-burst" aria-hidden="true">
   {burstStars.map((star,index)=><GoldenStar key={index} index={index} star={star}/>)}
  </div>,
  document.body
 ):null;

 return <>
  {burstLayer}
  <main dir="rtl" className="honor-board-page">
   <a href="/" className="honor-board-back">← الرئيسية</a>
   <header className="honor-board-header">
    <p className="honor-board-eyebrow">PLATEAU CREW HUB · FILM STARS &amp; HONORS</p>
    <h1 className="honor-board-title">🏆 لوحة شرف الفريق</h1>
    <p className="honor-board-subtitle">إنجازك يستحق التقدير، وهذه لحظتك لتتألقي ✨</p>
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
     <span>اسم الطالب أو الطالبة</span>
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
     <textarea maxLength={1200} rows={4} placeholder="اكتبي كلمات التقدير التي ستظهر كاملة في الشهادة..." value={note} onChange={event=>setNote(event.target.value)}/>
    </label>
    <button className="honor-publish-button" type="submit">نشر شهادة التكريم ⭐</button>
   </form>}

   {items.length>0?<section className="honor-board-certificates" aria-label="شهادات تكريم الفريق">
    {items.map(item=>{
     const photo=findStudentPhoto(item.student_name,crew,photoByUser);
     const rating=Math.max(0,Math.min(5,Number(item.stars)||0));
     return <article className="honor-landscape-certificate" key={item.id}>
      <header className="honor-certificate-header">
       <div className="honor-certificate-brand">
        <span className="honor-brand-star" aria-hidden="true">✦</span>
        <span>PLATEAU CREW HUB</span>
        <small>CERTIFICATE OF HONOR</small>
       </div>
       <span className="honor-certificate-award">✧ {item.award} ✧</span>
      </header>

      <div className="honor-certificate-body">
       <section className="honor-certificate-recipient">
        <StudentPortrait name={item.student_name} photo={photo}/>
        <p className="honor-certificate-presented">تُمنح هذه الشهادة بكل فخر وتقدير إلى</p>
        <h2>{item.student_name}</h2>
        <p className="honor-certificate-achievement">{item.achievement}</p>
        <div className="honor-certificate-stars" aria-label={"التقييم "+rating+" من 5"}>
         {Array.from({length:5},(_,index)=><span key={index} className={index<rating?"is-filled":""}>★</span>)}
        </div>
       </section>

       <section className="honor-certificate-appreciation">
        <div className="honor-appreciation-heading"><span>✦</span> رسالة تقدير خاصة <span>✦</span></div>
        <p className="honor-certificate-note">{item.note?.trim()||"لم تُضف رسالة تقدير خاصة لهذا التكريم بعد."}</p>
        <div className="honor-certificate-approval">
         <div className="honor-certificate-date">
          <small>تاريخ التكريم</small>
          <strong>{dateLabel(item.created_at)}</strong>
         </div>
         <SignatureStamp/>
        </div>
       </section>
      </div>

      <footer className="honor-certificate-footer">
       <span>WITH PRIDE · WITH APPRECIATION</span>
       <span>EVERY ACHIEVEMENT DESERVES TO SHINE</span>
      </footer>
      {supervisor&&<button type="button" className="honor-certificate-delete" onClick={()=>void remove(item.id)}>حذف هذا التكريم</button>}
     </article>;
    })}
   </section>:<section className="honor-board-empty"><span>✦</span><strong>بانتظار أول لحظة تكريم</strong><p>ستظهر شهادات إنجازات الفريق هنا.</p></section>}
  </main>
 </>;
}
