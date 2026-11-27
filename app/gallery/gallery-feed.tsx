"use client";
import {useEffect,useState,type FormEvent} from "react";
import { getAuthUser, getSupabase } from "../../lib/supabase-browser";
import "./gallery-clean.css";
type Item={id:number;title:string;description:string|null;storage_path:string;mime_type:string;created_at:string;category:"reference"|"behind_scenes";carousel_id:string|null;carousel_position:number|null};
export default function Gallery(){
 const [items,setItems]=useState<Item[]>([]),[urls,setUrls]=useState<Record<number,string>>({});
 const [category,setCategory]=useState<"reference"|"behind_scenes">("behind_scenes"),[filter,setFilter]=useState<"reference"|"behind_scenes">("behind_scenes");
 const [supervisor,setSupervisor]=useState(false),[canPost,setCanPost]=useState(false),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("جارٍ تحميل المعرض...");
 const [composerOpen,setComposerOpen]=useState(false);
 async function load(){
  const db=getSupabase();if(!db){setMessage("الاتصال غير متاح.");return;}
  const {data:{user}}=await getAuthUser();if(!user){window.location.replace("/login?next=%2Fgallery");return;}
  const p=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).single();
  if(p.error||!p.data){setMessage("تعذر التحقق من صلاحية الحساب.");return;}
  if(p.data.app_role!=="supervisor"&&p.data.approval_status!=="approved"){setMessage("المعرض متاح بعد موافقة المشرفة على الحساب.");return;}
  setSupervisor(p.data.app_role==="supervisor");setCanPost(true);
  const result=await db.from("project_gallery").select("id,title,description,storage_path,mime_type,created_at,category,carousel_id,carousel_position").order("created_at",{ascending:false}).limit(100);
  if(result.error){setMessage("تعذر تحميل المعرض.");return;}
  const list=((result.data??[]) as Item[]).filter(item=>item.id!==1&&item.id!==2);setItems(list);
  const signed=await Promise.all(list.map(async item=>{const {data}=await db.storage.from("studio-gallery").createSignedUrl(item.storage_path,3600);return [item.id,data?.signedUrl??""] as const;}));
  setUrls(Object.fromEntries(signed));setMessage("");
 }
 useEffect(()=>{void load();},[]);
 const supported=["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
 function chooseFiles(selected:FileList|null){const next=Array.from(selected??[]);if(next.length>10){setMessage("الحد الأقصى 10 ملفات لكل منشور.");return;}setFiles(next);setMessage("");}
 function move(from:number,to:number){setFiles(prev=>{const a=[...prev];if(to<0||to>=a.length)return prev;const [f]=a.splice(from,1);a.splice(to,0,f);return a;});}
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const db=getSupabase();if(!db||!files.length||!canPost||!title.trim())return;
  if(files.some(f=>f.size===0||f.size>52428800||!supported.includes(f.type))){setMessage("كل ملف لازم يكون بصيغة مدعومة وحجمه لا يتجاوز 50 ميجابايت.");return;}
  setBusy(true);setMessage("جارٍ تجهيز الملفات...");
  const {data:{user}}=await getAuthUser();if(!user){setBusy(false);setMessage("سجلي الدخول مرة أخرى.");return;}
  const uploaded:string[]=[];const group=files.length>1?crypto.randomUUID():null;
  try{
   const records=[];
   for(let i=0;i<files.length;i++){
    const f=files[i],ext=f.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
    const path=supervisor?"gallery/"+crypto.randomUUID()+"."+ext:"bts/"+user.id+"/"+crypto.randomUUID()+"."+ext;
    setMessage("جارٍ رفع "+(i+1)+" من "+files.length+"...");
    const up=await db.storage.from("studio-gallery").upload(path,f,{contentType:f.type,upsert:false});
    if(up.error)throw new Error("تعذر رفع الملف رقم "+(i+1)+": "+up.error.message);
    uploaded.push(path);
    records.push({title:title.trim(),description:description.trim()||null,storage_path:path,mime_type:f.type,created_by:user.id,category:supervisor?category:"behind_scenes",carousel_id:group,carousel_position:group?i:null});
   }
   const saved=await db.from("project_gallery").insert(records);
   if(saved.error)throw new Error("تعذر حفظ المنشور: "+saved.error.message);
   setTitle("");setDescription("");setFiles([]);
   const input=document.getElementById("gallery-file") as HTMLInputElement|null;if(input)input.value="";
   setComposerOpen(false);setFilter(supervisor?category:"behind_scenes");
   await load();setMessage("تم النشر بنجاح.");
  }catch(err){
   if(uploaded.length)await db.storage.from("studio-gallery").remove(uploaded);
   setMessage(err instanceof Error?err.message:"حدث خطأ أثناء النشر. حاولي مرة أخرى.");
  }finally{setBusy(false);}
 }
 const groups=items.reduce<{key:string;members:Item[]}[]>((all,item)=>{const key=item.carousel_id??"single-"+item.id;let g=all.find(x=>x.key===key);if(!g){g={key,members:[]};all.push(g);}g.members.push(item);return all;},[]);
 groups.forEach(g=>g.members.sort((a,b)=>(a.carousel_position??0)-(b.carousel_position??0)));
 const visibleGroups=groups.filter(group=>group.members[0].category===filter);
 return <main className="pch-gallery" dir="rtl">
  <header className="pch-gallery-head" dir="ltr">
   <a className="pch-gallery-back" href="/" aria-label="Back to home">←</a>
   <h1>Behind the Scenes</h1>
  </header>
  <div className="pch-gallery-toolbar">
   <nav aria-label="أقسام المعرض">
    <button type="button" aria-pressed={filter==="behind_scenes"} onClick={()=>setFilter("behind_scenes")}>الكواليس</button>
    <button type="button" aria-pressed={filter==="reference"} onClick={()=>setFilter("reference")}>المراجع</button>
   </nav>
   {canPost&&<button className="pch-gallery-add" type="button" aria-expanded={composerOpen} onClick={()=>{if(!composerOpen)setCategory(supervisor?filter:"behind_scenes");setComposerOpen(!composerOpen);}}>{composerOpen?"إغلاق":"＋ إضافة"}</button>}
  </div>
  {canPost&&composerOpen&&<form onSubmit={upload} className="pch-gallery-compose">
   {supervisor&&<label>القسم<select value={category} onChange={e=>setCategory(e.target.value as "reference"|"behind_scenes")} disabled={busy}><option value="behind_scenes">الكواليس</option><option value="reference">المراجع</option></select></label>}
   <label>العنوان<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy} placeholder="عنوان المنشور"/></label>
   <label>الوصف (اختياري)<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
   <label className="pch-gallery-picker">＋ صور وفيديوهات<input id="gallery-file" type="file" multiple accept="image/*,video/*" aria-label="اختيار صور وفيديوهات" disabled={busy} onChange={e=>chooseFiles(e.target.files)}/></label>
   <small>حتى 10 ملفات، 50 ميجابايت لكل ملف.</small>
   {files.length>0&&<div className="pch-gallery-files">{files.map((f,i)=><div key={f.name+i}><span>{i+1}. {f.name}</span><span><button type="button" disabled={busy||i===0} onClick={()=>move(i,i-1)} aria-label="تحريك لأعلى">↑</button><button type="button" disabled={busy||i===files.length-1} onClick={()=>move(i,i+1)} aria-label="تحريك لأسفل">↓</button></span></div>)}</div>}
   <button className="pch-gallery-publish" disabled={busy||!files.length||!title.trim()}>{busy?"جارٍ النشر...":"نشر"+(files.length?" ("+files.length+")":"")}</button>
  </form>}
  {message&&<p role="status" className="pch-gallery-message">{message}</p>}
  <section className="pch-gallery-grid">{visibleGroups.map(g=>{const first=g.members[0];return <article className="pch-gallery-card" key={g.key}>
   <div className="pch-gallery-carousel" dir="ltr">{g.members.map((item,i)=><div key={item.id}>
    {urls[item.id]?(item.mime_type.startsWith("video/")?<video src={urls[item.id]} controls playsInline preload="metadata"/>:<a href={urls[item.id]} target="_blank" rel="noopener noreferrer"><img src={urls[item.id]} alt={item.title+" "+(i+1)} loading="lazy"/></a>):<span className="pch-gallery-message">المعاينة غير متاحة</span>}
   </div>)}</div>
   <div className="pch-gallery-info"><h2>{first.title}</h2>{first.description&&<p>{first.description}</p>}{g.members.length>1&&<small>{g.members.length} ملفات · اسحبي للتنقل</small>}</div>
  </article>;})}</section>
  {!message&&visibleGroups.length===0&&<p className="pch-gallery-empty">لا توجد منشورات بعد.</p>}
 </main>;
}
