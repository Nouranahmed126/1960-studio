"use client";
import {useEffect,useState} from "react";
import {getAuthUser,getPublicSupabase,getSupabase} from "../../lib/supabase-browser";
import MiniCinemaIcon from "../mini-cinema-icon";
import Link from "next/link";

type Artifact={id:number;title:string;description:string|null;category:string|null;image_path:string|null};

export default function Museum(){
 const [items,setItems]=useState<Artifact[]>([]);
 const [urls,setUrls]=useState<Record<number,string>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [expandedId,setExpandedId]=useState<number|null>(null);

 useEffect(()=>{
  let active=true;
  async function load(){
   const db=getSupabase();
   const publicDb=getPublicSupabase();
   if(!publicDb){setError("تعذر الاتصال بالأرشيف");setLoading(false);return;}

   const {data:{user}}=await getAuthUser();
   if(!active)return;

   // The keepsakes archive is public. The legacy keepsake entries still
   // uses the private gallery bucket, so request it only for signed-in users.
   const r=await publicDb.from("studio_props")
    .select("id,title,description,category,image_path")
    .order("created_at",{ascending:false})
    .limit(150);

   if(!active)return;
   if(r.error){
    setError("تعذر تحميل المقتنيات: "+r.error.message);
   }else{
    const photos:Record<number,string>={};
    for(const p of r.data||[]){
     if(p.image_path)photos[p.id]=publicDb.storage.from("crew-photos").getPublicUrl(p.image_path).data.publicUrl;
    }

    const moved:Artifact[]=[];
    if(user&&db){
     const keepsakes=await db.from("project_gallery")
      .select("id,title,description,storage_path")
      .in("id",[1,2]);
     for(const item of keepsakes.data??[]){
      if(!item.storage_path)continue;
      const signed=await db.storage.from("studio-gallery").createSignedUrl(item.storage_path,3600);
      if(signed.data?.signedUrl){
       moved.push({id:-item.id,title:item.id===2?"تلفزيون قديم":item.title||"شرائط الكاسيت القديمة",description:item.description,category:"أجهزة قديمة",image_path:null});
       photos[-item.id]=signed.data.signedUrl;
      }
     }
    }

    const archiveItems:Artifact[]=[...(r.data||[]).filter(p=>p.id!==2),...moved];
    setItems(archiveItems.filter(p=>Boolean(photos[p.id])));
    setUrls(photos);
   }
   setLoading(false);
  }
  void load();
  return()=>{active=false};
 },[]);

  function toggleCaption(id: number) {
    setExpandedId(current => current === id ? null : id);
  }

  return (
    <main dir="ltr" className="studio-shell studio-museum">
      <div className="museum-top-back">
        <Link href="/" className="museum-back-button" aria-label="Back to home">←</Link>
      </div>

      <header className="museum-header museum-header-compact">
        <h1>Plateau Archive</h1>
      </header>

      {loading ? (
        <p className="museum-message">بنجهز رفوف الأرشيف…</p>
      ) : error ? (
        <p className="museum-message">{error}</p>
      ) : items.length ? (
        <div className="museum-grid">
          {items.map((item, index) => {
            const expanded = expandedId === item.id;
            return (
              <article
                key={item.id}
                dir="rtl"
                className="museum-polaroid"
                style={{ animationDelay: Math.min(index, 12) * 45 + "ms" }}
              >
                <button
                  type="button"
                  className={"museum-photo museum-photo-trigger" + (expanded ? " is-expanded" : "")}
                  aria-expanded={expanded}
                  aria-label={expanded ? "إخفاء بيانات " + item.title : "إظهار اسم صاحب الصورة"}
                  onClick={() => toggleCaption(item.id)}
                >
                  {urls[item.id] ? (
                    <img
                      src={urls[item.id]}
                      alt={item.title}
                      loading="lazy"
                      onError={() => setItems(current => current.filter(entry => entry.id !== item.id))}
                    />
                  ) : (
                    <MiniCinemaIcon kind="film" size={42} />
                  )}

                  <span className="museum-photo-caption" aria-hidden={!expanded}>
                    <strong>{item.title}</strong>
                    {item.category && <small>{item.category}</small>}
                    {item.description && <em>{item.description}</em>}
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="museum-empty">
          <MiniCinemaIcon kind="film" size={35} />
          <p>الرف ده مستني أول قطعة من الفريق.</p>
        </div>
      )}
    </main>
  );
}
