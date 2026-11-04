"use client";
import {useEffect,useState,type FormEvent} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Item={id:number;title:string;description:string|null;storage_path:string;mime_type:string;created_at:string;category:"reference"|"behind_scenes"};
export default function Gallery(){
 const [items,setItems]=useState<Item[]>([]),[urls,setUrls]=useState<Record<number,string>>({});
 const [category,setCategory]=useState<"reference"|"behind_scenes">("reference"),[filter,setFilter]=useState<"all"|"reference"|"behind_scenes">("all");
 const [supervisor,setSupervisor]=useState(false),[canPost,setCanPost]=useState(false),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("جارٍ تحميل المعرض...");
 async function load(){
  const db=getSupabase();if(!db){setMessage("الاتصال غير متاح.");return;}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  const p=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).single();
  if(p.error||!p.data){setMessage("تعذر التحقق من صلاحية الحساب.");return;}
  if(p.data.app_role!=="supervisor"&&p.data.approval_status!=="approved"){setMessage("المعرض متاح بعد موافقة المشرفة على الحساب.");return;}
  setSupervisor(p.data.app_role==="supervisor");setCanPost(true);
  const result=await db.from("project_gallery").select("id,title,description,storage_path,mime_type,created_at,category").order("created_at",{ascending:false}).limit(100);
  if(result.error){setMessage("تعذر تحميل المعرض.");return;}
  const list=(result.data??[]) as Item[];setItems(list);
  const signed=await Promise.all(list.map(async item=>{const {data}=await db.storage.from("studio-gallery").createSignedUrl(item.storage_path,3600);return [item.id,data?.signedUrl??""] as const;}));
  setUrls(Object.fromEntries(signed));setMessage("");
 }
 useEffect(()=>{void load();},[]);
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const db=getSupabase();if(!db||!file||!canPost||!title.trim())return;
  if(file.size===0||file.size>52428800){setMessage("حجم الملف يجب ألا يتجاوز 50 ميجابايت.");return;}
  if(!["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"].includes(file.type)){setMessage("اختاري صورة أو فيديو بصيغة مدعومة.");return;}
  setBusy(true);setMessage("");
  const {data:{user}}=await db.auth.getUser();if(!user){setBusy(false);return;}
  const ext=file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
  const path=supervisor?"gallery/"+crypto.randomUUID()+"."+ext:"bts/"+user.id+"/"+crypto.randomUUID()+"."+ext;
  const up=await db.storage.from("studio-gallery").upload(path,file,{contentType:file.type,upsert:false});
  if(up.error){setMessage("فشل رفع الملف. تأكدي من الحجم والاتصال.");setBusy(false);return;}
  const saved=await db.from("project_gallery").insert({title:title.trim(),description:description.trim()||null,storage_path:path,mime_type:file.type,created_by:user.id,category:supervisor?category:"behind_scenes"});
  if(saved.error){await db.storage.from("studio-gallery").remove([path]);setMessage("لم يتم حفظ المنشور. حاولي مرة أخرى.");setBusy(false);return;}
  setTitle("");setDescription("");setFile(null);const input=document.getElementById("gallery-file") as HTMLInputElement|null;if(input)input.value="";
  await load();setMessage("تم نشر الملف في القسم المختار.");setBusy(false);
 }
 return <main className="gallery-shell"><header className="gallery-header"><a href="/dashboard">← لوحة التحكم</a><span>1960 STUDIO / GALLERY</span></header><div className="gallery-intro"><span className="studio-kicker">VISUAL LIBRARY</span><h1>معرض <em>المشروع.</em></h1><p>المشاهد المرجعية وكواليس الفيلم في معرض واحد. كل طالب معتمد والمشرفة يقدروا ينشروا صور الكواليس مباشرة، من غير انتظار موافقة.</p></div>
 {canPost&&<form onSubmit={upload} className="gallery-upload"><h2>📸 شارك لحظة من كواليس 1960</h2>{supervisor&&<label>قسم المنشور<select value={category} onChange={e=>setCategory(e.target.value as "reference"|"behind_scenes")}><option value="reference">المراجع والتصورات</option><option value="behind_scenes">🎬 كواليس الفيلم · Behind the Scenes</option></select></label>}<label>عنوان المنشور<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: اجتماع اختيار موقع التصوير"/></label><label>وصف اختياري<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="اكتب تعليقًا طريفًا أو وصفًا للحظة"/></label><label>صورة أو فيديو (حتى 50 MB)<input id="gallery-file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><button disabled={busy||!file||!title.trim()}>{busy?"جارٍ النشر...":"نشر اللحظة"}</button></form>}
 {message&&<p role="status" className="gallery-status">{message}</p>}
 <nav className="gallery-filters" aria-label="أقسام المعرض"><button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>كل الصور والفيديوهات</button><button type="button" aria-pressed={filter==="behind_scenes"} onClick={()=>setFilter("behind_scenes")}>🎬 كواليس الفيلم</button><button type="button" aria-pressed={filter==="reference"} onClick={()=>setFilter("reference")}>🎞 المراجع والتصورات</button></nav><section className="gallery-grid">{items.filter(item=>filter==="all"||item.category===filter).map(item=><article className="gallery-card" key={item.id} style={item.category==="behind_scenes"?{transform:"rotate("+((item.id%5)-2)*1.2+"deg)",transition:"transform .2s ease"}:{}}>{urls[item.id]?<div className="gallery-media">{item.mime_type.startsWith("video/")?<video src={urls[item.id]} controls playsInline preload="metadata"/>:<a href={urls[item.id]} target="_blank" rel="noopener noreferrer"><img src={urls[item.id]} alt={item.title}/></a>}</div>:<div className="gallery-media gallery-unavailable">المعاينة غير متاحة حاليًا</div>}<div className="gallery-info"><span>{item.category==="behind_scenes"?"كواليس الفيلم":"مرجع بصري"} · {item.mime_type.startsWith("video/")?"فيديو":"صورة"} · {new Date(item.created_at).toLocaleDateString("ar-EG")}</span><h2>{item.title}</h2>{item.description&&<p>{item.description}</p>}</div></article>)}</section>
 {!message&&items.length===0&&<p className="gallery-empty">لسه مفيش تصورات منشورة. أول صورة أو فيديو هيظهر هنا.</p>}
 </main>;
}