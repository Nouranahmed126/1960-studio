"use client";
import {useEffect,useState,type FormEvent} from "react";
import {getSupabase} from "../../../lib/supabase-browser";
type Contribution={id:number;title:string;assignment_id:number;team_id:number;user_id:string};
type Attachment={id:number;contribution_id:number;original_filename:string;storage_path:string;size_bytes:number;created_at:string};
export default function TeamFiles(){
 const [contributions,setContributions]=useState<Contribution[]>([]);
 const [attachments,setAttachments]=useState<Attachment[]>([]);
 const [selected,setSelected]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [message,setMessage]=useState("جارٍ تحميل الملفات...");
 const [busy,setBusy]=useState(false);
 const [userId,setUserId]=useState("");
 async function load(){
  const db=getSupabase();if(!db){setMessage("إعدادات Supabase غير مكتملة.");return;}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  setUserId(user.id);
  const [c,a]=await Promise.all([
   db.from("contributions").select("id,title,assignment_id,team_id,user_id").order("created_at",{ascending:false}).limit(100),
   db.from("attachments").select("id,contribution_id,original_filename,storage_path,size_bytes,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  if(c.error||a.error){setMessage("الملفات مش متاحة حاليًا. لازم تطبيق تحديث attachments.sql في Supabase.");return;}
  setContributions((c.data??[]) as Contribution[]);setAttachments((a.data??[]) as Attachment[]);setMessage("");
 }
 useEffect(()=>{void load()},[]);
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const db=getSupabase(),c=contributions.find(x=>String(x.id)===selected);
  if(!db||!c||!file||c.user_id!==userId)return;
  if(file.size===0||file.size>52428800){setMessage("الملف لازم يكون أقل من أو يساوي 50 ميجابايت وغير فارغ.");return;}
  setBusy(true);setMessage("");
  const randomId=crypto.randomUUID();
  const path=`${c.team_id}/${c.assignment_id}/${userId}/${randomId}`;
  const up=await db.storage.from("studio-files").upload(path,file,{upsert:false,contentType:file.type||"application/octet-stream"});
  if(up.error){setMessage("رفع الملف فشل. راجعي صلاحيات Storage وحجم الملف.");setBusy(false);return;}
  const added=await db.from("attachments").insert({
   contribution_id:c.id,assignment_id:c.assignment_id,team_id:c.team_id,
   uploaded_by:userId,storage_path:path,original_filename:file.name,
   mime_type:file.type||null,size_bytes:file.size
  });
  if(added.error){
   setMessage("الملف اترفع لكن تسجيله فشل. اطلبي من المشرفة مراجعة التخزين، ومتكرريش الرفع دلوقتي.");
  }else{
   setFile(null);setSelected("");const input=document.getElementById("studio-upload") as HTMLInputElement|null;if(input)input.value="";
   await load();setMessage("تم حفظ الملف في مساحة الفريق الخاصة.");
  }
  setBusy(false);
 }
 async function openFile(path:string){
  const db=getSupabase();if(!db)return;
  const {data,error}=await db.storage.from("studio-files").createSignedUrl(path,60);
  if(error||!data?.signedUrl){setMessage("مش مسموح بفتح الملف أو الرابط غير متاح.");return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 const myContributions=contributions.filter(c=>c.user_id===userId);
 return <main style={{maxWidth:720,margin:"25px auto",padding:20}}>
  <a href="/dashboard" style={{color:"#d5a66d"}}>العودة للوحة التحكم</a>
  <h1>ملفات فرق العمل</h1>
  <p style={{color:"#b7c0ce"}}>الملفات خاصة بالفرق المعتمدة، وروابط الفتح مؤقتة. الحد الأقصى للملف 50 ميجابايت.</p>
  <form onSubmit={upload} style={{display:"grid",gap:14,padding:18,border:"1px solid #343a49",borderRadius:12}}>
   <label>مساهمتك المرتبطة بالملف
    <select required value={selected} onChange={e=>setSelected(e.target.value)} style={field}>
     <option value="">اختاري مساهمة من مساهماتك</option>
     {myContributions.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
    </select>
   </label>
   <label>اختيار الملف<input id="studio-upload" type="file" required onChange={e=>setFile(e.target.files?.[0]??null)} style={field}/></label>
   <button disabled={busy||!selected||!file} style={{padding:14,background:"#d5a66d",border:0,borderRadius:9,fontWeight:700}}>{busy?"جارٍ الرفع...":"رفع الملف للفريق"}</button>
  </form>
  {message&&<p role="status" style={{color:"#ffca9f",lineHeight:1.8}}>{message}</p>}
  <h2 style={{marginTop:32}}>الملفات المتاحة ليكي</h2>
  {attachments.length===0&&<p>مفيش ملفات ظاهرة حاليًا.</p>}
  {attachments.map(a=><article key={a.id} style={{border:"1px solid #343a49",borderRadius:12,padding:16,marginBottom:12}}>
   <strong style={{overflowWrap:"anywhere"}}>{a.original_filename}</strong>
   <p style={{color:"#b7c0ce",fontSize:13}}>{contributions.find(c=>c.id===a.contribution_id)?.title??"مساهمة"} • {(a.size_bytes/1048576).toFixed(1)} MB</p>
   <button onClick={()=>void openFile(a.storage_path)} style={{border:0,borderRadius:8,padding:"10px 14px",background:"#d5a66d",fontWeight:700}}>فتح الملف</button>
  </article>)}
 </main>;
}
const field={display:"block",boxSizing:"border-box" as const,width:"100%",marginTop:8,padding:12,background:"#10131c",color:"white",border:"1px solid #596174",borderRadius:9};
