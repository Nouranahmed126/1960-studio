"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import {getSupabase} from "../lib/supabase-browser";

type Profile={id:string;full_name:string;app_role:"student"|"supervisor";approval_status:string};
type Post={id:number;user_id:string|null;author_name:string;author_role:string;body:string;media_path:string|null;media_kind:"image"|"video"|null;youtube_id:string|null;pinned_at:string|null;created_at:string;archived_at:string|null};
type Comment={id:string;post_id:number;user_id:string;author_name:string;body:string;created_at:string};
type Like={post_id:number;user_id:string};
type FeedItem=Post&{mediaUrl?:string|null};

function youtubeId(value:string){try{const u=new URL(value);if(u.hostname==="youtu.be")return u.pathname.slice(1).match(/^[A-Za-z0-9_-]{11}$/)?.[0]??null;if(["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com"].includes(u.hostname)){const id=u.searchParams.get("v")??u.pathname.match(/\/embed\/([A-Za-z0-9_-]{11})/)?.[1];return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null}}catch{}return null}
function ago(value:string){const ms=Date.now()-new Date(value).getTime(),m=Math.max(0,Math.floor(ms/60000));if(m<1)return"الآن";if(m<60)return`منذ ${m} دقيقة`;const h=Math.floor(m/60);if(h<24)return`منذ ${h} ساعة`;return new Date(value).toLocaleDateString("ar-EG",{day:"numeric",month:"short",year:"numeric"})}

export default function TimelineFeed(){
 const [profile,setProfile]=useState<Profile|null>(null),[posts,setPosts]=useState<FeedItem[]>([]),[comments,setComments]=useState<Comment[]>([]),[likes,setLikes]=useState<Like[]>([]);
 const [body,setBody]=useState(""),[postKind,setPostKind]=useState<"general"|"field"|"achievement">("general"),[fieldLocation,setFieldLocation]=useState(""),[fieldDate,setFieldDate]=useState(new Date().toLocaleDateString("en-CA")),[videoLink,setVideoLink]=useState(""),[file,setFile]=useState<File|null>(null),[draftBusy,setDraftBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[commentDrafts,setCommentDrafts]=useState<Record<number,string>>({}),[commentBusy,setCommentBusy]=useState<number|null>(null),[expanded,setExpanded]=useState<number[]>([]);
 const fileRef=useRef<HTMLInputElement>(null);
 const isSupervisor=profile?.app_role==="supervisor";
 const load=useCallback(async()=>{
  const db=getSupabase();if(!db){setMessage("إعدادات الاتصال بقاعدة البيانات غير مكتملة.");setLoading(false);return}
  const {data:{user}}=await db.auth.getUser();if(!user){window.location.replace("/login");return}
  const p=await db.from("profiles").select("id,full_name,app_role,approval_status").eq("id",user.id).single();
  if(p.error||!p.data||p.data.approval_status!=="approved"){setMessage("التايم لاين متاح لأعضاء الاستوديو المعتمدين فقط.");setLoading(false);return}
  setProfile(p.data as Profile);
  const [pr,lr,cr]=await Promise.all([
   db.from("plateau_posts").select("id,user_id,author_name,author_role,body,media_path,media_kind,youtube_id,pinned_at,created_at,archived_at").is("archived_at",null).order("pinned_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).limit(100),
   db.from("plateau_likes").select("post_id,user_id"),
   db.from("plateau_comments").select("id,post_id,user_id,author_name,body,created_at").order("created_at",{ascending:true}).limit(500)
  ]);
  if(pr.error){setMessage("تعذر تحميل منشورات التايم لاين: "+pr.error.message);setLoading(false);return}
  const rows=(pr.data??[]) as Post[];
  const withMedia:FeedItem[]=await Promise.all(rows.map(async post=>{if(!post.media_path)return post;const signed=await db.storage.from("post-media").createSignedUrl(post.media_path,3600);return {...post,mediaUrl:signed.data?.signedUrl??null}}));
  setPosts(withMedia);setLikes((lr.data??[]) as Like[]);setComments((cr.data??[]) as Comment[]);setLoading(false);setMessage("");
 },[]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const db=getSupabase();if(!db||!profile)return;const channel=db.channel("plateau-timeline-live").on("postgres_changes",{event:"*",schema:"public",table:"plateau_posts"},()=>void load()).on("postgres_changes",{event:"*",schema:"public",table:"plateau_likes"},()=>void load()).on("postgres_changes",{event:"*",schema:"public",table:"plateau_comments"},()=>void load()).subscribe();return()=>{void db.removeChannel(channel)}},[profile,load]);
 const myLikes=useMemo(()=>new Set(likes.filter(x=>x.user_id===profile?.id).map(x=>x.post_id)),[likes,profile]);
 async function publish(e:FormEvent){e.preventDefault();const db=getSupabase();if(!db||!profile||draftBusy)return;const trimmed=body.trim(),yt=videoLink.trim()?youtubeId(videoLink.trim()):null;if(videoLink.trim()&&!yt){setMessage("رابط YouTube غير صحيح. ضعي رابط فيديو عاديًا.");return}if(!trimmed&&!file&&!yt){setMessage("اكتبي منشورًا أو أضيفي صورة أو فيديو.");return}if(file&&(!["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"].includes(file.type)||file.size>52428800)){setMessage("الملف غير مدعوم أو أكبر من 50 ميجابايت.");return}
  setDraftBusy(true);setMessage("");let media_path:string|null=null,media_kind:"image"|"video"|null=null;
  if(file){const ext=(file.name.split(".").pop()||"bin").toLowerCase();media_path=profile.id+"/"+crypto.randomUUID()+"."+ext;media_kind=file.type.startsWith("video/")?"video":"image";const uploaded=await db.storage.from("post-media").upload(media_path,file,{contentType:file.type,upsert:false});if(uploaded.error){setMessage("تعذر رفع الملف: "+uploaded.error.message);setDraftBusy(false);return}}
  const postBody=postKind==="general"?trimmed:[postKind==="field"?"📍 توثيق ميداني":"🏆 إنجاز جديد",postKind==="field"&&fieldLocation.trim()?`المكان: ${fieldLocation.trim()}`:"",postKind==="field"&&fieldDate?`التاريخ: ${fieldDate}`:"",trimmed].filter(Boolean).join("\n\n");
  const result=await db.from("plateau_posts").insert({user_id:profile.id,author_name:profile.full_name,author_role:profile.app_role,body:postBody,media_path,media_kind,youtube_id:yt}).select("id").single();
  setDraftBusy(false);if(result.error){setMessage("تعذر نشر المنشور: "+result.error.message);if(media_path)await db.storage.from("post-media").remove([media_path]);return}
  setBody("");setPostKind("general");setFieldLocation("");setFieldDate(new Date().toLocaleDateString("en-CA"));setVideoLink("");setFile(null);if(fileRef.current)fileRef.current.value="";setMessage("تم نشر منشورك بنجاح ✓");await load();
 }
 async function toggleLike(postId:number){const db=getSupabase();if(!db||!profile)return;const liked=myLikes.has(postId);setLikes(old=>liked?old.filter(x=>!(x.post_id===postId&&x.user_id===profile.id)):[...old,{post_id:postId,user_id:profile.id}]);const result=liked?await db.from("plateau_likes").delete().eq("post_id",postId).eq("user_id",profile.id):await db.from("plateau_likes").insert({post_id:postId,user_id:profile.id});if(result.error){setMessage("تعذر تحديث التفاعل: "+result.error.message);await load()}}
 async function addComment(postId:number){const db=getSupabase(),value=(commentDrafts[postId]??"").trim();if(!db||!profile||!value||commentBusy!==null)return;setCommentBusy(postId);const r=await db.from("plateau_comments").insert({post_id:postId,user_id:profile.id,author_name:profile.full_name,body:value});setCommentBusy(null);if(r.error){setMessage("تعذر إضافة التعليق: "+r.error.message);return}setCommentDrafts(old=>({...old,[postId]:""}));await load()}
 async function pin(post:Post){const db=getSupabase();if(!db||!isSupervisor)return;const r=await db.from("plateau_posts").update({pinned_at:post.pinned_at?null:new Date().toISOString()}).eq("id",post.id);if(r.error)setMessage("تعذر تحديث التثبيت: "+r.error.message);else await load()}
 async function removePost(post:Post){const db=getSupabase();if(!db||!isSupervisor||!window.confirm("حذف المنشور نهائيًا؟"))return;const r=await db.from("plateau_posts").delete().eq("id",post.id);if(r.error){setMessage("تعذر حذف المنشور: "+r.error.message);return}if(post.media_path)await db.storage.from("post-media").remove([post.media_path]);await load()}
 async function removeComment(comment:Comment){const db=getSupabase();if(!db||!(isSupervisor||comment.user_id===profile?.id)||!window.confirm("حذف التعليق؟"))return;const r=await db.from("plateau_comments").delete().eq("id",comment.id);if(r.error)setMessage("تعذر حذف التعليق: "+r.error.message);else await load()}
 const toggleComments=(id:number)=>setExpanded(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 return <main className="studio-shell timeline-feed-page" dir="rtl">
  <style>{`
   .timeline-feed-page{max-width:900px!important;padding-top:22px!important;color:#282333!important}
   .timeline-feed-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:18px;border-bottom:1px solid #e8e1f2}
   .timeline-feed-header a{color:#8065bd!important;text-decoration:none;font-weight:700}
   .timeline-feed-intro{padding:30px 4px 20px}.timeline-feed-kicker{color:#9b7b30;font-size:11px;letter-spacing:2px;font-weight:800}
   .timeline-feed-intro h1{font-size:clamp(30px,6vw,44px)!important;color:#282333!important;margin:8px 0}
   .timeline-feed-intro p{color:#777083!important;line-height:1.8}
   .timeline-composer,.timeline-post{background:linear-gradient(145deg,#fff,#fbf9ff);border:1px solid #e4dcef;border-radius:20px;padding:18px;margin:0 0 16px;box-shadow:0 10px 28px rgba(87,65,130,.06)}
   .timeline-composer textarea,.timeline-composer input{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #e5dff0!important;border-radius:13px!important;background:#fff!important;color:#292536!important;outline-color:#a78bdf!important}
   .timeline-composer textarea{resize:vertical;min-height:86px}
   .timeline-kind-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
   .timeline-kind-row label{font-size:12px;color:#75688b;font-weight:700}
   .timeline-kind-row select,.timeline-field-meta input{border:1px solid #e5dff0!important;border-radius:11px!important;background:#fff!important;color:#55456f!important;padding:9px 11px!important;font:inherit!important}
   .timeline-field-meta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}
   .timeline-field-meta input{flex:1;min-width:130px;margin:0!important}
   .timeline-kind-hint{font-size:11px;color:#9a8eaa;margin:0 0 9px}
   .timeline-composer input{margin-top:10px}
   .timeline-composer-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}
   .timeline-feed-page button{font:inherit!important}
   .timeline-composer button,.timeline-post button{border:1px solid #e3d9f2!important;border-radius:999px!important;background:#f4effb!important;color:#5f4a8b!important;padding:9px 14px!important;box-shadow:none!important}
   .timeline-composer button.primary{background:linear-gradient(120deg,#8c70c7,#6f55a8)!important;color:#fff!important;border:0!important;font-weight:800}
   .timeline-composer button:disabled{opacity:.55}
   .timeline-file-name{font-size:12px;color:#76688d}
   .timeline-status{padding:10px 13px;border-radius:12px;background:#f4effb;color:#6b548f;margin:12px 0}
   .timeline-post-top{display:flex;align-items:center;gap:11px}
   .timeline-avatar{width:42px;height:42px;flex:0 0 42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#eee7fb,#d8c9f1);color:#7054a8;font-weight:900}
   .timeline-author{font-weight:800;color:#30283e}.timeline-meta{font-size:11px;color:#9991a5}
   .timeline-pin{margin-right:auto!important;font-size:12px!important}
   .timeline-post-body{white-space:pre-wrap;overflow-wrap:anywhere;color:#40394b;line-height:1.9;padding:13px 0}
   .timeline-post-media{display:block;width:100%;max-height:560px;object-fit:contain;border-radius:14px;background:#f1edf5}
   .timeline-video-frame{width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#f1edf5}
   .timeline-post-stats{display:flex;justify-content:space-between;color:#91899c;font-size:12px;padding:10px 0;border-bottom:1px solid #eee9f4}
   .timeline-post-actions{display:flex;gap:9px;padding:10px 0}
   .timeline-post-actions button[aria-pressed="true"]{background:#eee5fb!important;color:#704fae!important;border-color:#d7c7ef!important}
   .timeline-comments{border-top:1px solid #eee9f4;padding-top:12px}
   .timeline-comment{padding:9px 11px;border-radius:12px;background:#f8f6fb;margin:8px 0}
   .timeline-comment strong{color:#5b477f}.timeline-comment p{margin:4px 0;color:#51495c;white-space:pre-wrap}
   .timeline-comment-form{display:flex;gap:8px;margin-top:10px}.timeline-comment-form input{min-width:0;flex:1;padding:11px;border:1px solid #e5dff0;border-radius:12px;background:#fff;color:#292536}
   .timeline-empty{text-align:center;padding:34px 15px;color:#8a8197;background:#fff;border:1px dashed #d9cde9;border-radius:18px}
   @media(max-width:540px){.timeline-composer,.timeline-post{padding:14px;border-radius:16px}.timeline-feed-intro{padding-top:22px}.timeline-comment-form{flex-direction:column}.timeline-comment-form button{align-self:flex-start}}
  `}</style>
  <header className="timeline-feed-header"><a href="/">← Plateau Crew Hub</a><span className="timeline-feed-kicker">PLATEAU · COMMUNITY</span></header>
  <section className="timeline-feed-intro"><span className="timeline-feed-kicker">STUDIO 1960 · LIVE UPDATES</span><h1>Timeline · مساحة الفريق</h1><p>كل أخبار الاستوديو ومنشورات الطلاب والمشرفة في مكان واحد. شاركوا لحظات الرحلة وتابعوا التفاعل أولًا بأول.</p></section>
  {message&&<p className="timeline-status" role="status">{message}</p>}
  {profile&&<form className="timeline-composer" onSubmit={publish}><strong style={{color:"#44365c"}}>✦ اكتب منشورًا جديدًا</strong>
   <div className="timeline-kind-row"><label htmlFor="timeline-post-kind">نوع المشاركة</label><select id="timeline-post-kind" value={postKind} onChange={e=>setPostKind(e.target.value as "general"|"field"|"achievement")}><option value="general">منشور عادي</option><option value="field">توثيق / مشاركة ميدانية</option><option value="achievement">إنجاز قمت به</option></select></div>
   {postKind!=="general"&&<><p className="timeline-kind-hint">{postKind==="field"?"أضيفي تفاصيل الزيارة والمكان والتاريخ (اختياري).":"شاركي الفريق بالإنجاز الذي حققتِه."}</p>{postKind==="field"&&<div className="timeline-field-meta"><input value={fieldLocation} onChange={e=>setFieldLocation(e.target.value)} placeholder="المكان (اختياري)" aria-label="مكان النشاط"/><input type="date" value={fieldDate} onChange={e=>setFieldDate(e.target.value)} aria-label="تاريخ النشاط"/></div>}</>}
   <textarea maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} placeholder="شارك الفريق فكرة، صورة من الكواليس، أو تحديثًا جديدًا..." aria-label="نص المنشور"/><input value={videoLink} onChange={e=>setVideoLink(e.target.value)} placeholder="رابط YouTube (اختياري)" aria-label="رابط يوتيوب"/><div className="timeline-composer-actions"><button type="button" onClick={()=>fileRef.current?.click()}>＋ إضافة صورة أو فيديو</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" style={{display:"none"}} onChange={e=>setFile(e.target.files?.[0]??null)}/>{file&&<><span className="timeline-file-name">{file.name}</span><button type="button" onClick={()=>{setFile(null);if(fileRef.current)fileRef.current.value=""}}>إزالة الملف</button></>}<span style={{flex:1}}/><button className="primary" type="submit" disabled={draftBusy}>{draftBusy?"جارٍ النشر...":"نشر المنشور"}</button></div></form>}
  {loading?<div className="timeline-empty">جارٍ تحميل منشورات الفريق...</div>:!profile?<div className="timeline-empty">{message||"سجّل الدخول بحساب معتمد لعرض التايم لاين."}</div>:posts.length===0?<div className="timeline-empty">لسه مفيش منشورات. ابدأوا أول حكاية في رحلة 1960 ✨</div>:posts.map(post=>{const postComments=comments.filter(c=>c.post_id===post.id),liked=myLikes.has(post.id);return <article className="timeline-post" key={post.id}><div className="timeline-post-top"><div className="timeline-avatar">{post.author_name?.trim()?.[0]??"P"}</div><div><div className="timeline-author">{post.author_name||"عضو الفريق"}</div><div className="timeline-meta">{post.author_role==="supervisor"?"إدارة الاستوديو":"عضو الفريق"} · {ago(post.created_at)}</div></div>{post.pinned_at&&<span className="timeline-meta">📌 مثبت</span>}{isSupervisor&&<><button className="timeline-pin" type="button" onClick={()=>void pin(post)}>{post.pinned_at?"إلغاء التثبيت":"تثبيت"}</button><button type="button" onClick={()=>void removePost(post)}>حذف</button></>}</div>
   {post.body&&<div className="timeline-post-body">{post.body}</div>}
   {post.media_path&&post.mediaUrl&&(post.media_kind==="video"?<video className="timeline-post-media" controls playsInline preload="metadata" src={post.mediaUrl}/>:<img className="timeline-post-media" src={post.mediaUrl} alt="مرفق من منشور الفريق" loading="lazy"/>)}
   {post.youtube_id&&<iframe className="timeline-video-frame" src={`https://www.youtube-nocookie.com/embed/${post.youtube_id}`} title="فيديو من منشور الفريق" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>}
   <div className="timeline-post-stats"><span>♥ {likes.filter(x=>x.post_id===post.id).length} تفاعل</span><span>{postComments.length} تعليق</span></div><div className="timeline-post-actions"><button type="button" aria-pressed={liked} onClick={()=>void toggleLike(post.id)}>{liked?"♥ أعجبني":"♡ إعجاب"}</button><button type="button" onClick={()=>toggleComments(post.id)}>{expanded.includes(post.id)?"إخفاء التعليقات":"عرض التعليقات"}</button></div>
   {expanded.includes(post.id)&&<div className="timeline-comments">{postComments.map(c=><div className="timeline-comment" key={c.id}><strong>{c.author_name}</strong><span className="timeline-meta"> · {ago(c.created_at)}</span><p>{c.body}</p>{(isSupervisor||c.user_id===profile.id)&&<button type="button" onClick={()=>void removeComment(c)}>حذف التعليق</button>}</div>)}<form className="timeline-comment-form" onSubmit={e=>{e.preventDefault();void addComment(post.id)}}><input maxLength={500} value={commentDrafts[post.id]??""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} placeholder="اكتب تعليقًا..." aria-label="تعليق جديد"/><button type="submit" disabled={commentBusy===post.id||!(commentDrafts[post.id]??"").trim()}>{commentBusy===post.id?"جارٍ الإرسال...":"إرسال"}</button></form></div>}
  </article>})}
  <footer style={{textAlign:"center",padding:"22px 0",color:"#948ba0",fontSize:11}}>ONE CREW · ONE VISION · STUDIO 1960</footer>
 </main>
}
