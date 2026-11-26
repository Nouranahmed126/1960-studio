"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";

type Destination={href:string;icon:string;title:string;description:string;tag?:string};
const slides:{eyebrow:string;title:string;description:string;items:Destination[]}[]=[
 {eyebrow:"ابدأ رحلتك",title:"كل اللي تحتاجه في مكان واحد",description:"اختار وجهتك مباشرة. كل قسم هيفتح لك مساحة العمل الخاصة بيه.",items:[
  {href:"/dashboard",icon:"📋",title:"تكليفاتي ومتابعتي",description:"شوف المطلوب منك، المواعيد، وحالة تقدمك.",tag:"ابدأ من هنا"},
  {href:"/submissions",icon:"📤",title:"سلّم شغلك",description:"ارفع ملفاتك وصورك وفيديوهاتك أو سجّل شرحك الصوتي."},
  {href:"/sectors",icon:"🎬",title:"فريقي وأقسام الفيلم",description:"ادخل فريقك، تابع التكليفات وتواصل مع زملائك."},
  {href:"/timeline",icon:"📰",title:"آخر أخبار الفريق",description:"تابع الإعلانات والتحديثات والكواليس الجديدة."}
 ]},
 {eyebrow:"الفريق والإنجازات",title:"عيش التجربة مع فريقك",description:"اتعرّف على زملائك، وشوف رحلة الفيلم والإنجازات اللي بنحققها مع بعض.",items:[
  {href:"/crew",icon:"⭐",title:"نجوم الفريق",description:"تعرّف على أعضاء الطاقم وأدوارهم."},
  {href:"/honor-board",icon:"🏆",title:"لوحة الشرف",description:"شوف التكريمات والإنجازات المميزة."},
  {href:"/museum",icon:"🎞️",title:"متحف الفريق",description:"ذكريات ومحطات من رحلة العمل."},
  {href:"/gallery",icon:"📸",title:"الكواليس والمعرض",description:"صور وفيديوهات ومشاهد من وراء الكاميرا."}
 ]},
 {eyebrow:"التنظيم والتواصل",title:"خليك دايمًا على اطلاع",description:"كل أدوات تنظيم الرحلة ومواعيدها في متناول إيدك.",items:[
  {href:"/production-hub",icon:"🎬",title:"غرفة عمليات الإنتاج",description:"تابع مراحل الفيلم وخطة العمل والإعلانات."},
  {href:"/meetings",icon:"📅",title:"الاجتماعات والمواعيد",description:"راجع مواعيد الاجتماعات والتفاصيل المهمة."},
  {href:"/requests",icon:"💬",title:"الطلبات والاستفسارات",description:"قدّم طلبك أو تابع استفساراتك."},
  {href:"/dashboard",icon:"👤",title:"حسابي الشخصي",description:"بياناتك، تقدمك، وتسليماتك."}
 ]}
];

export default function StudentHome(){
 const track=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState(0);
 const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{
  const node=track.current;if(!node)return;
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting){const index=Number((entry.target as HTMLElement).dataset.slide);if(Number.isFinite(index))setActive(index);}}
  },{root:node,threshold:.65});
  Array.from(node.children).forEach(el=>observer.observe(el));
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  let alive=true;
  import("../lib/supabase-browser").then(({getSupabase})=>{const db=getSupabase();if(!db)return;db.auth.getUser().then(({data})=>{if(alive)setSignedIn(!!data.user)});});
  return()=>{alive=false};
 },[]);
 function go(index:number){const next=Math.max(0,Math.min(slides.length-1,index));track.current?.children[next]?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});setActive(next);}
 return <main className="student-home" dir="rtl">
  <header className="student-home-topbar">
   <Link href="/" className="student-home-brand" aria-label="Plateau Crew Hub - الرئيسية"><span className="student-home-brand-mark">🎬</span><span><strong>PLATEAU CREW HUB</strong><small>ONE CREW · ONE VISION</small></span></Link>
   <div className="student-home-top-actions"><span className="student-home-status"><i/> مساحة الفريق الإبداعي</span><Link href={signedIn?"/dashboard":"/login"} className="student-home-account">{signedIn?"حسابي الشخصي":"تسجيل الدخول"} <span>←</span></Link></div>
  </header>
  <div className="student-home-workspace">
   <div className="student-home-side-label"><span>دليل الطالب</span><b>0{active+1}</b><span className="student-home-side-rule"/></div>
   <div className="student-home-track" ref={track} dir="rtl" aria-label="صفحات دليل الطالب">
    {slides.map((slide,index)=><section className="student-home-slide" data-slide={index} key={slide.title} dir="rtl" aria-label={slide.title}>
      <div className="student-home-slide-copy"><span className="student-home-eyebrow"><i/> {slide.eyebrow}</span><h1>{slide.title}</h1><p>{slide.description}</p></div>
      <div className="student-home-tiles">
       {slide.items.map((item,i)=><Link href={item.href} key={item.title} className="student-home-tile">
        <span className="student-home-tile-number">0{i+1}</span><span className="student-home-tile-icon" aria-hidden="true">{item.icon}</span>
        <span className="student-home-tile-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
        {item.tag&&<span className="student-home-tile-tag">{item.tag}</span>}<span className="student-home-tile-arrow" aria-hidden="true">←</span>
       </Link>)}
      </div>
     </section>)}
   </div>
   <div className="student-home-controls" aria-label="التنقل بين صفحات الدليل">
    <button type="button" onClick={()=>go(active+1)} disabled={active===slides.length-1} aria-label="الصفحة التالية">←</button>
    <div className="student-home-dots">{slides.map((s,i)=><button key={s.title} type="button" onClick={()=>go(i)} className={active===i?"is-active":""} aria-label={"الانتقال إلى "+s.eyebrow} aria-current={active===i?"step":undefined}/>)}</div>
    <span className="student-home-page-count">0{active+1} / 0{slides.length}</span>
    <button type="button" onClick={()=>go(active-1)} disabled={active===0} aria-label="الصفحة السابقة">→</button>
   </div>
  </div>
  <footer className="student-home-footer"><span>PLATEAU CREW HUB</span><span>اسحب يمين أو شمال للتنقل بين الدليل <b>↔</b></span><span>قصة بنبنيها سوا</span></footer>
 </main>;
}
