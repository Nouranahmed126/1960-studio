"use client";
import MiniCinemaIcon from "./mini-cinema-icon";
import Link from "next/link";
import {useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
import {usePathname} from "next/navigation";

const sectionGroups=[
 {title:"Studio & Account",items:[["/","Home","tv"],["/recordings","Recordings","tv"],["/honor-board","Film Stars & Honors","tv"],["/vision","Film Vision","film"],["/dashboard","My Account","tv"],["/meetings","Meetings","tv"]]},
 {title:"Production Teams",items:[["/sectors","Teams & Departments","camera"],["/assignments","Assignments","clap"],["/production-hub","Production Hub","film"]]},
 {title:"Archive & Community",items:[["/gallery","Behind the Scenes","film"],["/museum","Museum Archive","tv"],["/submissions","Quick Submit","camera"],["/timeline","Timeline","film"],["/film","Crew Work","film"]]}
] as const;

export default function SiteNavigation(){
 const [open,setOpen]=useState(false);
 const [isSupervisor,setIsSupervisor]=useState(false);
 const path=usePathname();
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{
   const db=getSupabase();if(!db)return;let active=true;
   void db.auth.getUser().then(async({data:{user}})=>{
     if(!user)return;
     const p=await db.from("profiles").select("app_role").eq("id",user.id).single();
     if(active)setIsSupervisor(p.data?.app_role==="supervisor");
   });
   return()=>{active=false};
 },[]);
 return <>
   <button className={"site-menu-trigger"+(path==="/decor-studio"?" studio-character-menu":"")} aria-expanded={open} aria-controls="site-menu" onClick={()=>setOpen(!open)} aria-label="Open studio sections" title="Sections">‹</button>
   {open&&<>
     <div className="site-menu-shade" onClick={()=>setOpen(false)}/>
     <nav id="site-menu" className="site-menu-panel site-menu-compact" aria-label="Studio sections">
       <div className="site-menu-header"><strong>PLATEAU · SECTIONS</strong><button onClick={()=>setOpen(false)} aria-label="Close menu">✕</button></div>
       {sectionGroups.map(group=><section className="site-menu-group" key={group.title}><h2>{group.title}</h2><div className="site-menu-grid">{group.items.filter(([href])=>isSupervisor||href!=="/production-hub").map(([href,name,icon])=><Link key={href} href={href} prefetch onClick={()=>setOpen(false)} aria-current={path===href?"page":undefined}><span aria-hidden="true"><MiniCinemaIcon kind={icon} size={18}/></span><small>{href==="/dashboard"&&isSupervisor?"Executive Office":name}</small></Link>)}</div></section>)}
       <Link className="site-menu-login" href="/login" onClick={()=>setOpen(false)}>Sign in</Link>
     </nav>
   </>}
 </>;
}
