"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase-browser";
type Honor={id:number;student_name:string;achievement:string;award:string;stars:number;note:string|null;created_at:string};
const colors=["sapphire","emerald","amethyst","amber","pearl"];
export default function HomeHonorShowcase(){
 const [items,setItems]=useState<Honor[]>([]);
 useEffect(()=>{let alive=true;const db=getSupabase();if(!db)return;async function load(){const r=await db!.from("studio_honors").select("id,student_name,achievement,award,stars,note,created_at").order("created_at",{ascending:false}).limit(100);if(alive&&!r.error)setItems(r.data as Honor[])}void load();const channel=db.channel("home-honors-live").on("postgres_changes",{event:"*",schema:"public",table:"studio_honors"},()=>void load()).subscribe();return()=>{alive=false;void db.removeChannel(channel)}},[]);
 if(!items.length)return null;
 return <section className="home-honor-grid-section" dir="rtl" aria-label="منصة تتويج نجوم 1960">
 <p className="home-honor-grid-eyebrow">THE GOLDEN SPOTLIGHT · STUDIO 1960</p><h2>🏆 منصة تتويج نجوم 1960</h2><p className="home-honor-grid-subtitle">كل بطاقة حكاية نجاح… والدور الجاي عليك ✨</p>
 <div className="home-honor-grid">{items.map((item,i)=>{const variant=/الأسبوع الأول|VIP/i.test(item.award)?4:i%5;return <article className={"home-honor-mini home-honor-mini-"+colors[variant]} key={item.id}><div className="home-honor-mini-top"><span>✦ {item.award}</span><span lang="en">1960 · HONORS</span></div><span className="home-honor-mini-medal" aria-hidden="true">★</span><h3>{item.student_name}</h3><div className="home-honor-mini-stars" aria-label={item.stars+" من 5 نجوم"}>{"★".repeat(Math.min(5,Math.max(0,item.stars)))}{"☆".repeat(Math.max(0,5-item.stars))}</div><p className="home-honor-mini-achievement">{item.achievement}</p><div className="home-honor-mini-bottom"><span className="home-honor-mini-signature" lang="en" dir="ltr">Nouran Ahmed</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("ar-EG")}</time></div><a className="home-honor-mini-link" href="/honor-board" aria-label={"عرض بطاقة تكريم "+item.student_name+" كاملة"}>مشاهدة البطاقة كاملة والختم الذهبي ←</a></article>})}</div>
 <a className="home-honor-grid-all" href="/honor-board">🏆 عرض جميع بطاقات التكريم بالتفاصيل والختم الذهبي</a>
 </section>
}
