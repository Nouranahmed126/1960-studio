"use client";
import {useEffect,useState} from "react";
type Answer="yes"|"no"|null;
const storageKey="studio1960-assignment-checkin";
export default function AssignmentCheckin(){
 const [answer,setAnswer]=useState<Answer>(null);
 useEffect(()=>{try{const saved=window.localStorage.getItem(storageKey);if(saved==="yes"||saved==="no")setAnswer(saved)}catch{}},[]);
 function choose(value:Exclude<Answer,null>){setAnswer(value);try{window.localStorage.setItem(storageKey,value)}catch{}}
 return <section className="assignment-checkin" aria-label="سؤال التكليفات" dir="rtl">
 <span className="assignment-checkin-eyebrow">STUDIO 1960 · DAILY CHECK-IN</span>
 <div className="assignment-checkin-star" aria-hidden="true">✦</div>
 <h2>خلصت تكليفاتك؟ 🎬</h2>
 <p>طمنينا على إنجازك… كل خطوة بتقرّبنا من فيلم أقوى.</p>
 <div className="assignment-checkin-actions"><button type="button" className={answer==="yes"?"selected":""} onClick={()=>choose("yes")} aria-pressed={answer==="yes"}>✓ أيوه، خلصت</button><button type="button" className={answer==="no"?"selected":""} onClick={()=>choose("no")} aria-pressed={answer==="no"}>لسه مخلصتش</button></div>
 {answer&&<div className="assignment-checkin-feedback" role="status">{answer==="yes"?"🌟 برافو عليك! استمر في تميزك ومجهودك العظيم… فخورين بيك!":"🎬 مستني إيه؟ يلا كمّل تكليفك عشان د/ نوران تفرح بشغلك! لسه عندك فرصة تبدع ✨"}</div>}
 <small>ده سؤال تحفيزي ليك، مش تسجيل تسليم رسمي أو تقييم.</small>
 </section>
}