"use client";
import {useState} from "react";
import {usePathname} from "next/navigation";
const links=[["/submissions","التسليمات","📝"],["/honor-board","الشرف","🏆"],["/","الرئيسية","⌂"],["/crew","النجوم","⭐"],["/sectors","الفرق","🎬"],["/dashboard","حسابي","📋"],["/gallery","الكواليس","📸"],["/chat","الشات","💬"],["/files","الملفات","📂"],["/production-hub","الإنتاج","🎞️"],["/requests","الرسائل","✉️"]];
export default function SiteNavigation(){
const [open,setOpen]=useState(false);const path=usePathname();
return <><button className="site-menu-trigger" aria-expanded={open} aria-controls="site-menu" onClick={()=>setOpen(!open)}>☰ الأقسام</button>{open&&<><div className="site-menu-shade" onClick={()=>setOpen(false)}/><nav id="site-menu" className="site-menu-panel" aria-label="كل أقسام الموقع"><button onClick={()=>setOpen(false)}>✕ إغلاق</button>{links.map(([href,name,icon])=><a key={href} href={href} aria-current={path===href?"page":undefined}>{icon} {name}</a>)}<a href="/login">🔑 تسجيل الدخول</a></nav></>}<nav className="site-bottom-nav" aria-label="التنقل السريع"><div className="site-bottom-scroll">{links.map(([href,name,icon])=><a key={href} href={href} aria-current={path===href?"page":undefined}><span>{icon}</span><small>{name}</small></a>)}</div></nav></>;
}