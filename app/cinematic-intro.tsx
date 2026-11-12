"use client";
import {useEffect,useState} from "react";
export default function CinematicIntro(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{try{setVisible(sessionStorage.getItem("studio1960-intro-seen")!=="1")}catch{setVisible(false)}},[]);
 function enter(){try{sessionStorage.setItem("studio1960-intro-seen","1")}catch{}setVisible(false)}
 if(!visible)return null;
 return <div className="cinematic-intro" role="dialog" aria-modal="true" aria-label="افتتاح استوديو 1960" dir="rtl">
 <div className="cinematic-intro-beam" aria-hidden="true"/><div className="cinematic-intro-content">
 <div className="cinematic-intro-lens" aria-hidden="true"><span>1960</span></div>
 <p className="cinematic-intro-overline">A CINEMATIC GRADUATION PROJECT</p>
 <h1>STUDIO <em>1960</em></h1><p className="cinematic-intro-subtitle">مشروع التخرج</p>
 <p className="cinematic-intro-supervision">الإشراف الأكاديمي على الفيلم: د/ أحمد عبدالمنعم</p>
 <div className="cinematic-intro-signature"><strong>فكرة وتصميم وتطوير المنصة: نوران أحمد</strong><small>Platform Created & Designed by Nouran Ahmed</small></div>
 <button type="button" className="cinematic-intro-enter" onClick={enter}>🎬 دخول الاستوديو</button>
 <p className="cinematic-intro-note">واجهة افتتاحية تظهر مرة واحدة خلال الجلسة</p>
 </div></div>
}