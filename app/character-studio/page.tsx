"use client";
import {useEffect,useState,useRef} from "react";
import {getSupabase} from "../../lib/supabase-browser";
type Look={skin:string;hair:string;hairStyle:string;face:string;eyes:string;brows:string;nose:string;mouth:string;top:string;bottom:string;shoes:string;glasses:boolean;beard:boolean;body:string;modelUrl?:string};
type Design={id:number;owner_id:string;title:string;character_name:string;scene_number:string;notes:string;appearance:Look;created_at:string};
const initial:Look={skin:"#C58E69",hair:"#39302C",hairStyle:"قصير",face:"بيضاوي",eyes:"بني",brows:"عريضة",nose:"متوسط",mouth:"عادي",top:"#B8A07A",bottom:"#333B48",shoes:"#292421",glasses:false,beard:false,body:"متوسط"};
const palettes={skin:["#E8C6A3","#C58E69","#A96E4F","#75462F","#4E3026"],hair:["#292321","#655041","#B5A48F","#E1D8CC","#171719"],top:["#B8A07A","#FFFFFF","#38536D","#6F3547","#4B614C","#242329"],bottom:["#333B48","#1F2227","#6D594A","#A29B8B","#42534A"],shoes:["#292421","#6A4B37","#A5A09B"]};
const field:React.CSSProperties={width:"100%",padding:12,borderRadius:10,border:"1px solid #80616B",background:"#251D24",color:"#fff",boxSizing:"border-box"};
const panel:React.CSSProperties={background:"#39242F",border:"1px solid #785968",borderRadius:18,padding:18};
const avatar3d = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;overflow:hidden;background:transparent"><div id="empty" style="position:absolute;inset:0;display:grid;place-items:center;color:#f6e9df;font:16px sans-serif;text-align:center;padding:24px;pointer-events:none">لا يوجد مجسم واقعي مرفوع بعد. ارفعي ملف شخصية GLB من الاختيارات أسفل المعاينة.</div><div id="error" style="position:absolute;inset:0;display:none;place-items:center;color:white;font:14px sans-serif;text-align:center;padding:20px"></div><script type="module">
import * as THREE from "https://esm.sh/three@0.170.0";
import {GLTFLoader} from "https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
let look={"skin":"#C58E69","hair":"#39302C","hairStyle":"قصير","face":"بيضاوي","eyes":"بني","brows":"عريضة","nose":"متوسط","mouth":"عادي","top":"#B8A07A","bottom":"#333B48","shoes":"#292421","glasses":false,"beard":false,"body":"متوسط"};
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,2.35,7.7);camera.lookAt(0,1.75,0);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x4c3741,2.2));const key=new THREE.DirectionalLight(0xffe5d4,3);key.position.set(-3,6,5);scene.add(key);const rim=new THREE.DirectionalLight(0xc5d5ff,1.6);rim.position.set(4,4,-3);scene.add(rim);
const root=new THREE.Group();scene.add(root);let avatar=new THREE.Group();root.add(avatar);let loadedModel=null;let loadedUrl="";const loader=new GLTFLoader();
function material(color,roughness=.87){return new THREE.MeshStandardMaterial({color,roughness,metalness:0})}
function sphere(parent,x,y,z,sx,sy,sz,mat){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh}
function cylinder(parent,a,b,r1,r2,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),diff=to.clone().sub(from);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,diff.length(),18),mat);mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());parent.add(mesh);return mesh}
function rebuild(){if(loadedModel){loadedModel.visible=false}root.remove(avatar);avatar=new THREE.Group();root.add(avatar);
const skin=material(look.skin),hair=material(look.hair),top=material(look.top),pants=material(look.bottom),shoes=material(look.shoes),white=material("#fffaf5"),iris=material(look.eyes==="أزرق"?"#527c9a":look.eyes==="أخضر"?"#51795b":"#513b2f"),dark=material("#242126"),lip=material("#895953");
const body=look.body==="ممتلئ"?1.18:look.body==="نحيف"?.85:1,face=look.face==="عريض"?1.12:look.face==="نحيف"?.88:1;
sphere(avatar,0,2.03,0,.49*body,.72,.27*body,top);sphere(avatar,0,1.58,0,.43*body,.26,.27*body,top);
cylinder(avatar,[-.23,1.52,0],[-.24,.56,0],.18,.14,pants);cylinder(avatar,[.23,1.52,0],[.24,.56,0],.18,.14,pants);
sphere(avatar,-.24,.47,.12,.2,.12,.34,shoes);sphere(avatar,.24,.47,.12,.2,.12,.34,shoes);
cylinder(avatar,[-.44*body,2.53,0],[-.63*body,1.68,0],.16,.13,top);cylinder(avatar,[.44*body,2.53,0],[.63*body,1.68,0],.16,.13,top);
sphere(avatar,-.64*body,1.6,0,.13,.16,.13,skin);sphere(avatar,.64*body,1.6,0,.13,.16,.13,skin);
cylinder(avatar,[0,2.65,0],[0,2.92,0],.17,.17,skin);
sphere(avatar,0,3.24,0,.35*face,.46,.32,skin);
sphere(avatar,-.35*face,3.23,0,.08,.12,.075,skin);sphere(avatar,.35*face,3.23,0,.08,.12,.075,skin);
sphere(avatar,-.145,3.27,.292,.095,.065,.035,white);sphere(avatar,.145,3.27,.292,.095,.065,.035,white);
sphere(avatar,-.145,3.27,.322,.045,.049,.019,iris);sphere(avatar,.145,3.27,.322,.045,.049,.019,iris);
sphere(avatar,-.145,3.27,.339,.022,.029,.009,dark);sphere(avatar,.145,3.27,.339,.022,.029,.009,dark);
sphere(avatar,-.145,3.365,.302,.12,look.brows==="رفيعة"?.014:.029,.026,hair);sphere(avatar,.145,3.365,.302,.12,look.brows==="رفيعة"?.014:.029,.026,hair);
sphere(avatar,0,3.13,.36,look.nose==="طويل"?.078:.065,look.nose==="طويل"?.16:.12,.10,skin);
sphere(avatar,0,2.975,.295,look.mouth==="رفيع"?.095:.125,look.mouth==="رفيع"?.009:.022,.016,lip);
if(look.hairStyle!=="أصلع"){sphere(avatar,0,3.58,-.045,.36*face,.21,.32,hair);if(look.hairStyle==="طويل"){sphere(avatar,-.29,3.12,-.10,.12,.55,.18,hair);sphere(avatar,.29,3.12,-.10,.12,.55,.18,hair)}}
if(look.beard){sphere(avatar,0,2.93,.13,.27,.16,.23,hair)}
if(look.glasses){const frame=material("#27272b",.5);for(const x of [-.145,.145]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.107,.012,8,32),frame);ring.position.set(x,3.27,.35);avatar.add(ring)}cylinder(avatar,[-.04,3.27,.35],[.04,3.27,.35],.012,.012,frame)}
}
function loadModel(url){document.getElementById("error").style.display="none";if(!url){if(loadedModel){root.remove(loadedModel);loadedModel=null;loadedUrl=""}avatar.visible=false;document.getElementById("empty").textContent="اختاري مجسم الجد الواقعي من المكتبة أدناه ثم ارفعي ملف GLB.";document.getElementById("empty").style.display="grid";return}if(url===loadedUrl)return;loadedUrl=url;document.getElementById("empty").textContent="جار تحميل المجسم ثلاثي الأبعاد...";document.getElementById("empty").style.display="grid";loader.load(url,gltf=>{if(loadedModel)root.remove(loadedModel);loadedModel=gltf.scene;const bounds=new THREE.Box3().setFromObject(loadedModel);const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());const scale=3.55/Math.max(size.y,.001);loadedModel.scale.setScalar(scale);loadedModel.position.set(-center.x*scale,.43-bounds.min.y*scale,-center.z*scale);root.add(loadedModel);avatar.visible=false;document.getElementById("empty").style.display="none";},undefined,()=>{loadedUrl="";document.getElementById("empty").style.display="none";document.getElementById("error").style.display="grid";document.getElementById("error").textContent="تعذر فتح النموذج. تأكدي إن الملف GLB صالح.";});}
avatar.visible=false;
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener("resize",resize);resize();
let down=false,last=0;renderer.domElement.addEventListener("pointerdown",e=>{down=true;last=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener("pointermove",e=>{if(down){root.rotation.y+=(e.clientX-last)*.012;last=e.clientX}});renderer.domElement.addEventListener("pointerup",()=>down=false);
renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();camera.position.z=Math.max(5,Math.min(11,camera.position.z+e.deltaY*.008))},{passive:false});
addEventListener("message",e=>{if(e.data?.kind==="look"&&e.data.look){look={...look,...e.data.look};if(look.modelUrl){loadModel(look.modelUrl)}else{loadModel("")}}});
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera)}animate();
</script></body></html>`;
export default function CharacterStudio(){
 const frameRef=useRef<HTMLIFrameElement>(null);
 const [modelBusy,setModelBusy]=useState(false);const [look,setLook]=useState<Look>(initial),[character,setCharacter]=useState("الجد حسن"),[scene,setScene]=useState("1"),[title,setTitle]=useState(""),[notes,setNotes]=useState(""),[items,setItems]=useState<Design[]>([]),[user,setUser]=useState(""),[editId,setEditId]=useState<number|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const change=<K extends keyof Look>(key:K,value:Look[K])=>setLook(p=>({...p,[key]:value}));
 async function load(){const db=getSupabase();if(!db)return;const {data:{user:u}}=await db.auth.getUser();if(!u){location.href="/login";return}setUser(u.id);const r=await db.from("studio_character_designs").select("*").order("created_at",{ascending:false}).limit(120);if(r.error)setMessage(r.error.message);else setItems(r.data||[])}
 useEffect(()=>{void load()},[]);
 useEffect(()=>{frameRef.current?.contentWindow?.postMessage({kind:"look",look},"*")},[look]);
 async function uploadModel(file:File){const db=getSupabase();if(!db||!user)return;if(!file.name.toLowerCase().endsWith(".glb")||file.size>25*1024*1024){setMessage("اختاري ملف GLB أقل من 25 ميجابايت");return}setModelBusy(true);const path=user+"/avatar-"+crypto.randomUUID()+".glb";const r=await db.storage.from("character-models").upload(path,file,{contentType:"model/gltf-binary"});setModelBusy(false);if(r.error){setMessage("فشل رفع المجسم: "+r.error.message);return}const url=db.storage.from("character-models").getPublicUrl(path).data.publicUrl;setLook(p=>({...p,modelUrl:url}));setMessage("تم رفع المجسم الواقعي. احفظي التصميم لربطه بالمشهد.")}
 async function save(){const db=getSupabase();if(!db||!user)return;if(!character.trim()||!title.trim()){setMessage("اكتبي اسم الشخصية واسم التصميم");return}setBusy(true);const data={owner_id:user,title:title.trim(),character_name:character.trim(),scene_number:scene.trim()||"1",notes:notes.trim(),appearance:look,updated_at:new Date().toISOString()};const r=editId?await db.from("studio_character_designs").update(data).eq("id",editId).eq("owner_id",user):await db.from("studio_character_designs").insert(data);setBusy(false);setMessage(r.error?"تعذر الحفظ: "+r.error.message:"تم حفظ تصميم الشخصية على الموقع ✓");if(!r.error){setEditId(null);await load()}}
 function open(d:Design){setLook({...initial,...d.appearance});setCharacter(d.character_name);setScene(d.scene_number);setTitle(d.title);setNotes(d.notes||"");setEditId(d.owner_id===user?d.id:null);window.scrollTo({top:0,behavior:"smooth"});setMessage(d.owner_id===user?"تم فتح تصميمك للتعديل":"تم فتح التصميم للمعاينة. للحفظ كنسخة جديدة غيّري الاسم واضغطي حفظ")}
 async function remove(d:Design){if(d.owner_id!==user||!confirm("حذف التصميم نهائيًا؟"))return;const db=getSupabase();if(!db)return;const r=await db.from("studio_character_designs").delete().eq("id",d.id).eq("owner_id",user);setMessage(r.error?r.error.message:"تم حذف التصميم");if(!r.error)await load()}
 const faceWidth=look.face==="عريض"?64:look.face==="نحيف"?46:56;
 const skin=look.skin,hair=look.hair;
 return <main dir="rtl" style={{maxWidth:1120,margin:"auto",padding:"24px 16px 120px",color:"#F5EDE8"}}>
 <h1>🎭 استوديو تصميم شخصيات 1960</h1><p>اختاري الشخصية والمشهد، وعدّلي شكل الأفاتار قدامك، وبعدها احفظي التصميم عشان كل الفريق يقدر يشوفه.</p>
 {message&&<p role="status" style={{padding:12,background:"#513445",borderRadius:10}}>{message}</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:18,alignItems:"start"}}>
 <section style={{...panel,position:"relative"}}>
 <h2 style={{marginTop:0}}>معاينة الشخصية ثلاثية الأبعاد</h2>
 <div style={{height:330,position:"relative",borderRadius:14,overflow:"hidden",background:"radial-gradient(circle at 50% 42%,#60545b,#241d25)"}}>
 <iframe title="عارض الشخصية ثلاثي الأبعاد" sandbox="allow-scripts" srcDoc={avatar3d} ref={frameRef} onLoad={()=>frameRef.current?.contentWindow?.postMessage({kind:"look",look},"*")} style={{border:0,width:"100%",height:"100%",display:"block"}}/>
 </div>
 <p style={{fontSize:12,opacity:.8,textAlign:"center"}}>اسحبي بإصبعك لتدوير الشخصية 360°، واستخدمي التكبير بإصبعين. المجسم الواقعي يظهر هنا بعد رفع ملف GLB.</p>
 <p style={{textAlign:"center",fontWeight:700}}>{character} · المشهد {scene}</p>
 <p style={{fontSize:12,opacity:.75}}>لن نعرض الأفاتار الكرتوني القديم. المعاينة الواقعية تتطلب رفع نموذج GLB صالح.</p>
 </section>
 <section style={panel}><h2 style={{marginTop:0}}>اختيارات التصميم</h2>
 <label>الشخصية<input style={field} value={character} maxLength={100} onChange={e=>setCharacter(e.target.value)} placeholder="الجد حسن"/></label>
 <label>رقم المشهد<input style={field} value={scene} maxLength={30} onChange={e=>setScene(e.target.value)}/></label>
 <label>اسم التصميم<input style={field} value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} placeholder="الجد في البيت – الإطلالة الأولى"/></label>
 {!look.modelUrl&&([["face","شكل الوجه",["بيضاوي","عريض","نحيف"]],["body","بنية الجسم",["متوسط","نحيف","ممتلئ"]],["hairStyle","تسريحة الشعر",["قصير","طويل","أصلع"]],["eyes","لون العين",["بني","أخضر","أزرق"]],["brows","الحواجب",["عريضة","رفيعة"]],["nose","الأنف",["متوسط","طويل"]],["mouth","الفم",["عادي","مبتسم","رفيع"]]] as [keyof Look,string,string[]][]).map(([key,label,opts])=><label key={key} style={{display:"block",marginTop:12}}>{label}<select style={field} value={String(look[key])} onChange={e=>change(key,e.target.value as never)}>{opts.map(o=><option key={o}>{o}</option>)}</select></label>)}
 {!look.modelUrl&&(["skin","hair","top","bottom","shoes"] as const).map(key=><div key={key} style={{marginTop:14}}><strong>{{skin:"لون البشرة",hair:"لون الشعر",top:"الملابس العلوية",bottom:"البنطلون أو الجزء السفلي",shoes:"الحذاء"}[key]}</strong><div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:8}}>{palettes[key].map(color=><button key={color} type="button" aria-label={"اختيار اللون "+color} aria-pressed={look[key]===color} onClick={()=>change(key,color)} style={{width:39,height:39,background:color,border:look[key]===color?"3px solid #E5C590":"2px solid #fff7",borderRadius:"50%",cursor:"pointer"}}/>)}</div></div>)}
 {!look.modelUrl&&<div style={{display:"flex",gap:18,marginTop:18,flexWrap:"wrap"}}><label><input type="checkbox" checked={look.glasses} onChange={e=>change("glasses",e.target.checked)}/> نظارة</label><label><input type="checkbox" checked={look.beard} onChange={e=>change("beard",e.target.checked)}/> لحية</label></div>
 {look.modelUrl&&<p style={{fontSize:13,padding:10,borderRadius:9,background:"#251d24"}}>المجسم المستورد جاهز بخاماته وملابسه. تغيير ملامحه أو تلبيسه قطعًا أخرى يحتاج نموذجًا مجهزًا للتعديل، لذلك أخفينا أدوات الأفاتار القديم غير الفعّالة.</p>}
 <label style={{display:"block",marginTop:15}}>ملاحظات الملابس والمشهد<textarea style={{...field,minHeight:90}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="نوع القماش، الإكسسوارات، الحالة النفسية، وملاحظات التنفيذ"/></label>
 <div style={{display:"flex",gap:9,marginTop:16,flexWrap:"wrap"}}><button disabled={busy} onClick={save} style={{...field,width:"auto",background:"#D2B58D",color:"#211922",fontWeight:800,cursor:"pointer"}}>{busy?"جار الحفظ...":editId?"💾 حفظ التعديلات":"💾 حفظ التصميم على الموقع"}</button><button onClick={()=>{setEditId(null);setTitle("");setLook(initial);setNotes("");setMessage("تصميم جديد")}} style={{...field,width:"auto",cursor:"pointer"}}>تصميم جديد</button></div>
 </section></div>
 <section style={{...panel,marginTop:22}}><h2>📚 التصميمات المحفوظة للفريق ({items.length})</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,230px),1fr))",gap:12}}>{items.map(d=><article key={d.id} style={{background:"#261C25",borderRadius:12,padding:14,border:"1px solid #735566"}}><h3>{d.title}</h3><p>{d.character_name} · المشهد {d.scene_number}</p><p style={{fontSize:13,opacity:.7}}>{new Date(d.created_at).toLocaleDateString("ar-EG")}</p><button onClick={()=>open(d)} style={{...field,cursor:"pointer"}}>👁️ عرض التصميم {d.owner_id===user?"وتعديله":""}</button>{d.owner_id===user&&<button onClick={()=>remove(d)} style={{...field,marginTop:8,cursor:"pointer"}}>حذف</button>}</article>)}</div>{!items.length&&<p>لسه مفيش تصميمات. ابدؤوا بأول شخصية!</p>}</section>
 </main>
}