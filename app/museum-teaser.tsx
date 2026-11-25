"use client";
import {useEffect,useState} from "react";
import {signStudioImages} from "../lib/studio-media";
import {getSupabase} from "../lib/supabase-browser";
import MovingReel from "./moving-reel";
type P={id:number;title:string;image_path:string|null};
export default function MuseumTeaser(){
 const [items,setItems]=useState<{title:string;url:string}[]>([]);
 useEffect(()=>{let active=true;(async()=>{const db=getSupabase();if(!db)return;const r=await db.from("studio_props").select("id,title,image_path").not("image_path","is",null).order("created_at",{ascending:false}).limit(18);if(!active||r.error)return;const rows=(r.data||[]) as P[];const photos=await signStudioImages(db,"crew-photos",rows.map(row=>row.image_path));if(active)setItems(rows.flatMap(row=>{const url=photos.get(row.image_path??"");return url?[{title:row.title,url}]:[]}))})();return()=>{active=false}},[]);
 const render=(hidden:boolean)=>items.map((x,i)=>hidden?<span className="museum-teaser-card marquee-item" key={i}><img src={x.url} alt="" loading="eager" decoding="async"/></span>:<a key={i} href="/museum" className="museum-teaser-card marquee-item" title={x.title} aria-label={x.title}><img src={x.url} alt={x.title} loading="eager" decoding="async"/></a>);
 return <section className="museum-teaser cinema-loop-section" aria-label="متحف الفريق">{items.length?<MovingReel direction="left" label="صور متحف الفريق تتحرك يسارًا">{render(false)}</MovingReel>:<div className="cinema-loop-window marquee-wrapper"><div className="cinema-loop-group">{Array.from({length:8},(_,i)=><a href="/museum" className="marquee-item museum-teaser-card" key={i} aria-label="متحف الفريق">📻</a>)}</div><span className="cinema-loop-message">مقتنيات المتحف قيد التحميل</span></div>}<small className="film-reel-caption">PLATEAU · ARCHIVE</small></section>
}