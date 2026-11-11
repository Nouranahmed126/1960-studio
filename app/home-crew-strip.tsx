"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
type Member={id:string;full_name:string};
type Detail={user_id:string;photo_path:string|null};
export default function HomeCrewStrip(){
 const [members,setMembers]=useState<Member[]>([]);
 const [photos,setPhotos]=useState<Record<string,string>>({});
 const [status,setStatus]=useState<"loading"|"ready"|"login"|"empty">("loading");
 useEffect(()=>{let active=true;(async()=>{const db=getSupabase();if(!db){setStatus("empty");return}
 const [crew,details]=await Promise.all([db.rpc("list_approved_crew"),db.from("crew_profiles").select("user_id,photo_path")]);
 if(!active)return;
 if(crew.error){setStatus("login");return}
 const paths=(details.data??[]) as Detail[];
 const urls:Record<string,string>={};
 for(const d of paths)if(d.photo_path)urls[d.user_id]=db.storage.from("crew-photos").getPublicUrl(d.photo_path).data.publicUrl;
 const photoOwners=new Set(Object.keys(urls));
 const unique=new Map<string,Member>();
 for(const m of (crew.data??[]) as Member[]){const key=m.full_name.trim().replace(/\s+/g," ").toLocaleLowerCase("ar");const prev=unique.get(key);if(!prev||(!photoOwners.has(prev.id)&&photoOwners.has(m.id)))unique.set(key,m)}
 setMembers([...unique.values()]);setPhotos(urls);setStatus(unique.size?"ready":"empty");
 })();return()=>{active=false}},[]);
 const entries=members.map(m=><a className="cinema-home-star-card" key={m.id} href="/crew" aria-label={m.full_name} title={m.full_name}>{photos[m.id]?<img src={photos[m.id]} alt={m.full_name} loading="lazy"/>:<span className="cinema-star-placeholder" aria-label={m.full_name}>🎬</span>}</a>);
 return <section className="cinema-home-stars cinema-loop-section" aria-label="نجوم 1960">
 <div className="cinema-loop-window cinema-stars-scroll-window" aria-label="شريط صور نجوم 1960، اسحب أفقيًا لاستعراض الصور" tabIndex={0}>
 {status==="ready"?<div className="cinema-loop-track cinema-loop-right" dir="ltr"><div className="cinema-loop-group">{entries}</div><div className="cinema-loop-group" aria-hidden="true">{entries}</div></div>:<div className="cinema-loop-message">{status==="loading"?"جارٍ تحميل صور نجوم 1960…":status==="login"?<>صور النجوم متاحة بعد <a href="/login">تسجيل الدخول</a></>:"صور النجوم هتظهر هنا بمجرد توفرها"}</div>}
 </div><small className="film-reel-caption">FILM STARS • 1960</small></section>
}