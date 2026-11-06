"use client";
import {useState} from "react";
type Piece={id:number;type:string;x:number;y:number;rotation:number};
type Props={pieces:Piece[];setPieces:React.Dispatch<React.SetStateAction<Piece[]>>;selected:number|null;setSelected:React.Dispatch<React.SetStateAction<number|null>>};
const items:Record<string,{name:string;w:number;d:number;color:string}>={
 sofa:{name:"كنبة",w:110,d:48,color:"#c29a7d"},chair:{name:"كرسي",w:42,d:42,color:"#bd906e"},
 table:{name:"ترابيزة",w:70,d:42,color:"#997454"},tv:{name:"تليفزيون",w:52,d:35,color:"#58636b"},
 radio:{name:"راديو",w:42,d:30,color:"#90705b"},archive:{name:"دولاب",w:78,d:34,color:"#7f8580"},
 lamp:{name:"أباجورة",w:28,d:28,color:"#d5b66f"},rug:{name:"سجادة",w:135,d:90,color:"#9b5d57"},
 books:{name:"مكتبة",w:90,d:32,color:"#91694b"},window:{name:"شباك",w:75,d:15,color:"#8caab1"},
 door:{name:"باب",w:58,d:16,color:"#c6a479"},plant:{name:"نبات",w:32,d:32,color:"#64856a"},
 reel:{name:"بكرة فيلم",w:35,d:35,color:"#6c747c"},tape:{name:"مسجل",w:46,d:30,color:"#69737b"},
 files:{name:"وثائق",w:52,d:40,color:"#b69a70"},photo:{name:"صورة",w:42,d:18,color:"#a98661"},
 clock:{name:"ساعة",w:35,d:18,color:"#bba57e"},desk:{name:"مكتب",w:105,d:58,color:"#9a7352"}
};
const clamp=(v:number,max:number)=>Math.max(0,Math.min(max,v));
const btn:React.CSSProperties={background:"#e9d2aa",color:"#30232b",border:0,borderRadius:8,padding:"9px 12px",fontWeight:700,cursor:"pointer"};
export default function InteriorPlanner({pieces,setPieces,selected,setSelected}:Props){
 const [roomW,setRoomW]=useState(5.1),[roomD,setRoomD]=useState(4),[snap,setSnap]=useState(true),[showMeasurements,setShowMeasurements]=useState(true);
 const [drag,setDrag]=useState<number|null>(null);
 const current=pieces.find(p=>p.id===selected);
 const update=(id:number,patch:Partial<Piece>)=>setPieces(old=>old.map(p=>p.id===id?{...p,...patch}:p));
 const position=(e:React.PointerEvent<SVGSVGElement>)=>{const rect=e.currentTarget.getBoundingClientRect();return {x:clamp((e.clientX-rect.left)*580/rect.width-35,510),y:clamp((e.clientY-rect.top)*470/rect.height-32,400)}};
 const grid=(v:number)=>snap?Math.round(v/10)*10:Math.round(v);
 const change=(dx:number,dy:number)=>{if(current)update(current.id,{x:clamp(current.x+dx,510),y:clamp(current.y+dy,400)})};
 return <section dir="rtl" style={{background:"#241d22",border:"1px solid #84675c",borderRadius:16,padding:16,marginBottom:20}}>
  <h2 style={{margin:"0 0 8px"}}>📐 مخطط التصميم الداخلي الاحترافي</h2>
  <p style={{fontSize:13,lineHeight:1.7}}>حرّكي قطع الأثاث باللمس أو الماوس، وحددي أي قطعة لتعديل مكانها واتجاهها. المقاسات تقريبية وقابلة للضبط، وليست رسومات تنفيذية معتمدة.</p>
  <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"end",marginBottom:12}}>
   <label>عرض الغرفة (متر)<input aria-label="عرض الغرفة بالمتر" type="number" min="2" max="20" step=".1" value={roomW} onChange={e=>setRoomW(clamp(Number(e.target.value)||2,20)||2)} style={{display:"block",width:105,padding:8,borderRadius:8}}/></label>
   <label>عمق الغرفة (متر)<input aria-label="عمق الغرفة بالمتر" type="number" min="2" max="20" step=".1" value={roomD} onChange={e=>setRoomD(clamp(Number(e.target.value)||2,20)||2)} style={{display:"block",width:105,padding:8,borderRadius:8}}/></label>
   <label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/> محاذاة للشبكة</label>
   <label><input type="checkbox" checked={showMeasurements} onChange={e=>setShowMeasurements(e.target.checked)}/> إظهار الأبعاد</label>
  </div>
  <svg viewBox="-35 -32 580 470" role="img" aria-label="مخطط علوي تفاعلي للغرفة والأثاث" onPointerMove={e=>{if(drag===null)return;const p=position(e);update(drag,{x:grid(p.x),y:grid(p.y)})}} onPointerUp={e=>{setDrag(null);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>setDrag(null)} style={{width:"100%",maxWidth:720,background:"#f2e8d9",borderRadius:12,touchAction:"none",display:"block",margin:"0 auto"}}>
   <defs><pattern id="interior-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d5c6b7" strokeWidth=".7"/></pattern></defs>
   <rect x="0" y="0" width="510" height="400" fill="url(#interior-grid)" stroke="#493c34" strokeWidth="7"/>
   {showMeasurements&&<><text x="255" y="-13" textAnchor="middle" fontSize="15" fill="#3d3028">{roomW.toFixed(1)} م</text><text x="533" y="200" textAnchor="middle" transform="rotate(90 533 200)" fontSize="15" fill="#3d3028">{roomD.toFixed(1)} م</text></>}
   {pieces.map(p=>{const item=items[p.type]||{name:p.type,w:45,d:35,color:"#b49a80"};const active=p.id===selected;return <g key={p.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`} onPointerDown={e=>{e.stopPropagation();setSelected(p.id);setDrag(p.id);e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId)}} style={{cursor:"grab"}}>
    <rect x={-item.w/2} y={-item.d/2} width={item.w} height={item.d} rx="4" fill={item.color} stroke={active?"#d4444d":"#58463b"} strokeWidth={active?4:1.5}/>
    <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#211c19" style={{pointerEvents:"none"}}>{item.name}</text>
    {active&&<circle cx="0" cy={-item.d/2-10} r="5" fill="#d4444d"/>}
   </g>})}
  </svg>
  <div style={{marginTop:12,background:"#382a31",padding:12,borderRadius:12}}>
   {current?<><strong>تعديل: {items[current.type]?.name||current.type}</strong>
    <p style={{fontSize:12}}>الموقع التقريبي: {(current.x/510*roomW).toFixed(2)} م × {(current.y/400*roomD).toFixed(2)} م — الاتجاه: {current.rotation}°</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10}}>
     <button style={btn} onClick={()=>change(0,-10)}>↑ أعلى</button><button style={btn} onClick={()=>change(0,10)}>↓ أسفل</button>
     <button style={btn} onClick={()=>change(-10,0)}>← يسار</button><button style={btn} onClick={()=>change(10,0)}>→ يمين</button>
     <button style={btn} onClick={()=>update(current.id,{rotation:(current.rotation+45)%360})}>↻ تدوير 45°</button>
     <button style={btn} onClick={()=>setPieces(old=>old.filter(p=>p.id!==current.id))}>حذف القطعة</button>
    </div>
   </>:<p style={{fontSize:13}}>اختاري قطعة من المخطط لتحريكها وتدويرها.</p>}
   <p style={{fontSize:12,opacity:.85}}>تعديلات القطع مرتبطة بالمشهد الحالي وبالمعاينة ثلاثية الأبعاد. أبعاد الغرفة هنا مخصصة للمخطط العلوي حاليًا.</p>
  </div>
 </section>
}
