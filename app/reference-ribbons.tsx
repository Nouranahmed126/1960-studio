"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {getAuthUser,getSupabase} from "../lib/supabase-browser";

type CrewMember={id:string;full_name:string};
type Honor={id:number;student_name:string;award:string;achievement:string;stars:number};
type RibbonItem={id:string;label:string;image?:string;kind:"crew"|"artifact"|"honor"};
type Access="checking"|"member"|"guest";

async function storageImage(db:NonNullable<ReturnType<typeof getSupabase>>,bucket:string,path:string|null|undefined){
 if(!path)return undefined;
 if(/^https?:\/\//i.test(path))return path;
 if(bucket==="crew-photos")return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
 const signed=await db.storage.from(bucket).createSignedUrl(path,60*60);
 return signed.data?.signedUrl;
}
function normalizeName(value:string){return value.normalize("NFKC").replace(/[ـ\s]+/g," ").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").trim().toLocaleLowerCase("ar");}

export default function Ribbons(){
 const [crew,setCrew]=useState<RibbonItem[]>([]);
 const [artifacts,setArtifacts]=useState<RibbonItem[]>([]);
 const [honors,setHonors]=useState<RibbonItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [access,setAccess]=useState<Access>("checking");

 const load=useCallback(async()=>{
  const db=getSupabase();
  if(!db){setAccess("guest");setLoading(false);return;}

  const {data:{user}}=await getAuthUser();
  let isApprovedMember=false;
  if(user){
   const profile=await db.from("profiles").select("app_role,approval_status").eq("id",user.id).maybeSingle();
   isApprovedMember=!!profile.data&&(profile.data.app_role==="supervisor"||profile.data.approval_status==="approved");
  }
  setAccess(isApprovedMember?"member":"guest");

  // These two collections are intentionally public and expose display fields only.
  const [propResult,honorResult]=await Promise.all([
   db.from("studio_props").select("id,title,image_path").not("image_path","is",null).neq("id",2).order("created_at",{ascending:false}).limit(60),
   db.from("studio_honors").select("id,student_name,award,achievement,stars").order("created_at",{ascending:false}).limit(100)
  ]);

  let crewItems:RibbonItem[]=[];
  if(isApprovedMember&&user){
   const [crewResult,detailResult,cassetteResult]=await Promise.all([
    db.rpc("list_approved_crew"),
    db.from("crew_profiles").select("user_id,photo_path"),
    db.from("project_gallery").select("id,title,storage_path").eq("id",1).maybeSingle()
   ]);
   const members=(crewResult.data??[]) as CrewMember[];
   const details=(detailResult.data??[]) as {user_id:string;photo_path:string|null}[];
   const photoById=new Map<string,string>();
   await Promise.all(details.map(async d=>{
    const url=await storageImage(db,"crew-photos",d.photo_path);
    if(url)photoById.set(d.user_id,url);
   }));
   const uniqueMembers=new Map<string,CrewMember>();
   for(const m of members){
    const key=normalizeName(m.full_name);
    if(key&&!uniqueMembers.has(key))uniqueMembers.set(key,m);
   }
   for(const m of uniqueMembers.values()){
    const photo=photoById.get(m.id);
    if(photo)crewItems.push({id:m.id,label:m.full_name,image:photo,kind:"crew"});
   }

   // This one imported item still lives in the private gallery bucket.
   const cassette=cassetteResult.data as {id:number;title:string|null;storage_path:string|null}|null;
   if(cassette?.storage_path){
    const image=await storageImage(db,"studio-gallery",cassette.storage_path);
    if(image&&propResult.data){
     propResult.data.push({id:-1,title:cassette.title||"1960 Archive",image_path:image});
    }
   }
  }

  const artifactItems:RibbonItem[]=[];
  const propRows=propResult.data??[];
  const artifactImages=await Promise.all(propRows.map(async p=>({
   row:p,
   image:p.id===-1?p.image_path:await storageImage(db,"crew-photos",p.image_path)
  })));
  for(const entry of artifactImages){
   if(entry.image)artifactItems.push({id:String(entry.row.id),label:entry.row.title,image:entry.image,kind:"artifact"});
  }

  const byName=new Map<string,string>();
  for(const m of crewItems){
   byName.set(normalizeName(m.label),m.image||"");
  }
  const honorRows=(honorResult.data??[]) as Honor[];
  const honorItems:RibbonItem[]=honorRows.map(h=>({
   id:String(h.id),
   label:h.student_name,
   image:byName.get(normalizeName(h.student_name))||undefined,
   kind:"honor"
  }));

  setCrew(crewItems);
  setArtifacts(artifactItems);
  setHonors(honorItems);
  setLoading(false);
 },[]);

 useEffect(()=>{
  let active=true;
  const db=getSupabase();
  if(!db){setAccess("guest");setLoading(false);return;}
  const safeLoad=async()=>{if(active)await load();};
  void safeLoad();
  const channel=db.channel("home-ribbons-live")
   .on("postgres_changes",{event:"*",schema:"public",table:"crew_profiles"},()=>void safeLoad())
   .on("postgres_changes",{event:"*",schema:"public",table:"studio_props"},()=>void safeLoad())
   .on("postgres_changes",{event:"*",schema:"public",table:"studio_honors"},()=>void safeLoad())
   .on("postgres_changes",{event:"*",schema:"public",table:"project_gallery"},()=>void safeLoad())
   .subscribe();
  const auth=db.auth.onAuthStateChange(()=>{setTimeout(()=>void safeLoad(),0);});
  const timer=setInterval(()=>void safeLoad(),45_000);
  return()=>{
   active=false;
   clearInterval(timer);
   auth.data.subscription.unsubscribe();
   void db.removeChannel(channel);
  };
 },[load]);

 const rows=[
  {index:0,label:"Studio Crew",items:crew,href:"/crew",direction:"right"},
  {index:1,label:"1960 Keepsakes",items:artifacts,href:"/museum",direction:"left"},
  {index:2,label:"Honors",items:honors,href:"/honor-board",direction:"right"}
 ] as const;
 const visibleRows=rows.filter(row=>row.items.length>0);

 if(loading||access==="checking"){
  return <section className="reference-ribbons reference-ribbons-loading" aria-label="Studio highlights" aria-busy="true">
   <span/><span/><span/>
  </section>;
 }
 if(!visibleRows.length)return null;

 return <section className="reference-ribbons" aria-label="Studio highlights">
  {visibleRows.map(row=><section className={"reference-ribbon ribbon-"+row.index} key={row.label} aria-label={row.label}>
   <Link href={row.href} className="ribbon-heading"><span aria-hidden="true">{row.direction==="left"?"←":"→"}</span><strong>{row.label}</strong></Link>
   <div className="ribbon-window">
    <div className={"reference-ribbon-track ribbon-track-"+row.index}>
     {[0,1].map(copy=><div className="reference-ribbon-group" key={copy} aria-hidden={copy===1}>
      {row.items.map(item=><Link href={row.href} prefetch className={"ribbon-item ribbon-item-"+item.kind} key={copy+"-"+item.kind+"-"+item.id} tabIndex={copy===1?-1:0} aria-label={item.label} title={item.label}>
       {item.image&&<img className={item.kind==="artifact"?"ribbon-artifact":"ribbon-emblem"} src={item.image} alt="" loading="lazy" decoding="async"/>}
       {item.kind!=="artifact"&&(item.kind==="honor"?<>{!item.image&&<span className="ribbon-honor-star" aria-hidden="true">★</span>}<bdi>{item.label}</bdi></>:<bdi>{item.label}</bdi>)}
      </Link>)}
     </div>)}
    </div>
   </div>
  </section>)}
 </section>;
}
