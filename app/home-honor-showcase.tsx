"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
type Honor={id:number;student_name:string;achievement:string;award:string;stars:number;note:string|null;created_at:string};
const colors=["sapphire","emerald","amethyst","amber","pearl"];
export default function HomeHonorShowcase(){
 const [items,setItems]=useState<Honor[]>([]),[selected,setSelected]=useState<{item:Honor;index:number}|null>(null);
 useEffect(()=>{let alive=true;const db=getSupabase();if(!db)return;async function load(){const r=await db!.from("studio_honors").select("id,student_name,achievement,award,stars,note,created_at").order("created_at",{ascending:false}).limit(100);if(alive&&!r.error)setItems(r.data as Honor[])}void load();const channel=db.channel("home-honors-live").on("postgres_changes",{event:"*",schema:"public",table:"studio_honors"},()=>void load()).subscribe();return()=>{alive=false;void db.removeChannel(channel)}},[]);
 useEffect(()=>{if(!selected)return;function onKey(e:KeyboardEvent){if(e.key==="Escape")setSelected(null)}window.addEventListener("keydown",onKey);const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=old}},[selected]);
 if(!items.length)return null;
 return <><aside className="home-honor-grid-section" dir="rtl" aria-label="بطاقات تكريم نجوم 1960">
 <div className="honor-vertical-marquee" aria-label="بطاقات التكريم المتحركة">
  <div className="honor-vertical-track">
   {[0,1].map(copy=><div className="honor-vertical-set" key={copy} aria-hidden={copy===1}>
    {items.map((item,i)=>{const variant=/الأسبوع الأول|VIP/i.test(item.award)?4:i%5;return <button type="button" tabIndex={copy===1?-1:0} className={"honor-micro-card honor-micro-"+colors[variant]} key={item.id} onClick={()=>setSelected({item,index:variant})} aria-label={"عرض بطاقة تكريم "+item.student_name}>
     <span className="honor-micro-medal" aria-hidden="true">★</span><span className="honor-micro-name">{item.student_name}</span><span className="honor-micro-stars" aria-hidden="true">{"★".repeat(Math.min(5,Math.max(0,item.stars)))}{"☆".repeat(Math.max(0,5-item.stars))}</span>
    </button>})}
   </div>)}
  </div>
 </div>
 </aside>
 {selected&&<div className="home-honor-modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="home-honor-modal" role="dialog" aria-modal="true" aria-label={"بطاقة تكريم "+selected.item.student_name}><button type="button" className="home-honor-modal-close" onClick={()=>setSelected(null)} aria-label="إغلاق البطاقة">✕ إغلاق</button><div className={"honor-certificate honor-variant-"+selected.index}><div className="honor-certificate-inner"><div className="honor-card-top"><span className="honor-card-award">✦ {selected.item.award}</span><span className="honor-card-index">STUDIO 1960 · HONORS</span></div><div className="honor-medallion" aria-hidden="true">★</div><h3 className="honor-card-name">{selected.item.student_name}</h3><div className="honor-card-stars" aria-label={selected.item.stars+" من 5 نجوم"}>{"★".repeat(Math.min(5,Math.max(0,selected.item.stars)))}{"☆".repeat(Math.max(0,5-selected.item.stars))}</div><p className="honor-card-achievement">{selected.item.achievement}</p>{selected.item.note&&<p className="honor-card-note">«{selected.item.note}»</p>}<div className="honor-card-bottom"><div className="honor-gold-seal"><span className="honor-seal-heading">OFFICIAL HONOR</span><strong className="honor-seal-signature" lang="en" dir="ltr">Nouran Ahmed</strong><small className="honor-seal-role">Dr. · STUDIO 1960</small></div><div className="honor-card-date"><span>تكريم استثنائي</span><time dateTime={selected.item.created_at}>{new Date(selected.item.created_at).toLocaleDateString("ar-EG")}</time></div></div></div></div></div></div>}
 </>
}
