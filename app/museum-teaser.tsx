"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
type P={id:number;title:string;image_path:string|null};
export default function MuseumTeaser(){
 const [items,setItems]=useState<{title:string;url:string}[]>([]);
 useEffect(()=>{let active=true;(async()=>{const db=getSupabase();if(!db)return;const r=await db.from("studio_props").select("id,title,image_path").not("image_path","is",null).order("created_at",{ascending:false}).limit(18);if(!active||r.error)return;setItems(((r.data||[]) as P[]).filter(x=>x.image_path).map(x=>({title:x.title,url:db.storage.from("crew-photos").getPublicUrl(x.image_path!).data.publicUrl})))})();return()=>{active=false}},[]);
 const render=(hidden:boolean)=>items.map((x,i)=>hidden?<span className="museum-teaser-card" key={i}><img src={x.url} alt="" loading="eager" decoding="async"/></span>:<a key={i} href="/museum" className="museum-teaser-card" title={x.title} aria-label={x.title}><img src={x.url} alt={x.title} loading="eager" decoding="async"/></a>);
 return <section className="museum-teaser cinema-loop-section" aria-label="متحف 1960"><div className="cinema-loop-window">{items.length?<div className="cinema-loop-track cinema-loop-left" dir="ltr"><div className="cinema-loop-group">{render(false)}</div><div className="cinema-loop-group" aria-hidden="true">{render(true)}</div></div>:<div className="cinema-loop-message">صور المتحف هتظهر هنا عند تحميلها</div>}</div><small className="film-reel-caption">MUSEUM ARCHIVE • 1960</small></section>
}