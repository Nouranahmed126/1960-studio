import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const requestTimes=new Map<string,number[]>();
const allowed=["sofa","chair","table","rug","tv","radio","books","lamp","photo","clock","archive","reel","tape","files","desk"];
export async function POST(request:NextRequest){
 try{
  const bearer=request.headers.get("authorization")||"";
  if(!bearer.startsWith("Bearer "))return NextResponse.json({error:"سجلي الدخول لاستخدام المصمم الذكي"},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return NextResponse.json({error:"إعدادات تسجيل الدخول غير مكتملة"},{status:503});
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await supabase.auth.getUser(bearer.slice(7));
  if(error||!user)return NextResponse.json({error:"جلسة الدخول غير صالحة"},{status:401});
  // Best-effort per-instance limit; a shared store is needed for global rate limiting.
  const now=Date.now();
  const recent=(requestTimes.get(user.id)||[]).filter(t=>now-t<3600000);
  if(recent.length>=12)return NextResponse.json({error:"وصلتي للحد المؤقت (12 تصميم في الساعة). جربي بعد شوية."},{status:429});
  recent.push(now);requestTimes.set(user.id,recent);
  if(requestTimes.size>1000){for(const [id,times] of requestTimes){if(times.every(t=>now-t>=3600000))requestTimes.delete(id)}}
  const body=await request.json();
  const description=typeof body?.description==="string"?body.description.trim():"";
  if(description.length<8||description.length>800)return NextResponse.json({error:"الوصف لازم يكون بين 8 و800 حرف"},{status:400});
  const gatewayKey=process.env.AI_GATEWAY_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  const token=gatewayKey||openaiKey;
  if(!token)return NextResponse.json({error:"خدمة الذكاء الاصطناعي غير مفعلة بعد"},{status:503});
  const endpoint=gatewayKey?"https://ai-gateway.vercel.sh/v1/chat/completions":"https://api.openai.com/v1/chat/completions";
  const model=gatewayKey?(process.env.DECOR_AI_MODEL||"openai/gpt-5.4"):(process.env.DECOR_AI_MODEL||"gpt-4o-mini");
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
  let response:Response;
  try{response=await fetch(endpoint,{method:"POST",signal:controller.signal,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0.3,max_tokens:900,messages:[{role:"system",content:"You design preliminary film sets for Egyptian period drama. Return ONLY valid JSON with fields name (Arabic string), wall and floor (hex #RRGGBB), pieces (array of objects with type,x,y,rotation). Allowed piece types: "+allowed.join(", ")+". Use at most 12 pieces, coordinates x 20..490 and y 20..380, rotation 0..359. Avoid asserting historical authenticity. Do not include markdown."},{role:"user",content:description}]})})}finally{clearTimeout(timeout)}
  if(!response.ok)return NextResponse.json({error:"خدمة التصميم غير متاحة مؤقتًا"},{status:502});
  const result=await response.json();const raw=result?.choices?.[0]?.message?.content;
  if(typeof raw!=="string")throw Error("missing content");
  const parsed=JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/,""));
  if(typeof parsed.name!=="string"||!Array.isArray(parsed.pieces)||parsed.pieces.length>12)throw Error("invalid output");
  const hex=(v:unknown,fallback:string)=>typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
  const pieces=parsed.pieces.filter((p:any)=>p&&allowed.includes(p.type)&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map((p:any,i:number)=>({id:i+1,type:p.type,x:Math.max(20,Math.min(490,Math.round(p.x))),y:Math.max(20,Math.min(380,Math.round(p.y))),rotation:Number.isFinite(p.rotation)?((Math.round(p.rotation)%360)+360)%360:0}));
  if(!pieces.length)throw Error("empty design");
  return NextResponse.json({name:parsed.name.slice(0,80),wall:hex(parsed.wall,"#aa8771"),floor:hex(parsed.floor,"#9d7357"),pieces,source:"ai"},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"تعذر إنشاء التصميم. جربي الوصف مرة تانية أو استخدمي الاقتراح السريع"},{status:500})}
}
