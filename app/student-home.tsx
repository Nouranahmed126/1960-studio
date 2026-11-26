"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
type Crew={id:string;full_name:string};
type Keepsake={id:number;title:string;image_path:string|null};
type Honor={id:number;student_name:string};
export default function StudentHome({bannerData}:{bannerData:string}){
 const [crew,setCrew]=useState<Crew[]>([]),[keepsakes,setKeepsakes]=useState<{id:number;title:string;url:string}[]>([]),[honors,setHonors]=useState<Honor[]>([]);
 useEffect(()=>{let live=true;void(async()=>{const db=getSupabase();if(!db)return;const [c,k,h]=await Promise.all([db.rpc("list_approved_crew"),db.from("studio_props").select("id,title,image_path").order("created_at",{ascending:false}).limit(30),db.from("studio_honors").select("id,student_name").order("created_at",{ascending:false}).limit(30)]);if(!live)return;if(!c.error)setCrew((c.data??[]) as Crew[]);if(!k.error){const rows=(k.data??[]) as Keepsake[];setKeepsakes(rows.filter(x=>x.image_path).map(x=>({id:x.id,title:x.title,url:db.storage.from("crew-photos").getPublicUrl(x.image_path!).data.publicUrl})));}if(!h.error)setHonors((h.data??[]) as Honor[]);})();return()=>{live=false}},[]);
 const cards=[{href:"/timeline",icon:"🎬",title:"Timeline",desc:"Studio updates and crew activity"},{href:"/dashboard",icon:"📋",title:"Assignments",desc:"Tasks, deadlines and progress"},{href:"/submissions",icon:"☁️",title:"Quick Submit",desc:"Send files, voice notes or written work"},{href:"/crew",icon:"🏆",title:"Film Stars & Honors",desc:"Meet the crew and celebrate achievements"},{href:"/dashboard",icon:"👤",title:"My Account",desc:"Your profile and personal submissions"}];
 return <main className="student-home-old" dir="ltr">
  <img className="old-banner" src={bannerData} alt="Plateau Crew Hub — Crafted together, frame by frame"/>
  <div className="old-divider"/>
  <section className="old-main-grid" aria-label="Student guide">
   {cards.map((c,i)=><Link key={c.title} href={c.href} className="old-main-card">
    <span className="old-card-number">0{i+1}</span>{i===4&&<span className="old-crown">♛</span>}
    <span className="old-card-icon">{c.icon}</span><span className="old-card-copy"><strong>{c.title}</strong><small>{c.desc}</small></span><span className="old-card-arrow">↗</span>
   </Link>)}
  </section>
  <section className="old-strip"><div className="old-strip-title"><span>→</span> Studio Crew</div><div className="old-strip-track" dir="rtl">{crew.map(x=><span className="old-name-pill" key={x.id}>{x.full_name}</span>)}</div></section>
  <section className="old-strip"><div className="old-strip-title"><span>←</span> 1960<br/>Keepsakes</div><div className="old-strip-track">{keepsakes.map(x=><Link href="/museum" className="old-keepsake" key={x.id} title={x.title}><img src={x.url} alt={x.title}/></Link>)}</div></section>
  <section className="old-strip"><div className="old-strip-title"><span>→</span> Honors</div><div className="old-strip-track" dir="rtl">{honors.map(x=><span className="old-name-pill" key={x.id}>{x.student_name}</span>)}</div></section>
  <footer className="old-footer"><div><small>ACADEMIC SUPERVISION</small><strong>Dr. Ahmed Abdelmoneim</strong></div><div><small>DESIGNED & DEVELOPED BY</small><strong>Nouran Ahmed</strong></div><div className="old-star">✦</div></footer>
 </main>;
}
