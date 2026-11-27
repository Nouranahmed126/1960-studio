"use client";
import {useEffect,useState} from "react";
import {getAuthUser,getSupabase} from "../../lib/supabase-browser";

type Assignment={id:number;title:string;description:string|null;due_at:string|null;created_at:string};

type DueInfo={short:string;full:string;expired:boolean};
function getDueInfo(value:string|null):DueInfo{
 if(!value)return {short:"موعد مفتوح",full:"لم يتم تحديد موعد نهائي لهذا التكليف.",expired:false};
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return {short:"موعد مفتوح",full:"لم يتم تحديد موعد نهائي لهذا التكليف.",expired:false};
 const expired=date.getTime()<Date.now();
 return {
  short:(expired?"انتهى الموعد · ":"آخر موعد · ")+date.toLocaleDateString("ar-EG",{day:"numeric",month:"short"}),
  full:date.toLocaleString("ar-EG",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"numeric",minute:"2-digit"}),
  expired
 };
}

export default function AssignmentsPage(){
 const [items,setItems]=useState<Assignment[]>([]);
 const [openId,setOpenId]=useState<number|null>(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [access,setAccess]=useState<"checking"|"student"|"supervisor"|"pending"|"error">("checking");

 useEffect(()=>{
  let active=true;
  async function load(){
   const db=getSupabase();
   if(!db){setAccess("error");setMessage("تعذر الاتصال بقاعدة البيانات.");setLoading(false);return;}
   const {data:{user},error:authError}=await getAuthUser();
   if(!active)return;
   if(authError||!user){
    window.location.replace("/login?next=%2Fassignments");
    return;
   }

   const profile=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).maybeSingle();
   if(!active)return;
   if(profile.error||!profile.data){
    setAccess("error");
    setMessage("تعذر التحقق من الحساب. حاولي تحديث الصفحة.");
    setLoading(false);
    return;
   }
   const supervisor=profile.data.app_role==="supervisor";
   if(!supervisor&&profile.data.approval_status!=="approved"){
    setAccess("pending");
    setLoading(false);
    return;
   }
   setAccess(supervisor?"supervisor":"student");

   // Supabase RLS returns only assignments linked to the signed-in student's teams.
   const result=await db.from("assignments")
    .select("id,title,description,due_at,created_at")
    .is("archived_at",null)
    .order("created_at",{ascending:false})
    .limit(100);
   if(!active)return;
   if(result.error){
    setAccess("error");
    setMessage("تعذر تحميل التكليفات: "+result.error.message);
   }else{
    setItems((result.data??[]) as Assignment[]);
   }
   setLoading(false);
  }
  void load();
  return()=>{active=false};
 },[]);

 return <main className="assignments-page" dir="rtl">
  <a href="/dashboard" className="assignments-back">← العودة للوحة الحساب</a>
  <header className="assignments-hero">
   <p className="assignments-eyebrow">PLATEAU CREW HUB · ASSIGNMENTS</p>
   <h1>التكاليف المطلوبة</h1>
   <p className="assignments-intro">التكليفات المخصصة لك ولفريقك. افتح أي تكليف لقراءة التفاصيل وموعد التسليم.</p>
   {!loading&&access!=="pending"&&access!=="error"&&<span className="assignments-count">{items.length} تكليف متاح</span>}
  </header>

  {loading&&<p className="assignments-feedback">جارٍ تحميل التكليفات...</p>}
  {access==="pending"&&!loading&&<section className="assignments-empty"><strong>حسابك في انتظار الاعتماد</strong><p>ستظهر التكليفات هنا بعد اعتماد حسابك وربطك بفرق العمل.</p></section>}
  {message&&<p className="assignments-feedback" role="alert">{message}</p>}

  {!loading&&access!=="pending"&&access!=="error"&&items.length===0&&
   <section className="assignments-empty"><strong>لا توجد تكليفات نشطة حاليًا</strong><p>عندما يتم نشر تكليف جديد للفريق، سيظهر هنا تلقائيًا.</p></section>}

  {!loading&&items.length>0&&
   <section className="assignments-accordion-list" aria-label="قائمة التكليفات">
    {items.map((item,index)=>{
     const expanded=openId===item.id;
     const due=getDueInfo(item.due_at);
     return <article className={"assignment-accordion"+(expanded?" is-open":"")} key={item.id}>
      <button
       type="button"
       className="assignment-accordion-trigger"
       aria-expanded={expanded}
       aria-controls={"assignment-panel-"+item.id}
       onClick={()=>setOpenId(current=>current===item.id?null:item.id)}
      >
       <span className="assignment-index">{String(index+1).padStart(2,"0")}</span>
       <span className="assignment-trigger-copy">
        <strong>{item.title}</strong>
        <span className={"assignment-due-badge"+(due.expired?" is-past":"")}>{due.short}</span>
       </span>
       <span className="assignment-chevron" aria-hidden="true">⌄</span>
      </button>
      <div id={"assignment-panel-"+item.id} className="assignment-accordion-panel" aria-hidden={!expanded}>
       <div className="assignment-accordion-panel-inner">
        <div className="assignment-details">
         <p className="assignment-description">{item.description?.trim()||"لا توجد تفاصيل إضافية لهذا التكليف."}</p>
         <div className="assignment-due-row">
          <span>موعد التسليم</span>
          <strong>{due.full}</strong>
         </div>
        </div>
       </div>
      </div>
     </article>;
    })}
   </section>}
 </main>;
}
