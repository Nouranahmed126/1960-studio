"use client";
import {useEffect,useState} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Look={skin:string;hair:string;hairStyle:string;face:string;eyes:string;brows:string;nose:string;mouth:string;top:string;bottom:string;shoes:string;glasses:boolean;beard:boolean;body:string};
type Design={id:number;owner_id:string;title:string;character_name:string;scene_number:string;notes:string;appearance:Look;created_at:string};
const initial:Look={skin:"#C58E69",hair:"#39302C",hairStyle:"قصير",face:"بيضاوي",eyes:"بني",brows:"عريضة",nose:"متوسط",mouth:"عادي",top:"#B8A07A",bottom:"#333B48",shoes:"#292421",glasses:false,beard:false,body:"متوسط"};
const palettes={skin:["#E8C6A3","#C58E69","#A96E4F","#75462F","#4E3026"],hair:["#292321","#655041","#B5A48F","#E1D8CC","#171719"],top:["#B8A07A","#FFFFFF","#38536D","#6F3547","#4B614C","#242329"],bottom:["#333B48","#1F2227","#6D594A","#A29B8B","#42534A"],shoes:["#292421","#6A4B37","#A5A09B"]};
const field:React.CSSProperties={width:"100%",padding:12,borderRadius:10,border:"1px solid #80616B",background:"#251D24",color:"#fff",boxSizing:"border-box"};
const panel:React.CSSProperties={background:"#39242F",border:"1px solid #785968",borderRadius:18,padding:18};
export default function CharacterStudio(){
 const [look,setLook]=useState<Look>(initial),[character,setCharacter]=useState("الجد حسن"),[scene,setScene]=useState("1"),[title,setTitle]=useState(""),[notes,setNotes]=useState(""),[items,setItems]=useState<Design[]>([]),[user,setUser]=useState(""),[editId,setEditId]=useState<number|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const change=<K extends keyof Look>(key:K,value:Look[K])=>setLook(p=>({...p,[key]:value}));
 async function load(){const db=getSupabase();if(!db)return;const {data:{user:u}}=await db.auth.getUser();if(!u){location.href="/login";return}setUser(u.id);const r=await db.from("studio_character_designs").select("*").order("created_at",{ascending:false}).limit(120);if(r.error)setMessage(r.error.message);else setItems(r.data||[])}
 useEffect(()=>{void load()},[]);
 async function save(){const db=getSupabase();if(!db||!user)return;if(!character.trim()||!title.trim()){setMessage("اكتبي اسم الشخصية واسم التصميم");return}setBusy(true);const data={owner_id:user,title:title.trim(),character_name:character.trim(),scene_number:scene.trim()||"1",notes:notes.trim(),appearance:look,updated_at:new Date().toISOString()};const r=editId?await db.from("studio_character_designs").update(data).eq("id",editId).eq("owner_id",user):await db.from("studio_character_designs").insert(data);setBusy(false);setMessage(r.error?"تعذر الحفظ: "+r.error.message:"تم حفظ تصميم الشخصية على الموقع ✓");if(!r.error){setEditId(null);await load()}}
 function open(d:Design){setLook({...initial,...d.appearance});setCharacter(d.character_name);setScene(d.scene_number);setTitle(d.title);setNotes(d.notes||"");setEditId(d.owner_id===user?d.id:null);window.scrollTo({top:0,behavior:"smooth"});setMessage(d.owner_id===user?"تم فتح تصميمك للتعديل":"تم فتح التصميم للمعاينة. للحفظ كنسخة جديدة غيّري الاسم واضغطي حفظ")}
 async function remove(d:Design){if(d.owner_id!==user||!confirm("حذف التصميم نهائيًا؟"))return;const db=getSupabase();if(!db)return;const r=await db.from("studio_character_designs").delete().eq("id",d.id).eq("owner_id",user);setMessage(r.error?r.error.message:"تم حذف التصميم");if(!r.error)await load()}
 const faceWidth=look.face==="عريض"?64:look.face==="نحيف"?46:56;
 const skin=look.skin,hair=look.hair;
 return <main dir="rtl" style={{maxWidth:1120,margin:"auto",padding:"24px 16px 120px",color:"#F5EDE8"}}>
 <h1>🎭 استوديو تصميم شخصيات 1960</h1><p>اختاري الشخصية والمشهد، وعدّلي شكل الأفاتار قدامك، وبعدها احفظي التصميم عشان كل الفريق يقدر يشوفه.</p>
 {message&&<p role="status" style={{padding:12,background:"#513445",borderRadius:10}}>{message}</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:18,alignItems:"start"}}>
 <section style={{...panel,position:"sticky",top:8}}>
 <h2 style={{marginTop:0}}>معاينة الشخصية</h2>
 <div style={{background:"linear-gradient(#77716d,#b6aaa0)",borderRadius:16,overflow:"hidden",textAlign:"center"}}>
 <svg viewBox="0 0 300 460" role="img" aria-label="معاينة مرئية للشخصية بالملابس والملامح المختارة" style={{width:"100%",maxWidth:360,display:"block",margin:"auto"}}>
 <defs>
 <radialGradient id="skinReal" cx="38%" cy="28%" r="85%"><stop offset="0%" stopColor="#fff0d9" stopOpacity=".53"/><stop offset="38%" stopColor={skin}/><stop offset="83%" stopColor={skin}/><stop offset="100%" stopColor="#4b3029" stopOpacity=".92"/></radialGradient>
 <linearGradient id="clothReal" x1="0" x2="1"><stop offset="0%" stopColor="#101015" stopOpacity=".55"/><stop offset="25%" stopColor={look.top}/><stop offset="56%" stopColor={look.top}/><stop offset="100%" stopColor="#17141b" stopOpacity=".6"/></linearGradient>
 <linearGradient id="trouserReal" x1="0" x2="1"><stop offset="0%" stopColor="#13141b" stopOpacity=".5"/><stop offset="38%" stopColor={look.bottom}/><stop offset="72%" stopColor={look.bottom}/><stop offset="100%" stopColor="#14131a" stopOpacity=".55"/></linearGradient>
 <radialGradient id="hairReal"><stop offset="0%" stopColor={hair}/><stop offset="100%" stopColor="#181414"/></radialGradient>
 <filter id="softPortrait"><feGaussianBlur stdDeviation="1.4"/></filter>
 <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".58" numOctaves="3" seed="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer></filter>
 </defs>
 <ellipse cx="150" cy="438" rx="78" ry="10" fill="#49423f" opacity=".3"/>
 <path d={look.body==="ممتلئ"?"M105 185 Q67 197 77 291 L100 316 L200 316 L223 291 Q232 197 195 185 Z":look.body==="نحيف"?"M118 185 Q91 195 93 288 L110 312 L190 312 L207 288 Q209 195 182 185 Z":"M110 185 Q77 195 84 292 L105 314 L195 314 L216 292 Q223 195 190 185 Z"} fill="url(#clothReal)" stroke="#41333a" strokeWidth="1.2"/>
 <path d="M111 300 L106 404 L143 404 L150 321 L158 404 L195 404 L189 300 Z" fill="url(#trouserReal)" stroke="#353138" strokeWidth="1.2"/>
 <path d="M106 398 L144 398 L145 427 Q126 435 94 428 Z M158 398 L196 398 L208 428 Q177 435 157 427 Z" fill={look.shoes}/>
 <path d="M107 189 L92 191 Q76 212 64 292 L84 300 L116 231 Z M193 189 L208 191 Q224 212 236 292 L216 300 L184 231 Z" fill={look.top} stroke="#41333a" strokeWidth="2"/>
 <path d="M64 291 Q65 316 79 319 Q89 313 84 298 Z M216 298 Q211 313 221 319 Q235 316 236 291 Z" fill="url(#skinReal)"/>
 <rect x="137" y="161" width="26" height="35" rx="10" fill={skin}/>
 <ellipse cx="150" cy="112" rx={faceWidth} ry={look.face==="عريض"?65:72} fill="url(#skinReal)" stroke="#785c50" strokeWidth=".7"/>
 <ellipse cx={150-faceWidth} cy="122" rx="7" ry="12" fill={skin}/><ellipse cx={150+faceWidth} cy="122" rx="7" ry="12" fill={skin}/>
 {look.hairStyle!=="أصلع"&&<path d={look.hairStyle==="طويل"?"M96 116 Q83 45 150 36 Q220 42 204 116 L209 188 L192 180 L195 100 Q150 69 105 99 L108 179 L91 189 Z":"M96 108 Q91 46 150 42 Q209 43 204 108 Q188 85 171 82 Q133 91 105 85 Z"} fill="url(#hairReal)"/>}
 <path d={look.brows==="رفيعة"?"M117 109 L139 107 M161 107 L183 109":"M115 108 Q127 102 140 107 M160 107 Q173 102 185 108"} stroke={hair} strokeWidth={look.brows==="رفيعة"?2:5} strokeLinecap="round" fill="none"/>
 <ellipse cx="128" cy="123" rx="10" ry="6" fill="#fff"/><ellipse cx="172" cy="123" rx="10" ry="6" fill="#fff"/>
 <circle cx="128" cy="123" r="5" fill={look.eyes==="أزرق"?"#447FA0":look.eyes==="أخضر"?"#547F5C":"#573D30"}/><circle cx="172" cy="123" r="5" fill={look.eyes==="أزرق"?"#447FA0":look.eyes==="أخضر"?"#547F5C":"#573D30"}/>
 <path d={look.nose==="طويل"?"M150 125 L145 157 Q150 162 158 157":"M150 132 L146 151 Q151 155 157 151"} stroke="#986B55" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
 <path d={look.mouth==="مبتسم"?"M130 170 Q150 186 170 170":look.mouth==="رفيع"?"M135 172 L165 172":"M134 172 Q150 178 166 172"} fill="none" stroke="#754D4B" strokeWidth="3" strokeLinecap="round"/>
 {look.beard&&<path d="M105 151 Q108 200 150 202 Q192 200 195 151 Q183 188 150 189 Q117 188 105 151" fill={hair} opacity=".85"/>}
 {look.glasses&&<g stroke="#292829" strokeWidth="3" fill="none"><rect x="111" y="114" width="35" height="24" rx="9"/><rect x="154" y="114" width="35" height="24" rx="9"/><path d="M146 120 Q150 116 154 120 M111 120 L98 116 M189 120 L202 116"/></g>}
 <path d="M107 183 Q120 194 136 197 M193 183 Q180 194 164 197 M150 210 L150 295 M112 309 Q150 320 188 309" fill="none" stroke="#eee7d7" opacity=".28" strokeWidth="1.2"/>
 <path d="M114 251 Q120 255 126 250 M174 250 Q180 255 186 251 M128 335 L123 393 M172 335 L177 393" fill="none" stroke="#000" opacity=".2" strokeWidth="2"/>
 <path d="M110 136 Q126 142 139 138 M161 138 Q175 142 190 136 M119 148 Q128 152 139 149 M161 149 Q174 152 181 148" fill="none" stroke="#603f36" strokeWidth="1" opacity=".28"/>
 <ellipse cx="125" cy="140" rx="13" ry="7" fill="#6e443a" opacity=".11" filter="url(#softPortrait)"/><ellipse cx="175" cy="140" rx="13" ry="7" fill="#6e443a" opacity=".11" filter="url(#softPortrait)"/>
 <path d="M141 161 Q150 165 160 161 M136 179 Q150 184 164 179" fill="none" stroke="#4e302d" strokeWidth=".8" opacity=".3"/>
 <rect x="0" y="0" width="300" height="460" filter="url(#grain)" opacity=".55" pointerEvents="none"/>
 <path d="M135 194 L150 207 L165 194" fill="none" stroke="#eee" strokeWidth="3"/>
 </svg></div>
 <p style={{textAlign:"center",fontWeight:700}}>{character} · المشهد {scene}</p>
 <p style={{fontSize:12,opacity:.75}}>معاينة ثنائية الأبعاد بإضاءة وظلال وخامات أكثر طبيعية. ما زالت ليست صورة فوتوغرافية أو نموذجًا ثلاثي الأبعاد.</p>
 </section>
 <section style={panel}><h2 style={{marginTop:0}}>اختيارات التصميم</h2>
 <label>الشخصية<input style={field} value={character} maxLength={100} onChange={e=>setCharacter(e.target.value)} placeholder="الجد حسن"/></label>
 <label>رقم المشهد<input style={field} value={scene} maxLength={30} onChange={e=>setScene(e.target.value)}/></label>
 <label>اسم التصميم<input style={field} value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} placeholder="الجد في البيت – الإطلالة الأولى"/></label>
 {([["face","شكل الوجه",["بيضاوي","عريض","نحيف"]],["body","بنية الجسم",["متوسط","نحيف","ممتلئ"]],["hairStyle","تسريحة الشعر",["قصير","طويل","أصلع"]],["eyes","لون العين",["بني","أخضر","أزرق"]],["brows","الحواجب",["عريضة","رفيعة"]],["nose","الأنف",["متوسط","طويل"]],["mouth","الفم",["عادي","مبتسم","رفيع"]]] as [keyof Look,string,string[]][]).map(([key,label,opts])=><label key={key} style={{display:"block",marginTop:12}}>{label}<select style={field} value={String(look[key])} onChange={e=>change(key,e.target.value as never)}>{opts.map(o=><option key={o}>{o}</option>)}</select></label>)}
 {(["skin","hair","top","bottom","shoes"] as const).map(key=><div key={key} style={{marginTop:14}}><strong>{{skin:"لون البشرة",hair:"لون الشعر",top:"الملابس العلوية",bottom:"البنطلون أو الجزء السفلي",shoes:"الحذاء"}[key]}</strong><div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:8}}>{palettes[key].map(color=><button key={color} type="button" aria-label={"اختيار اللون "+color} aria-pressed={look[key]===color} onClick={()=>change(key,color)} style={{width:39,height:39,background:color,border:look[key]===color?"3px solid #E5C590":"2px solid #fff7",borderRadius:"50%",cursor:"pointer"}}/>)}</div></div>)}
 <div style={{display:"flex",gap:18,marginTop:18,flexWrap:"wrap"}}><label><input type="checkbox" checked={look.glasses} onChange={e=>change("glasses",e.target.checked)}/> نظارة</label><label><input type="checkbox" checked={look.beard} onChange={e=>change("beard",e.target.checked)}/> لحية</label></div>
 <label style={{display:"block",marginTop:15}}>ملاحظات الملابس والمشهد<textarea style={{...field,minHeight:90}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="نوع القماش، الإكسسوارات، الحالة النفسية، وملاحظات التنفيذ"/></label>
 <div style={{display:"flex",gap:9,marginTop:16,flexWrap:"wrap"}}><button disabled={busy} onClick={save} style={{...field,width:"auto",background:"#D2B58D",color:"#211922",fontWeight:800,cursor:"pointer"}}>{busy?"جار الحفظ...":editId?"💾 حفظ التعديلات":"💾 حفظ التصميم على الموقع"}</button><button onClick={()=>{setEditId(null);setTitle("");setLook(initial);setNotes("");setMessage("تصميم جديد")}} style={{...field,width:"auto",cursor:"pointer"}}>تصميم جديد</button></div>
 </section></div>
 <section style={{...panel,marginTop:22}}><h2>📚 التصميمات المحفوظة للفريق ({items.length})</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,230px),1fr))",gap:12}}>{items.map(d=><article key={d.id} style={{background:"#261C25",borderRadius:12,padding:14,border:"1px solid #735566"}}><h3>{d.title}</h3><p>{d.character_name} · المشهد {d.scene_number}</p><p style={{fontSize:13,opacity:.7}}>{new Date(d.created_at).toLocaleDateString("ar-EG")}</p><button onClick={()=>open(d)} style={{...field,cursor:"pointer"}}>👁️ عرض التصميم {d.owner_id===user?"وتعديله":""}</button>{d.owner_id===user&&<button onClick={()=>remove(d)} style={{...field,marginTop:8,cursor:"pointer"}}>حذف</button>}</article>)}</div>{!items.length&&<p>لسه مفيش تصميمات. ابدؤوا بأول شخصية!</p>}</section>
 </main>
}