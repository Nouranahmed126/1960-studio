"use client";
import {useState} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Piece={id:number;type:string;x:number;y:number;rotation:number};
const groups=[
 {name:"صالون بيت الجد",keys:["صالون","جد","بيت","معيشة"],types:["sofa","rug","table","radio","books","clock"],wall:"#aa8771",floor:"#9d7357"},
 {name:"غرفة الأرشيف",keys:["أرشيف","وثائق","ملفات","مكتب"],types:["archive","files","books","desk","reel","tape"],wall:"#817969",floor:"#746250"},
 {name:"ركن الحفيدة",keys:["حفيدة","طفلة","بنت","أطفال"],types:["rug","chair","table","books","lamp"],wall:"#b6a08c",floor:"#b78c68"},
 {name:"ركن الإذاعة",keys:["راديو","إذاعة","تلفزيون","إعلام"],types:["radio","tv","reel","tape","photo"],wall:"#95816f",floor:"#79624e"}
];
export default function SmartDecor({onApply}:{onApply:(data:{name:string;wall:string;floor:string;pieces:Piece[]})=>void}){
 const [prompt,setPrompt]=useState(""),[search,setSearch]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[preview,setPreview]=useState<null|{name:string;wall:string;floor:string;pieces:Piece[]}>(null);
 const build=(input:string)=>{const q=input.toLowerCase();const group=[...groups].sort((a,b)=>b.keys.filter(k=>q.includes(k)).length-a.keys.filter(k=>q.includes(k)).length)[0];const types=[...group.types];if(/نور|شباك|لمبة/.test(q)&&!types.includes("lamp"))types.push("lamp");if(/ساعة/.test(q)&&!types.includes("clock"))types.push("clock");const spots=[[85,95],[190,180],[350,100],[365,305],[90,305],[245,235],[270,90],[160,315]];setPreview({name:group.name,wall:group.wall,floor:group.floor,pieces:types.map((type,i)=>({id:Date.now()+i,type,x:spots[i%spots.length][0],y:spots[i%spots.length][1],rotation:0}))})};
 async function generateAI(){
  if(prompt.trim().length<8)return;
  const client=getSupabase();if(!client){setMessage("إعدادات تسجيل الدخول غير متاحة. استخدمي الاقتراح السريع.");return}
  const {data:{session}}=await client.auth.getSession();
  if(!session){setMessage("سجلي الدخول لتشغيل الذكاء الاصطناعي. الاقتراح السريع متاح الآن.");return}
  setBusy(true);setMessage("");
  try{const response=await fetch("/api/decor/generate",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({description:prompt})});
  const data=await response.json();if(!response.ok)throw Error(data.error||"تعذر إنشاء التصميم");
  setPreview({name:data.name,wall:data.wall,floor:data.floor,pieces:data.pieces.map((p:Piece,i:number)=>({...p,id:Date.now()+i}))});setMessage("اقتراح مولّد بالذكاء الاصطناعي. راجعيه قبل التطبيق.");
  }catch(e){setMessage(e instanceof Error?e.message:"تعذر إنشاء التصميم")}finally{setBusy(false)}
 }
 const card={background:"#2c2227",border:"1px solid #84675c",borderRadius:16,padding:16,marginBottom:16} as const;
 const btn={padding:"10px 14px",borderRadius:9,border:"1px solid #ac8a67",cursor:"pointer",background:"#d6b68a",color:"#241d22",fontWeight:700} as const;
 return <div dir="rtl">
 <section style={card}><h2>✨ مصمم الديكور من الوصف</h2><p>استخدمي المصمم الذكي عند تفعيل الخدمة، أو الاقتراح السريع المتاح دون اتصال بنموذج AI.</p>
 <textarea aria-label="وصف الديكور" maxLength={800} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="مثال: صالون بيت الجد وفيه راديو ومكتبة ونور من الشباك" style={{width:"100%",minHeight:80,padding:10,boxSizing:"border-box",borderRadius:8}}/>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={btn} disabled={prompt.trim().length<8||busy} onClick={generateAI}>{busy?"جاري التصميم...":"✨ تصميم بالذكاء الاصطناعي"}</button><button style={btn} disabled={prompt.trim().length<8||busy} onClick={()=>{build(prompt);setMessage("اقتراح سريع من مكتبة الفيلم")}}>اقتراح سريع</button></div>{message&&<p role="status" style={{fontSize:13}}>{message}</p>}
 {preview&&<div style={{marginTop:12,padding:12,border:"1px solid #84675c",borderRadius:10}}><strong>{preview.name}</strong><p>عدد القطع: {preview.pieces.length}. اقتراح تخطيطي مبدئي يحتاج مراجعة تاريخية وفنية.</p>
 <svg viewBox="0 0 510 400" role="img" aria-label="معاينة علوية لتوزيع قطع الديكور المقترح" style={{display:"block",width:"100%",maxWidth:510,background:preview.floor,border:"8px solid "+preview.wall,borderRadius:10,boxSizing:"border-box",marginBottom:12}}>
 {preview.pieces.map((p,i)=><g key={p.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}><rect x="-25" y="-18" width="50" height="36" rx="5" fill="#ead6b3" stroke="#553a2d" strokeWidth="2"/><text textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#302019">{i+1}</text></g>)}
 </svg><p style={{fontSize:12}}>معاينة تخطيطية قبل التطبيق؛ الأرقام تمثل مواقع القطع بالترتيب.</p><button style={btn} onClick={()=>{onApply(preview);setPreview(null)}}>تطبيق الاقتراح</button> <button style={btn} onClick={()=>setPreview(null)}>إلغاء</button></div>}</section>
 <section style={card}><h2>🏺 مكتبة ديكور مصر الستينيات</h2><p>تصورات مبدئية باستخدام قطع الأثاث الموجودة بالفعل، وليست نماذج فوتوريالية أو توثيقًا تاريخيًا معتمدًا.</p>
 <input aria-label="البحث في المكتبة" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحثي عن صالون أو أرشيف..." style={{padding:10,width:"100%",boxSizing:"border-box",borderRadius:8,marginBottom:12}}/>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>{groups.filter(g=>g.name.includes(search)||g.keys.some(k=>k.includes(search))).map(g=><div key={g.name} style={{padding:12,border:"1px solid #84675c",borderRadius:10}}><strong>{g.name}</strong><p>{g.types.length} عناصر في المجموعة</p><button style={btn} onClick={()=>build(g.keys[0])}>معاينة المجموعة</button></div>)}</div>
 </section></div>;
}
