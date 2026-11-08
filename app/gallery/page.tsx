"use client";
import {useEffect,useState,type FormEvent} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Item={id:number;title:string;description:string|null;storage_path:string;mime_type:string;created_at:string;category:"reference"|"behind_scenes";carousel_id:string|null;carousel_position:number|null};
export default function Gallery(){
 const [items,setItems]=useState<Item[]>([]),[urls,setUrls]=useState<Record<number,string>>({});
 const [category,setCategory]=useState<"reference"|"behind_scenes">("reference"),[filter,setFilter]=useState<"all"|"reference"|"behind_scenes">("all");
 const [supervisor,setSupervisor]=useState(false),[canPost,setCanPost]=useState(false),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("جارٍ تحميل المعرض...");
 async function load(){
  const db=getSupabase();if(!db){setMessage("الاتصال غير متاح.");return;}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  const p=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).single();
  if(p.error||!p.data){setMessage("تعذر التحقق من صلاحية الحساب.");return;}
  if(p.data.app_role!=="supervisor"&&p.data.approval_status!=="approved"){setMessage("المعرض متاح بعد موافقة المشرفة على الحساب.");return;}
  setSupervisor(p.data.app_role==="supervisor");setCanPost(true);
  const result=await db.from("project_gallery").select("id,title,description,storage_path,mime_type,created_at,category,carousel_id,carousel_position").order("created_at",{ascending:false}).limit(100);
  if(result.error){setMessage("تعذر تحميل المعرض.");return;}
  const list=(result.data??[]) as Item[];setItems(list);
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
  const {data:{user}}=await db.auth.getUser();if(!user){setBusy(false);setMessage("سجلي الدخول مرة أخرى.");return;}
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
   await load();setMessage("تم نشر "+files.length+" ملف في منشور واحد بنجاح.");
  }catch(err){
   if(uploaded.length)await db.storage.from("studio-gallery").remove(uploaded);
   setMessage(err instanceof Error?err.message:"حدث خطأ أثناء النشر. حاولي مرة أخرى.");
  }finally{setBusy(false);}
 }
 const groups=items.reduce<{key:string;members:Item[]}[]>((all,item)=>{const key=item.carousel_id??"single-"+item.id;let g=all.find(x=>x.key===key);if(!g){g={key,members:[]};all.push(g);}g.members.push(item);return all;},[]);
 groups.forEach(g=>g.members.sort((a,b)=>(a.carousel_position??0)-(b.carousel_position??0)));
 return <main className="gallery-shell"><header className="gallery-header"><a href="/dashboard">← لوحة التحكم</a><span>1960 STUDIO / GALLERY</span></header><div className="gallery-intro"><span className="studio-kicker">VISUAL LIBRARY</span><h1>معرض <em>المشروع.</em></h1><p>المشاهد المرجعية وكواليس الفيلم في معرض واحد. كل طالب معتمد والمشرفة يقدروا ينشروا صور الكواليس مباشرة، من غير انتظار موافقة.</p></div>
 {canPost&&<form onSubmit={upload} className="gallery-upload"><h2>📸 شارك لحظة من كواليس 1960</h2>{supervisor&&<label>قسم المنشور<select value={category} onChange={e=>setCategory(e.target.value as "reference"|"behind_scenes")}><option value="reference">المراجع والتصورات</option><option value="behind_scenes">🎬 كواليس الفيلم · Behind the Scenes</option></select></label>}<label>عنوان المنشور<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: اجتماع اختيار موقع التصوير"/></label><label>وصف اختياري<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="اكتب تعليقًا طريفًا أو وصفًا للحظة"/></label><label>صور أو فيديوهات (حتى 10 ملفات، 50 MB لكل ملف)<input id="gallery-file" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>chooseFiles(e.target.files)}/></label>{files.length>0&&<div style={{display:"grid",gap:8}}><strong>ترتيب الكاروسيل ({files.length})</strong>{files.map((f,i)=><div key={f.name+i} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",String(i))} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=Number(e.dataTransfer.getData("text/plain"));if(Number.isInteger(from))move(from,i);}} style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",padding:8,border:"1px solid #8b6475",borderRadius:8}}><span style={{overflowWrap:"anywhere"}}>{i+1}. {f.name}</span><span><button type="button" disabled={busy||i===0} onClick={()=>move(i,i-1)} aria-label="تحريك لأعلى">↑</button><button type="button" disabled={busy||i===files.length-1} onClick={()=>move(i,i+1)} aria-label="تحريك لأسفل">↓</button></span></div>)}</div>}<button disabled={busy||!files.length||!title.trim()}>{busy?"جارٍ النشر...":"نشر "+files.length+" ملف"}</button></form>}
 {message&&<p role="status" className="gallery-status">{message}</p>}
 <nav className="gallery-filters" aria-label="أقسام المعرض"><button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>كل الصور والفيديوهات</button><button type="button" aria-pressed={filter==="behind_scenes"} onClick={()=>setFilter("behind_scenes")}>🎬 كواليس الفيلم</button><button type="button" aria-pressed={filter==="reference"} onClick={()=>setFilter("reference")}>🎞 المراجع والتصورات</button></nav><section className="gallery-grid">{groups.filter(g=>filter==="all"||g.members[0].category===filter).map(g=>{const first=g.members[0];return <article className="gallery-card" key={g.key}><div dir="ltr" style={{display:"flex",overflowX:"auto",scrollSnapType:"x mandatory",gap:8,WebkitOverflowScrolling:"touch",touchAction:"pan-x"}}>{g.members.map((item,i)=><div key={item.id} style={{flex:"0 0 100%",scrollSnapAlign:"start",minWidth:0}}>{urls[item.id]?<div className="gallery-media">{item.mime_type.startsWith("video/")?<video src={urls[item.id]} controls playsInline preload="metadata"/>:<a href={urls[item.id]} target="_blank" rel="noopener noreferrer"><img src={urls[item.id]} alt={item.title+" "+(i+1)}/></a>}</div>:<div className="gallery-media gallery-unavailable">المعاينة غير متاحة حاليًا</div>}</div>)}</div><div className="gallery-info"><span>{first.category==="behind_scenes"?"كواليس الفيلم":"مرجع بصري"} · {g.members.length>1?g.members.length+" ملفات · اسحبي للتنقل":first.mime_type.startsWith("video/")?"فيديو":"صورة"} · {new Date(first.created_at).toLocaleDateString("ar-EG")}</span><h2>{first.title}</h2>{first.description&&<p>{first.description}</p>}</div></article>;})}</section>
 {!message&&items.length===0&&<p className="gallery-empty">لسه مفيش تصورات منشورة. أول صورة أو فيديو هيظهر هنا.</p>}
 </main>;
}