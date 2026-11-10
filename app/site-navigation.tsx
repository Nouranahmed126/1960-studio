"use client";
import MiniCinemaIcon from "./mini-cinema-icon";
import {useState} from "react";
import {usePathname} from "next/navigation";
const groups=[
{title:"الإدارة والقيادة",links:[["/","الرئيسية","⌂"],["/dashboard","حسابي","👤"],["/honor-board","الشرف","🏆"],["/crew","النجوم","⭐"],["/meetings","الاجتماعات","📅"]]},
{title:"أقسام الفيلم",links:[["/teams/5","الكتابة والسيناريو","✍️"],["/teams/3","التصوير والإخراج","🎥"],["/teams/4","المونتاج","🎞️"],["/teams/1","التصميم والصوت","🎨"],["/teams/2","الإنتاج والممثلين","🎬"]]},
{title:"الأرشيف والتواصل",links:[["/museum","متحف 1960","📻"],["/gallery","الكواليس","📸"],["/chat","الشات","💬"],["/requests","الرسائل","✉️"],["/production-hub","الإنتاج","🎬"],["/submissions","التسليمات","📥"]]}
] as const;
const quick=[["/","الرئيسية","⌂"],["/sectors","الفرق","🎬"],["/dashboard","حسابي","👤"],["/gallery","الكواليس","📸"],["/chat","الشات","💬"]] as const;
export default function SiteNavigation(){
 const [open,setOpen]=useState(false);const path=usePathname();
 return <><button className={"site-menu-trigger"+(path==="/decor-studio"?" studio-character-menu":"")} aria-expanded={open} aria-controls="site-menu" onClick={()=>setOpen(!open)} aria-label="فتح قائمة الأقسام" title="الأقسام">‹</button>{open&&<><div className="site-menu-shade" onClick={()=>setOpen(false)}/><nav id="site-menu" className="site-menu-panel site-menu-compact" aria-label="كل أقسام الموقع"><div className="site-menu-header"><strong>1960 · أقسام الاستوديو</strong><button onClick={()=>setOpen(false)} aria-label="إغلاق القائمة">✕</button></div>{groups.map(group=><section className="site-menu-group" key={group.title}><h2>{group.title}</h2><div className="site-menu-grid">{group.links.map(([href,name,icon])=><a key={href} href={href} onClick={()=>setOpen(false)} aria-current={path===href?"page":undefined}><span aria-hidden="true"><MiniCinemaIcon kind={href.includes("teams/3")||href==="/production-hub"?"camera":href.includes("teams/4")||href==="/gallery"?"film":href==="/chat"||href==="/requests"?"radio":href.includes("teams/")?"clap":"tv"} size={17}/></span><small>{name}</small></a>)}</div></section>)}<a className="site-menu-login" href="/login">🔑 تسجيل الدخول</a></nav></>}<nav className="site-bottom-nav" aria-label="التنقل السريع"><div className="site-bottom-scroll">{quick.map(([href,name,icon])=><a key={href} href={href} aria-current={path===href?"page":undefined}><span><MiniCinemaIcon kind={href==="/sectors"?"camera":href==="/gallery"?"film":href==="/chat"?"radio":"tv"} size={19}/></span><small>{name}</small></a>)}</div></nav></>;
}