"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Scene={id:number;scene_number:number;title:string;setting:string;location:string;time_of_day:string;characters:string;dramatic_goal:string;action_text:string;dialogue:string;camera:string;lighting:string;sound:string;production_notes:string;status:string};
type Contribution={id:number;title:string;content:string|null;team_id:number;created_at:string};
type Review={id:number;contribution_id:number|null;title:string;notes:string;decision:string};
const empty={scene_number:1,title:"",setting:"داخلي",location:"",time_of_day:"نهار",characters:"",dramatic_goal:"",action_text:"",dialogue:"",camera:"",lighting:"",sound:"",production_notes:"",status:"draft"};
const fields:[keyof typeof empty,string][]=[["title","عنوان المشهد"],["setting","داخلي / خارجي"],["location","المكان"],["time_of_day","الزمن"],["characters","الشخصيات"],["dramatic_goal","الهدف الدرامي"],["action_text","وصف الحركة والأحداث"],["dialogue","الحوار"],["camera","الكادرات وحركة الكاميرا"],["lighting","الإضاءة"],["sound","الصوت والموسيقى"],["production_notes","الملابس والإكسسوارات والاستمرارية وملاحظات الإنتاج"]];
export default function DirectorRoom(){
 const [allowed,setAllowed]=useState<boolean|null>(null),[scenes,setScenes]=useState<Scene[]>([]),[contributions,setContributions]=useState<Contribution[]>([]),[reviews,setReviews]=useState<Review[]>([]),[draft,setDraft]=useState(empty),[editing,setEditing]=useState<number|null>(null),[note,setNote]=useState<Record<number,string>>({}),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function load(){
  const db=getSupabase();if(!db)return;
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return;}
  const p=await db.from("profiles").select("app_role").eq("id",user.id).single();
  if(p.data?.app_role!=="supervisor"){setAllowed(false);return;}setAllowed(true);
  const [s,c,r]=await Promise.all([db.from("director_scenes").select("*").order("scene_number"),db.from("contributions").select("id,title,content,team_id,created_at").order("created_at",{ascending:false}).limit(60),db.from("director_reviews").select("*").order("created_at",{ascending:false})]);
  if(s.error||r.error)setMessage("تعذر تحميل السجل الخاص. تحققي من صلاحيات قاعدة البيانات.");
  else {setScenes((s.data??[]) as Scene[]);setReviews((r.data??[]) as Review[]);}
  if(!c.error)setContributions((c.data??[]) as Contribution[]);
 }
 useEffect(()=>{void load()},[]);
 async function saveScene(approve=false){
  const db=getSupabase();if(!db||!draft.title.trim()) {setMessage("اكتبي عنوان المشهد أولًا.");return;}
  setBusy(true);const payload={...draft,status:approve?"approved":"draft"};
  const result=editing?await db.from("director_scenes").update({...payload,updated_at:new Date().toISOString()}).eq("id",editing):await db.from("director_scenes").insert(payload);
  setBusy(false);if(result.error){setMessage("تعذر حفظ المشهد: "+result.error.message);return;}
  setEditing(null);setDraft(empty);setMessage(approve?"تم اعتماد المشهد.":"تم حفظ مسودة المشهد.");await load();
 }
 async function decide(c:Contribution,decision:"approved"|"rejected"|"pending"){
  const db=getSupabase();if(!db)return;setBusy(true);
  const old=reviews.find(r=>r.contribution_id===c.id);
  const payload={contribution_id:c.id,title:c.title,notes:note[c.id]??old?.notes??"",decision};
  const result=old?await db.from("director_reviews").update(payload).eq("id",old.id):await db.from("director_reviews").insert(payload);
  setBusy(false);setMessage(result.error?"تعذر حفظ التقييم: "+result.error.message:"تم حفظ قرار المراجعة. لا تتم إضافة أي نص للسيناريو تلقائيًا.");if(!result.error)await load();
 }
 const style={background:"#27242c",border:"1px solid #5d4755",borderRadius:12,padding:12,color:"#fff",width:"100%",boxSizing:"border-box" as const};
 if(allowed===null)return <main style={{padding:28,color:"#f5eef2"}}>جارٍ التحقق من صلاحيات المشرفة...</main>;
 if(!allowed)return <main style={{padding:28,color:"#f5eef2"}}><h1>صفحة خاصة بالمشرفة</h1><a href="/dashboard">العودة للوحة الحساب</a></main>;
 return <main dir="rtl" style={{maxWidth:1050,margin:"auto",padding:"24px 16px 80px",color:"#f5eef2"}}>
 <a href="/dashboard" style={{color:"#e6a4be"}}>← لوحة المشرفة</a><p style={{color:"#e6a4be",marginBottom:3}}>1960 STUDIO · PRIVATE WORKSPACE</p><h1 style={{fontSize:"clamp(25px,5vw,37px)"}}>غرفة المخرجة · السيناريو والتقييم</h1><p style={{color:"#c4b8c1"}}>مساحتك الخاصة لمتابعة القصة والمشاهد وتسليمات الفرق. كل التعديلات والقرارات محفوظة للمشرفة فقط.</p>
 <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"22px 0"}}>{[["المشاهد",scenes.length],["المعتمدة",scenes.filter(s=>s.status==="approved").length],["تسليمات للمراجعة",contributions.filter(c=>!reviews.some(r=>r.contribution_id===c.id&&r.decision!=="pending")).length]].map(([label,count])=><div key={label} style={{...style,width:"auto",minWidth:135}}><strong style={{fontSize:24}}>{count}</strong><p style={{margin:"5px 0",fontSize:13}}>{label}</p></div>)}</div>
 {message&&<p role="status" style={{color:"#f2b9a1"}}>{message}</p>}
 <section style={{...style,marginBottom:22}}><h2>السيناريو الاحترافي</h2><p style={{fontSize:13,color:"#c4b8c1"}}>احفظي المسودة أولًا، ثم اعتمدي المشهد عندما يصبح جاهزًا.</p>
 <label>رقم المشهد<input style={style} type="number" min={1} value={draft.scene_number} onChange={e=>setDraft({...draft,scene_number:Number(e.target.value)})}/></label>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:13,marginTop:14}}>{fields.map(([key,label])=><label key={key} style={{fontSize:13}}>{label}{(["action_text","dialogue","production_notes","camera","sound","dramatic_goal"] as string[]).includes(key)?<textarea rows={4} style={style} value={String(draft[key])} onChange={e=>setDraft({...draft,[key]:e.target.value})}/>:<input style={style} value={String(draft[key])} onChange={e=>setDraft({...draft,[key]:e.target.value})}/>}</label>)}</div>
 <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:15}}><button disabled={busy} style={{...style,width:"auto",background:"#78485f"}} onClick={()=>void saveScene(false)}>حفظ كمسودة</button><button disabled={busy} style={{...style,width:"auto",background:"#476e60"}} onClick={()=>void saveScene(true)}>اعتماد المشهد</button>{editing&&<button style={{...style,width:"auto"}} onClick={()=>{setEditing(null);setDraft(empty)}}>إلغاء التعديل</button>}</div>
 <h3>المشاهد المحفوظة</h3>{scenes.length===0?<p>لسه مفيش مشاهد محفوظة.</p>:scenes.map(s=><article key={s.id} style={{borderTop:"1px solid #5d4755",padding:"12px 0"}}><strong>مشهد {s.scene_number} · {s.title}</strong> <span style={{color:"#e6a4be"}}>({s.status==="approved"?"معتمد":"مسودة"})</span><p style={{fontSize:13,color:"#c4b8c1"}}>{s.setting} · {s.location} · {s.time_of_day}</p><button style={{...style,width:"auto"}} onClick={()=>{const values={...empty};for(const key of Object.keys(empty) as (keyof typeof empty)[]){(values as Record<string,string|number>)[key]=s[key] as string|number;}setDraft(values);setEditing(s.id);window.scrollTo({top:0,behavior:"smooth"});}}>فتح وتعديل</button></article>)}</section>
 <section style={style}><h2>مراجعة تسليمات الطلاب</h2><p style={{color:"#c4b8c1",fontSize:13}}>التقييمات خاصة بيكي. اعتماده هنا لا يغيّر السيناريو تلقائيًا.</p>{contributions.length===0?<p>لا توجد تسليمات متاحة حاليًا.</p>:contributions.map(c=>{const r=reviews.find(x=>x.contribution_id===c.id);return <article key={c.id} style={{borderTop:"1px solid #5d4755",padding:"16px 0"}}><strong>{c.title}</strong><p style={{fontSize:12,color:"#c4b8c1"}}>الفريق #{c.team_id} · {new Date(c.created_at).toLocaleDateString("ar-EG")} · {r?.decision==="approved"?"معتمد":r?.decision==="rejected"?"يحتاج تعديل":"بانتظار مراجعتك"}</p><p style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{c.content||"مساهمة بدون وصف نصي — راجعي المرفقات من صفحة الملفات."}</p><textarea rows={3} style={style} placeholder="ملاحظاتك وتقييمك الخاص" value={note[c.id]??r?.notes??""} onChange={e=>setNote({...note,[c.id]:e.target.value})}/><div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:9}}><button disabled={busy} style={{...style,width:"auto",background:"#476e60"}} onClick={()=>void decide(c,"approved")}>اعتماد التقييم</button><button disabled={busy} style={{...style,width:"auto"}} onClick={()=>void decide(c,"rejected")}>يحتاج تعديل</button><button disabled={busy} style={{...style,width:"auto"}} onClick={()=>void decide(c,"pending")}>حفظ ملاحظات فقط</button></div></article>})}</section>
 <p style={{fontSize:13,color:"#c4b8c1",marginTop:20}}>التحليل التلقائي بالذكاء الاصطناعي لم يُفعّل بعد؛ يحتاج ربط نموذج AI آمن عبر الخادم. هذه النسخة تحفظ السيناريو والمراجعات والصلاحيات الخاصة.</p>
 </main>;
}
