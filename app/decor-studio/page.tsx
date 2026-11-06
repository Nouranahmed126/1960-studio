"use client";
import {useMemo,useState} from "react";
import SmartDecor from "./smart-decor";
import InteriorPlanner from "./interior-planner";
type Piece={id:number;type:string;x:number;y:number;rotation:number};
const catalog=[["sofa","كنبة كلاسيكية","🛋️",110,48],["chair","كرسي خشب","🪑",42,42],["table","ترابيزة صالون","▣",70,42],["tv","تليفزيون قديم","📺",52,35],["radio","راديو خشبي","📻",42,30],["archive","دولاب أرشيف","🗄️",78,34],["lamp","أباجورة","💡",28,28],["rug","سجادة شرقية","▦",135,90],["books","مكتبة","📚",90,32],["window","شباك خشب","▤",75,15],["door","باب","▯",58,16],["plant","نبات منزلي","🪴",32,32],["reel","بكرة فيلم أرشيفية","🎞️",35,35],["tape","مسجل شرائط","📼",46,30],["files","صناديق وثائق","📦",52,40],["photo","صورة عائلية قديمة","🖼️",42,18],["clock","ساعة حائط","🕰️",35,18],["desk","مكتب موظف الأرشيف","🗃️",105,58]] as const;
const presets=[{name:"صالون بيت الجد",description:"دفء البيت المصري وذكريات الإعلام القديم",wall:"#aa8771",floor:"#9d7357",pieces:[{type:"sofa",x:80,y:95},{type:"rug",x:170,y:195},{type:"table",x:195,y:222},{type:"tv",x:385,y:95},{type:"radio",x:350,y:330},{type:"books",x:75,y:335},{type:"lamp",x:65,y:215},{type:"photo",x:260,y:85},{type:"clock",x:315,y:85}]},{name:"غرفة الأرشيف",description:"أوراق وتسجيلات وشهادات محفوظة من الزمن",wall:"#817969",floor:"#746250",pieces:[{type:"archive",x:60,y:80},{type:"archive",x:180,y:80},{type:"books",x:330,y:80},{type:"table",x:225,y:220},{type:"chair",x:175,y:285},{type:"radio",x:340,y:325},{type:"reel",x:265,y:215},{type:"tape",x:325,y:240},{type:"files",x:105,y:305},{type:"desk",x:245,y:280}]},{name:"ركن الحفيدة",description:"زاوية طفلة في الثامنة داخل عالم الجد",wall:"#b6a08c",floor:"#b78c68",pieces:[{type:"rug",x:150,y:165},{type:"chair",x:85,y:105},{type:"table",x:235,y:200},{type:"books",x:335,y:95},{type:"lamp",x:365,y:280}]}];
const W=510,H=400;
const checklist=["مراجعة زمن كل قطعة ديكور","تجهيز مقتنيات الأرشيف","تأمين حركة الممثلين والطفلة","مراجعة زوايا الكاميرا والإضاءة","توثيق مواقع الأثاث بين اللقطات","فحص الضوضاء في موقع التصوير"];

function Decor3D({pieces,wall,floor,sceneName}:{pieces:Piece[];wall:string;floor:string;sceneName:string}){
 const [angle,setAngle]=useState(0);
 const [shot,setShot]=useState("wide");
 const [lighting,setLighting]=useState("warm");
 const [quality,setQuality]=useState("balanced");
 const payload=JSON.stringify({pieces,wall,floor,angle,shot,lighting,quality}).replace(/</g,"\\u003c");
 const srcDoc=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;overflow:hidden;background:#17171c"><div id="notice" style="position:absolute;left:12px;top:12px;color:#fff;font:12px system-ui;z-index:2;background:#0008;padding:6px;border-radius:6px">اسحبي لتدوير الكاميرا • عجلة الماوس للتقريب</div><script type="module">
 import * as THREE from 'https://esm.sh/three@0.169.0';
 const data=${payload};
 // CC0 chair model from Khronos glTF-Sample-Assets (Wayfair, 2020).
 const CHAIR_GLB='https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb';
 let chairTemplate=null;
 const chairGroups=[];
 async function loadChair(){
  try{
   const {GLTFLoader}=await import('https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js');
   const loader=new GLTFLoader();
   const gltf=await loader.loadAsync(CHAIR_GLB);
   chairTemplate=gltf.scene;
   for(const group of chairGroups)attachChair(group);
  }catch(err){console.warn('Optional chair model unavailable; keeping procedural furniture',err)}
 }
 function attachChair(group){
  if(!chairTemplate||!group.isObject3D)return;
  const model=chairTemplate.clone(true);
  const bounds=new THREE.Box3().setFromObject(model);
  const size=bounds.getSize(new THREE.Vector3());
  if(Math.min(size.x,size.y,size.z)<=0)return;
  const scale=Math.min(.9/size.x,1.2/size.y,.9/size.z);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const normalized=new THREE.Box3().setFromObject(model);
  const center=normalized.getCenter(new THREE.Vector3());
  model.position.set(-center.x,-normalized.min.y,-center.z);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  group.clear();group.add(model);
 }
 
 const scene=new THREE.Scene();scene.background=new THREE.Color('#211b20');
 const camera=new THREE.PerspectiveCamera(data.shot==='detail'?32:data.shot==='eye'?55:42,1,.1,100);const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,data.quality==='high'?2:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=data.lighting==='night'?.85:data.lighting==='day'?1.8:1.5;document.body.appendChild(renderer.domElement);
 const mat=(color,roughness=0.83)=>new THREE.MeshStandardMaterial({color,roughness});
 // Lightweight procedural materials: no remote image assets or extra downloads.
 function texture(kind,base,repeatX=1,repeatY=1){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  let seed=kind==='wood'?17:kind==='fabric'?41:kind==='rug'?67:83;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  if(kind==='wood'){
   for(let i=0;i<120;i++){const y=rand()*256;ctx.strokeStyle=rand()>.5?'rgba(45,21,9,.17)':'rgba(255,229,181,.14)';ctx.lineWidth=.3+rand()*2;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(75,y+rand()*7,170,y-rand()*7,256,y+rand()*5);ctx.stroke()}
  }else if(kind==='fabric'){
   for(let i=0;i<1900;i++){const x=rand()*256,y=rand()*256;ctx.fillStyle=rand()>.5?'rgba(255,255,255,.11)':'rgba(31,20,13,.12)';ctx.fillRect(x,y,rand()*2+1,rand()*2+1)}
  }else if(kind==='rug'){
   ctx.strokeStyle='rgba(241,213,160,.7)';ctx.lineWidth=7;ctx.strokeRect(15,15,226,226);ctx.lineWidth=2;ctx.strokeRect(28,28,200,200);
   for(let x=48;x<230;x+=46)for(let y=48;y<230;y+=46){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeStyle='rgba(245,220,169,.5)';ctx.lineWidth=3;ctx.strokeRect(-12,-12,24,24);ctx.restore()}
  }else{
   for(let i=0;i<1300;i++){ctx.fillStyle=rand()>.5?'rgba(255,255,255,.045)':'rgba(25,15,10,.04)';ctx.fillRect(rand()*256,rand()*256,2,2)}
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);return t;
 }
 const wood=new THREE.MeshStandardMaterial({map:texture('wood','#80563c'),roughness:.63});
 const dark=new THREE.MeshStandardMaterial({map:texture('wood','#423128'),roughness:.7});
 const fabric=new THREE.MeshStandardMaterial({map:texture('fabric','#b08d78'),roughness:1});
 const cream=new THREE.MeshStandardMaterial({map:texture('fabric','#d6c4a4'),roughness:1});
 const metal=new THREE.MeshStandardMaterial({color:'#777b7b',metalness:.7,roughness:.34});
 const glass=new THREE.MeshPhysicalMaterial({color:'#667d82',metalness:.08,roughness:.14,transparent:true,opacity:.8,clearcoat:1});
 const rugMaterial=new THREE.MeshStandardMaterial({map:texture('rug','#934c49'),roughness:1});
 const plaster=new THREE.MeshStandardMaterial({map:texture('plaster',data.wall,3,2),roughness:1});
 const parquet=new THREE.MeshStandardMaterial({map:texture('wood',data.floor,2,5),roughness:.75});
 function box(w,h,d,x,y,z,m,shadow=true){const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=shadow;a.receiveShadow=true;scene.add(a);return a}
 const floorMat=parquet;box(10,.18,8,0,-.12,0,floorMat,false);
 const wallMat=plaster;box(10,3.5,.15,0,1.65,-4,wallMat,false);box(.15,3.5,8,-5,1.65,0,wallMat,false);
 for(let i=-4;i<=4;i++){box(.035,.025,8,i,0,0,wood,false)}
 box(10,.1,.12,0,.12,-3.92,wood);box(.1,.1,8,-4.91,.12,0,wood);
 const hemi=new THREE.HemisphereLight(data.lighting==='night'?'#9aa7d9':data.lighting==='day'?'#ffffff':'#fff1d5','#493128',data.lighting==='night'?.7:2.1);scene.add(hemi);
 const key=new THREE.DirectionalLight(data.lighting==='night'?'#a7b5e4':data.lighting==='day'?'#ffffff':'#ffe1b0',data.lighting==='night'?.8:3);key.position.set(1,8,5);key.castShadow=true;key.shadow.mapSize.set(data.quality==='high'?2048:1024,data.quality==='high'?2048:1024);key.shadow.bias=-.0002;key.shadow.radius=3;key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;scene.add(key);
 const bulb=new THREE.PointLight('#ffb86d',data.lighting==='night'?12:data.lighting==='day'?2:20,12);bulb.position.set(-3.2,2.6,-2.5);scene.add(bulb);
 function make(p){const group=new THREE.Group();scene.add(group);group.position.set((p.x/510-.5)*9,0,(p.y/400-.5)*7);group.rotation.y=-p.rotation*Math.PI/180;
 function part(w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o}
 function rounded(w,h,d,x,y,z,m,r=.07){
  const shape=new THREE.Shape();const a=-w/2,b=-h/2;
  shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);
  shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);
  shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);
  shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1,curveSegments:3});
  geo.rotateX(-Math.PI/2);geo.translate(0,d/2,0);
  const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 function cylinder(radiusTop,radiusBottom,height,x,y,z,m,segments=16){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),m);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 function sphere(radius,x,y,z,m){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),m);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 const t=p.type;
 if(t==='rug'){part(2.3,.035,1.5,0,.04,0,rugMaterial);part(2,.04,1.2,0,.07,0,rugMaterial)}
 else if(t==='sofa'){
  part(2.1,.22,.9,0,.32,0,wood);
  rounded(1.75,.32,.74,0,.59,.08,fabric);
  rounded(1.95,.68,.24,0,.92,-.35,fabric);
  for(const x of [-.97,.97]){rounded(.2,.53,.87,x,.67,0,wood);part(.12,.13,.12,x,.12,-.29,dark);part(.12,.13,.12,x,.12,.29,dark)}
  for(const x of [-.44,.44]){rounded(.82,.13,.67,x,.8,.09,cream);rounded(.75,.52,.16,x,1.02,-.23,fabric)}
  for(const x of [-.66,.66])rounded(.32,.25,.13,x,.95,.28,cream);
 }
 else if(t==='chair'){rounded(.68,.12,.65,0,.55,0,fabric);rounded(.68,.82,.13,0,1,-.28,wood);rounded(.55,.46,.08,0,1.08,-.19,fabric);for(const x of [-.27,.27])for(const z of [-.24,.24])part(.075,.53,.075,x,.28,z,wood);chairGroups.push(group)}
 else if(t==='table'){
  rounded(1.35,.1,.85,0,.72,0,wood,.13);
  for(const x of [-.52,.52])for(const z of [-.28,.28])cylinder(.055,.08,.64,x,.34,z,wood,12);
  part(.88,.065,.055,0,.39,-.27,dark);
 }
 else if(t==='tv'){part(.95,.78,.48,0,.83,0,wood);part(.73,.52,.04,-.02,.87,.26,glass);part(.16,.25,.08,.34,.85,.3,metal);part(.8,.13,.7,0,.35,0,dark)}
 else if(t==='radio'){part(.8,.46,.34,0,.72,0,wood);part(.5,.25,.03,-.1,.75,.19,cream);part(.12,.12,.05,.28,.75,.2,metal)}
 else if(t==='archive'){part(1.3,2.25,.62,0,1.13,0,metal);for(let y=.35;y<2.1;y+=.44){part(1.12,.04,.04,0,y,.33,dark);part(.3,.04,.04,0,y+.16,.35,cream)}}
 else if(t==='books'){part(1.4,2.1,.45,0,1.05,0,wood);for(let y=.4;y<2;y+=.42){part(1.28,.05,.4,0,y,0,dark);for(let x=-.5;x<.6;x+=.18)part(.11,.31,.28,x,y+.17,0,mat(['#835748','#526456','#aa8c60'][Math.floor((x+1)*4)%3]))}}
 else if(t==='lamp'){part(.34,.1,.34,0,.06,0,metal);part(.07,1.15,.07,0,.67,0,metal);part(.7,.5,.7,0,1.35,0,cream)}
 else if(t==='plant'){
  const terracotta=mat('#b87552');cylinder(.24,.18,.38,0,.25,0,terracotta,20);
  cylinder(.26,.26,.06,0,.45,0,terracotta,20);
  const stem=mat('#526b3e');cylinder(.028,.045,.9,0,.85,0,stem,10);
  const greens=[mat('#54764b'),mat('#688b51'),mat('#3f6547')];
  for(let i=0;i<9;i++){
   const a=i*2.39996;const radius=.2+(i%3)*.075;const leaf=sphere(.2,Math.cos(a)*radius,.92+(i%4)*.15,Math.sin(a)*radius,greens[i%3]);
   leaf.scale.set(1.25,.42,.6);leaf.rotation.y=a;
  }
 }
 else if(t==='window'){part(1.4,1.5,.08,0,1.55,-.08,wood);part(1.2,1.3,.05,0,1.55,0,glass);part(.08,1.4,.08,0,1.55,.06,wood);part(1.3,.08,.08,0,1.55,.06,wood)}
 else if(t==='door'){part(1.05,2.1,.1,0,1.05,0,wood);part(.08,.08,.1,.4,1.08,.1,metal)}
 else if(t==='desk'){part(1.7,.14,.85,0,.76,0,wood);for(const x of [-.72,.72])part(.13,.75,.75,x,.38,0,wood);part(.55,.35,.7,.42,.53,0,dark);part(.36,.04,.04,.45,.56,.4,metal)}
 else if(t==='files'){for(let i=0;i<3;i++){part(.7,.42,.52,(i-1)*.18,.22+i*.42,0,mat(i%2?'#9c825e':'#756b4e'));part(.25,.07,.02,(i-1)*.18,.32+i*.42,.27,cream)}}
 else if(t==='reel'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.32,.065,12,36),metal);ring.rotation.x=Math.PI/2;ring.position.y=.52;ring.castShadow=true;group.add(ring);part(.35,.12,.35,0,.12,0,dark)}
 else if(t==='tape'){part(.85,.25,.55,0,.28,0,dark);for(const x of [-.23,.23]){const disk=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.035,24),metal);disk.position.set(x,.43,0);disk.castShadow=true;group.add(disk)}part(.4,.04,.05,0,.42,.28,cream)}
 else if(t==='photo'){part(.68,.55,.06,0,1.4,0,wood);part(.5,.37,.07,0,1.4,.045,mat('#b99d76'))}
 else if(t==='clock'){const disk=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.07,32),cream);disk.rotation.x=Math.PI/2;disk.position.y=1.75;group.add(disk);part(.025,.2,.025,0,1.8,.06,dark)}
 }
 data.pieces.forEach(make);if(chairGroups.length)loadChair();
 let theta=-.65+data.angle*Math.PI/180,phi=data.shot==='eye'?1.37:data.shot==='detail'?1.15:.92,radius=data.shot==='detail'?8:data.shot==='eye'?10:15;const target=new THREE.Vector3(0,data.shot==='eye'?1.15:.6,0);
 function view(){camera.position.set(Math.sin(theta)*Math.sin(phi)*radius,Math.cos(phi)*radius+target.y,Math.cos(theta)*Math.sin(phi)*radius);camera.lookAt(target)}
 view();let dragging=false,px=0,py=0;
 renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
 renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;theta-=(e.clientX-px)*.007;phi=Math.max(.25,Math.min(1.5,phi+(e.clientY-py)*.007));px=e.clientX;py=e.clientY;view()});
 renderer.domElement.addEventListener('pointerup',()=>dragging=false);
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(6,Math.min(26,radius+e.deltaY*.015));view()},{passive:false});
 function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}addEventListener('resize',resize);resize();
 function render(){requestAnimationFrame(render);renderer.render(scene,camera)}render();
 </script></body></html>`;
 return <section style={{background:"#241d22",padding:16,borderRadius:16,border:"1px solid #84675c",marginBottom:20}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}><div><h2 style={{margin:"0 0 6px"}}>🎬 معاينة ثلاثية الأبعاد — {sceneName}</h2><p style={{fontSize:13,margin:"0 0 12px"}}>غرفة بإضاءة دافئة وأثاث ثلاثي الأبعاد مبدئي؛ أي تعديل على المخطط يظهر هنا، مع اختبار زوايا التصوير والإضاءة.</p></div><button onClick={()=>setAngle(v=>(v+45)%360)} style={{padding:"10px 14px",borderRadius:9,cursor:"pointer"}}>↻ تدوير الكاميرا</button></div>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"0 0 12px"}}>
 <label style={{fontSize:13}}>زاوية التصوير <select value={shot} onChange={e=>setShot(e.target.value)} style={{padding:8,borderRadius:8,marginRight:6}}><option value="wide">لقطة تأسيسية واسعة</option><option value="eye">مستوى نظر الشخصيات</option><option value="detail">لقطة تفاصيل الديكور</option></select></label>
 <label style={{fontSize:13}}>الإضاءة <select value={lighting} onChange={e=>setLighting(e.target.value)} style={{padding:8,borderRadius:8,marginRight:6}}><option value="warm">دفء البيت مساءً</option><option value="day">ضوء نهاري</option><option value="night">ليل هادئ</option></select></label>
 <label style={{fontSize:13}}>جودة العرض <select value={quality} onChange={e=>setQuality(e.target.value)} style={{padding:8,borderRadius:8,marginRight:6}}><option value="balanced">متوازنة للموبايل</option><option value="high">عالية التفاصيل</option></select></label>
 </div><iframe key={srcDoc} title="معاينة ديكور فيلم 1960 ثلاثية الأبعاد" srcDoc={srcDoc} sandbox="allow-scripts" style={{display:"block",width:"100%",height:"min(62vw,480px)",minHeight:290,border:0,borderRadius:12,background:"#17171c"}}/>
 </section>
}

export default function DecorStudio(){
 const [continuity,setContinuity]=useState<Piece[]|null>(null);const [savedScenes,setSavedScenes]=useState<{key:string;name:string}[]>([]);const [ready,setReady]=useState<number[]>([]),[sceneNumber,setSceneNumber]=useState("1"),[scenePeriod,setScenePeriod]=useState("الحاضر"),[sceneOwner,setSceneOwner]=useState("");
 const [scene,setScene]=useState(0),[pieces,setPieces]=useState<Piece[]>(()=>presets[0].pieces.map((p,i)=>({...p,id:i+1,rotation:0}))),[selected,setSelected]=useState<number|null>(null),[wall,setWall]=useState(presets[0].wall),[floor,setFloor]=useState(presets[0].floor),[sceneName,setSceneName]=useState("صالون بيت الجد"),[notes,setNotes]=useState(""),[status,setStatus]=useState(""),[grid,setGrid]=useState(true);
 const [beforeSmartDesign,setBeforeSmartDesign]=useState<{sceneName:string;wall:string;floor:string;pieces:Piece[]}|null>(null);
 function undoSmartDesign(){if(!beforeSmartDesign)return;setSceneName(beforeSmartDesign.sceneName);setWall(beforeSmartDesign.wall);setFloor(beforeSmartDesign.floor);setPieces(beforeSmartDesign.pieces);setBeforeSmartDesign(null);setSelected(null);setStatus("تم استرجاع التصميم السابق")}
 const chosen=pieces.find(p=>p.id===selected);const meta=useMemo(()=>Object.fromEntries(catalog.map(x=>[x[0],x])),[]);
 function apply(i:number){const p=presets[i];setScene(i);setSceneName(p.name);setWall(p.wall);setFloor(p.floor);setPieces(p.pieces.map((q,j)=>({...q,id:Date.now()+j,rotation:0})));setSelected(null);setStatus("تم فتح تصور "+p.name)}
 function add(type:string){const id=Date.now();setPieces(p=>[...p,{id,type,x:240,y:170,rotation:0}]);setSelected(id)}
 function move(e:React.PointerEvent<SVGSVGElement>){if(selected===null||e.buttons!==1)return;const r=e.currentTarget.getBoundingClientRect();const x=Math.max(10,Math.min(W-10,(e.clientX-r.left)*W/r.width));const y=Math.max(10,Math.min(H-10,(e.clientY-r.top)*H/r.height));setPieces(p=>p.map(a=>a.id===selected?{...a,x:Math.round(x/5)*5,y:Math.round(y/5)*5}:a))}
 function save(){const data={sceneName,scene,wall,floor,pieces,notes,ready,sceneNumber,scenePeriod,sceneOwner,updatedAt:new Date().toISOString()};localStorage.setItem("1960-decor-scene",JSON.stringify(data));setStatus("✓ اتحفظ التصميم على الجهاز الحالي")}
 function restore(){try{const s=JSON.parse(localStorage.getItem("1960-decor-scene")||"null");if(!s){setStatus("مفيش تصميم محفوظ على الجهاز");return}setSceneName(s.sceneName);setWall(s.wall);setFloor(s.floor);setPieces(s.pieces);setNotes(s.notes||"");setReady(Array.isArray(s.ready)?s.ready:[]);setSceneNumber(s.sceneNumber||"1");setScenePeriod(s.scenePeriod||"الحاضر");setSceneOwner(s.sceneOwner||"");setStatus("✓ تم فتح التصميم المحفوظ")}catch{setStatus("تعذر فتح التصميم")}}
 function importFile(file:File){if(file.size>1000000){setStatus("الملف أكبر من المسموح (1 ميجابايت)");return}const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(String(reader.result));if(data.project!=="1960"||!Array.isArray(data.pieces)||data.pieces.length>100||!data.pieces.every((p:Piece)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.rotation)&&catalog.some(m=>m[0]===p.type))){throw Error("invalid")}setSceneName(String(data.sceneName||"مشهد مستورد").slice(0,80));setWall(/^#[0-9a-fA-F]{6}$/.test(data.wall)?data.wall:"#aa8771");setFloor(/^#[0-9a-fA-F]{6}$/.test(data.floor)?data.floor:"#9d7357");setPieces(data.pieces.map((p:Piece,i:number)=>({id:i+1,type:p.type,x:Math.max(0,Math.min(W,p.x)),y:Math.max(0,Math.min(H,p.y)),rotation:p.rotation%360})));setNotes(String(data.notes||"").slice(0,2000));setReady(Array.isArray(data.ready)?data.ready.filter((n:number)=>Number.isInteger(n)&&n>=0&&n<checklist.length):[]);setSceneNumber(String(data.sceneNumber||"1").slice(0,20));setScenePeriod(String(data.scenePeriod||"الحاضر").slice(0,80));setSceneOwner(String(data.sceneOwner||"").slice(0,100));setSelected(null);setStatus("✓ تم استيراد المخطط بنجاح")}catch{setStatus("ملف غير صالح: اختاري ملف ديكور صادر من الاستوديو")}};reader.readAsText(file)}
 function listScenes(){const items:{key:string;name:string}[]=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith("1960-decor-scene-")){try{const d=JSON.parse(localStorage.getItem(key)||"{}");items.push({key,name:String(d.sceneName||"مشهد").slice(0,60)})}catch{}}}setSavedScenes(items.sort((a,b)=>a.key.localeCompare(b.key)))}
 function duplicateScene(){setSceneNumber(prev=>prev+"-B");setReady([]);setSelected(null);setStatus("تم نسخ توزيع الديكور لمشهد جديد. عدلي رقم المشهد واحفظيه بدون تغيير الأصل")}
 function lockContinuity(){setContinuity(pieces.map(p=>({...p})));setStatus("✓ تم تثبيت مرجع استمرارية الديكور للمقارنة")}
 function compareContinuity(){if(!continuity){setStatus("ثبتي مرجع الاستمرارية أولًا");return}const old=new Map(continuity.map(p=>[p.id,p]));const changed=pieces.filter(p=>{const prev=old.get(p.id);return !prev||prev.x!==p.x||prev.y!==p.y||prev.rotation!==p.rotation}).length;const removed=continuity.filter(p=>!pieces.some(q=>q.id===p.id)).length;setStatus(changed===0&&removed===0?"✓ توزيع الأثاث مطابق للمرجع":`اختلافات الاستمرارية: ${changed} قطعة مضافة أو متحركة، و${removed} قطعة محذوفة`)}
 function saveScene(){const key="1960-decor-scene-"+sceneNumber.trim();if(!sceneNumber.trim()){setStatus("اكتبي رقم المشهد أولًا");return}const data={sceneName,scene,wall,floor,pieces,notes,ready,sceneNumber,scenePeriod,sceneOwner};try{localStorage.setItem(key,JSON.stringify(data));listScenes();setStatus("✓ تم حفظ المشهد رقم "+sceneNumber)}catch{setStatus("تعذر حفظ المشهد على هذا الجهاز")}}
 function loadScene(key:string){try{const d=JSON.parse(localStorage.getItem(key)||"null");if(!d||!Array.isArray(d.pieces))throw Error("invalid");setSceneName(d.sceneName||"مشهد");setScene(Number(d.scene)||0);setWall(d.wall);setFloor(d.floor);setPieces(d.pieces);setNotes(d.notes||"");setReady(d.ready||[]);setSceneNumber(d.sceneNumber||"1");setScenePeriod(d.scenePeriod||"الحاضر");setSceneOwner(d.sceneOwner||"");setSelected(null);setStatus("✓ تم فتح المشهد")}catch{setStatus("تعذر فتح المشهد")}}
 function deleteScene(key:string){if(!confirm("حذف المشهد المحفوظ من هذا الجهاز؟"))return;localStorage.removeItem(key);listScenes();setStatus("تم حذف المشهد المحفوظ")}
  function exportInventory(){const counts=catalog.map(item=>({name:item[1],count:pieces.filter(p=>p.type===item[0]).length})).filter(item=>item.count>0);const rows=[["المشهد","القطعة","العدد","المسؤول"],...counts.map(item=>[sceneNumber,item.name,String(item.count),sceneOwner])];const csv="\uFEFF"+rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="1960-scene-"+sceneNumber.replace(/[^a-zA-Z0-9_-]/g,"_")+"-inventory.csv";link.click();URL.revokeObjectURL(url);setStatus("تم تصدير جرد المقتنيات إلى CSV")}
 function exportProductionSheet(){const escape=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");const counts=catalog.map(item=>({name:item[1],count:pieces.filter(p=>p.type===item[0]).length})).filter(item=>item.count>0);const checks=checklist.map((item,i)=>"<li>"+(ready.includes(i)?"☑":"☐")+" "+escape(item)+"</li>").join("");const props=counts.map(item=>"<tr><td>"+escape(item.name)+"</td><td>"+item.count+"</td></tr>").join("");const html='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>1960 - '+escape(sceneName)+'</title><style>body{font:16px Tahoma,Arial,sans-serif;max-width:850px;margin:40px auto;color:#292226;line-height:1.8}h1{border-bottom:3px solid #8e6752;padding-bottom:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:8px;text-align:right}li{margin:5px 0}.meta{background:#f2ece6;padding:16px;border-radius:8px}pre{white-space:pre-wrap;font:inherit}@media print{body{margin:15mm}}</style></head><body><h1>1960 | بطاقة تجهيز ديكور المشهد</h1><div class="meta"><b>المشهد:</b> '+escape(sceneNumber)+' — '+escape(sceneName)+'<p><b>الزمن الدرامي:</b> '+escape(scenePeriod)+'</p><p><b>مسؤول الديكور:</b> '+escape(sceneOwner||"غير محدد")+'</p></div><h2>جرد المقتنيات</h2><table><tr><th>القطعة</th><th>العدد</th></tr>'+props+'</table><h2>قائمة الجاهزية ('+ready.length+'/'+checklist.length+')</h2><ul>'+checks+'</ul><h2>ملاحظات المشهد</h2><pre>'+escape(notes||"لا توجد ملاحظات")+'</pre><p>ورقة إنتاج قابلة للطباعة — القياسات في مخطط الاستوديو تقريبية.</p></body></html>';const url=URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="1960-scene-"+sceneNumber.replace(/[^a-zA-Z0-9_-]/g,"_")+"-sheet.html";link.click();URL.revokeObjectURL(url);setStatus("تم تنزيل بطاقة إنتاج قابلة للطباعة")}
  function exportFile(){const data=JSON.stringify({project:"1960",sceneName,wall,floor,pieces,notes,ready,sceneNumber,scenePeriod,sceneOwner},null,2);const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="1960-decor-scene.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const surface:React.CSSProperties={background:"#2c2227",border:"1px solid #84675c",borderRadius:16,padding:16};const button:React.CSSProperties={border:"1px solid #ac8a67",borderRadius:10,padding:"10px 12px",cursor:"pointer",fontWeight:700};
 return <main dir="rtl" style={{maxWidth:1250,margin:"auto",padding:"28px 16px 140px",color:"#f4e6d5",fontFamily:"system-ui"}}>
 <div style={{marginBottom:24}}><div style={{fontSize:12,letterSpacing:3,color:"#d6b68a"}}>1960 • PRODUCTION DESIGN</div><h1 style={{fontSize:"clamp(26px,5vw,44px)",margin:"6px 0"}}>🏠 استوديو الديكور السينمائي</h1><p style={{maxWidth:750,lineHeight:1.8}}>صممي أماكن فيلم «1960» بروح البيت المصري القديم: صالون الجد، غرفة الأرشيف، وركن الحفيدة ذات الـ8 سنوات. اسحبي قطع الأثاث على المخطط، وغيّري الألوان واحفظي تصور المشهد.</p></div>
 <SmartDecor onApply={draft=>{setBeforeSmartDesign({sceneName,wall,floor,pieces:pieces.map(p=>({...p}))});setSceneName(draft.name);setWall(draft.wall);setFloor(draft.floor);setPieces(draft.pieces);setSelected(null);setStatus("تم تطبيق اقتراح الديكور، راجعي المخطط ثم احفظيه");}}/>{beforeSmartDesign&&<div style={{padding:12,marginBottom:14,border:"1px solid #ac8a67",borderRadius:12,background:"#2c2227"}}><span>التصميم السابق محفوظ مؤقتًا أثناء الجلسة.</span> <button onClick={undoSmartDesign} style={{padding:"8px 12px",cursor:"pointer",borderRadius:8}}>↶ التراجع عن تطبيق التصميم الذكي</button></div>}<InteriorPlanner pieces={pieces} setPieces={setPieces} selected={selected} setSelected={setSelected}/>
 <Decor3D pieces={pieces} wall={wall} floor={floor} sceneName={sceneName}/><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:18,alignItems:"start"}}>
 <section style={surface}><h2 style={{marginTop:0}}>لوحة المشهد</h2><label style={{display:"block",marginBottom:10}}>اسم الديكور<input value={sceneName} onChange={e=>setSceneName(e.target.value)} style={{width:"100%",padding:10,marginTop:5,borderRadius:8}}/></label>
 <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{presets.map((p,i)=><button key={p.name} style={{...button,background:i===scene?"#d6b68a":"#49353a"}} onClick={()=>apply(i)}>{p.name}</button>)}</div>
 <svg viewBox="0 0 510 400" onPointerMove={move} onPointerUp={()=>{}} style={{width:"100%",touchAction:"none",borderRadius:12,background:floor,border:"9px solid "+wall,boxSizing:"border-box",cursor:selected?"move":"default"}} role="img" aria-label="مخطط الديكور التفاعلي">
 {grid&&Array.from({length:10},(_,i)=><g key={i} stroke="#fff" strokeOpacity=".13" strokeWidth=".6"><path d={`M ${i*50+25} 0 V 400`}/><path d={`M 0 ${i*40+20} H 510`}/></g>)}
 {pieces.map(p=>{const m=meta[p.type];if(!m)return null;const width=Number(m[3]),height=Number(m[4]);return <g key={p.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`} onPointerDown={e=>{e.stopPropagation();setSelected(p.id);e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId)}} onClick={()=>setSelected(p.id)} style={{cursor:"grab"}}>
 <rect x={-width/2} y={-height/2} width={width} height={height} rx="5" fill={p.type==="rug"?"#8b4145":p.type==="sofa"?"#b39478":p.type==="archive"?"#76553e":"#dfc8a4"} stroke={selected===p.id?"#fff7b3":"#573c2e"} strokeWidth={selected===p.id?3:1.5}/>
 <text textAnchor="middle" dominantBaseline="middle" fontSize={p.type==="rug"?25:20} fill="#4e292c">{m[2]}</text><text y={height/2+12} textAnchor="middle" fontSize="10" fill="#fff" stroke="#241d20" strokeWidth="2" paintOrder="stroke">{m[1]}</text>
 </g>})}</svg>
 <p style={{fontSize:12,opacity:.8}}>مخطط علوي تفاعلي، وليس عرضًا ثلاثي الأبعاد. اضغطي على القطعة ثم اسحبيها لمكانها. القياسات تقريبية للتخطيط الفني.</p>
 <label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/> إظهار شبكة القياس</label>
 </section>
 <section style={surface}><h2 style={{marginTop:0}}>مكتبة عناصر الفيلم</h2><p style={{fontSize:13}}>اختاري قطعة لإضافتها إلى المشهد:</p><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{catalog.map(m=><button key={m[0]} style={{...button,textAlign:"right",background:"#47363a",color:"#f5e7d5"}} onClick={()=>add(m[0])}><span style={{fontSize:22,marginLeft:8}}>{m[2]}</span>{m[1]}</button>)}</div>
 <div style={{marginTop:16,padding:12,border:"1px solid #72595c",borderRadius:12}}><h3 style={{marginTop:0}}>ضبط القطعة المختارة</h3>{chosen?<><strong>{meta[chosen.type]?.[1]}</strong><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><button style={button} onClick={()=>setPieces(p=>p.map(a=>a.id===selected?{...a,rotation:(a.rotation+45)%360}:a))}>↻ تدوير 45°</button><button style={button} onClick={()=>{setPieces(p=>p.filter(a=>a.id!==selected));setSelected(null)}}>🗑 حذف</button></div></>:<p style={{fontSize:13}}>اضغطي على أي قطعة في المخطط لتعديلها.</p>}</div>
 <h3>الخامات والألوان</h3><div style={{display:"flex",gap:16,flexWrap:"wrap"}}><label>الجدران <input type="color" value={wall} onChange={e=>setWall(e.target.value)} style={{display:"block",width:70,height:40}}/></label><label>الأرضية <input type="color" value={floor} onChange={e=>setFloor(e.target.value)} style={{display:"block",width:70,height:40}}/></label></div>
 <div style={{marginTop:18,padding:14,border:"1px solid #84675c",borderRadius:12,background:"#382b30"}}>
 <h3 style={{marginTop:0}}>بطاقة المشهد للتصوير</h3>
 <label>رقم المشهد<input value={sceneNumber} onChange={e=>setSceneNumber(e.target.value)} maxLength={20} style={{display:"block",padding:8,width:"100%",marginBottom:10}}/></label>
 <label>الزمن الدرامي<input value={scenePeriod} onChange={e=>setScenePeriod(e.target.value)} maxLength={80} style={{display:"block",padding:8,width:"100%",marginBottom:10}}/></label>
 <label>مسؤول الديكور<input value={sceneOwner} onChange={e=>setSceneOwner(e.target.value)} maxLength={100} style={{display:"block",padding:8,width:"100%",marginBottom:10}}/></label>
 <h4>جاهزية المشهد ({ready.length}/{checklist.length})</h4>
 {checklist.map((item,i)=><label key={i} style={{display:"flex",gap:8,margin:"9px 0",fontSize:13}}><input type="checkbox" checked={ready.includes(i)} onChange={e=>setReady(prev=>e.target.checked?[...prev,i]:prev.filter(n=>n!==i))}/>{item}</label>)}
 </div><div style={{marginTop:12,borderTop:"1px solid #84675c",paddingTop:12}}>
 <h4>مكتبة مشاهد الفيلم على الجهاز</h4>
 <div style={{padding:10,background:"#44343a",borderRadius:10,marginBottom:12}}>
 <strong>استمرارية الديكور بين اللقطات</strong>
 <p style={{fontSize:12,opacity:.85}}>ثبتي أماكن الأثاث قبل التصوير، ثم قارني أي تعديل بالمرجع. المرجع مؤقت للجلسة الحالية.</p>
 <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
 <button style={button} onClick={lockContinuity}>تثبيت مرجع الديكور</button>
 <button style={button} onClick={compareContinuity}>مقارنة الاستمرارية</button>
 <button style={button} onClick={duplicateScene}>نسخ لمشهد جديد</button>
 </div></div>
 <h4>جرد مقتنيات المشهد ({pieces.length} قطعة)</h4>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><button style={button} onClick={exportInventory}>تصدير جرد CSV</button><button style={button} onClick={exportProductionSheet}>تنزيل بطاقة المشهد للطباعة</button></div>
 <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{catalog.filter(item=>pieces.some(p=>p.type===item[0])).map(item=><span key={item[0]} style={{background:"#58434a",borderRadius:8,padding:"5px 8px",fontSize:12}}>{item[2]} {item[1]} × {pieces.filter(p=>p.type===item[0]).length}</span>)}</div>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={button} onClick={saveScene}>حفظ المشهد برقمِه</button><button style={button} onClick={listScenes}>عرض المشاهد المحفوظة</button></div>
 {savedScenes.map(item=><div key={item.key} style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #6a5054"}}><span style={{fontSize:13}}>{item.name} — {item.key.replace("1960-decor-scene-","")}</span><div style={{display:"flex",gap:6}}><button onClick={()=>loadScene(item.key)} style={button}>فتح</button><button onClick={()=>deleteScene(item.key)} style={button}>حذف</button></div></div>)}
 <p style={{fontSize:12,opacity:.8}}>المشاهد محفوظة على نفس المتصفح فقط. لتبادلها بين أعضاء الفريق استخدمي التصدير والاستيراد.</p>
 </div><h3>ملاحظات مصمم الديكور</h3><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="الإضاءة، حالة الأثاث، الإكسسوارات، زاوية الكاميرا، زمن المشهد..." style={{width:"100%",padding:12,borderRadius:10}}/>
 <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}><button style={button} onClick={save}>💾 حفظ على الجهاز</button><button style={button} onClick={restore}>📂 فتح المحفوظ</button><button style={button} onClick={exportFile}>⬇️ تصدير المخطط</button><label style={{...button,background:"#eee2cc",color:"#32252a",display:"inline-block"}}>📥 استيراد تصميم<input type="file" accept=".json,application/json" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)importFile(f);e.target.value=""}}/></label></div>{status&&<p role="status" style={{color:"#ead0a4"}}>{status}</p>}
 </section></div><p style={{fontSize:13,marginTop:24,opacity:.8}}>المعاينة ثلاثية الأبعاد تستخدم نماذج هندسية مبدئية وليست مجسمات واقعية نهائية. مكتبة الأصول الواقعية والحفظ المشترك للفريق مراحل لاحقة.</p></main>
}