"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";
import PostInteractions, { type InteractionCounts } from "../gallery/post-interactions";

type Media = { path: string; kind: "image" | "video" };
type Post = {
  id: number;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
  pinned_at: string | null;
  media_path: string | null;
  media_kind: Media["kind"] | null;
  legacy_media: Media[];
  youtube_id: string | null;
};
type Viewer = { id: string; name: string; supervisor: boolean };
type FeedData = { posts: Post[]; counts: Record<number, InteractionCounts>; urls: Record<string, string> };
const emptyFeed: FeedData = { posts: [], counts: {}, urls: {} };
const mediaTypes: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const postColumns = "id,author_name,author_role,body,created_at,pinned_at,media_path,media_kind,legacy_media,youtube_id";
const zeroCounts = { likes: 0, comments: 0, liked: false };
const pageSize = 20;

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const [kind, pathId] = url.pathname.split("/").filter(Boolean);
    const id = url.hostname === "youtu.be" ? kind :
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
        ? (["shorts", "embed", "live"].includes(kind) ? pathId : url.searchParams.get("v")) : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function Feed() {
  const [viewer, setViewer] = useState<Viewer>();
  const [access, setAccess] = useState<"loading" | "guest" | "pending" | "offline" | "member">("loading");
  const [feed, setFeed] = useState(emptyFeed);
  const [limit, setLimit] = useState(pageSize);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File>();
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState("");
  const [moderating, setModerating] = useState<number>();
  const [lightbox, setLightbox] = useState("");
  const mediaInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mediaCache = useRef(new Map<string, { url: string; refreshAfter: number }>());
  const refreshId = useRef(0);

  useEffect(() => {
    const db = getSupabase();
    if (!db) { setAccess("offline"); return; }
    let active = true;
    async function identify() {
      const { data: { user }, error } = await db!.auth.getUser();
      if (!active) return;
      if (!user) {
        setAccess(error && error.name !== "AuthSessionMissingError" ? "offline" : "guest");
        return;
      }
      const profile = await db!.from("profiles").select("full_name,approval_status,app_role").eq("id", user.id).single();
      if (!active) return;
      if (profile.error) { setAccess("offline"); return; }
      if (profile.data.app_role !== "supervisor" && profile.data.approval_status !== "approved") {
        setAccess("pending");
        return;
      }
      setViewer({ id: user.id, name: profile.data.full_name, supervisor: profile.data.app_role === "supervisor" });
      setAccess("member");
    }
    void identify();
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const db = getSupabase();
    if (!db) return;
    const requestId = ++refreshId.current;
    const request = db.from("plateau_posts").select(postColumns)
      .order("pinned_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
      .order("id", { ascending: false }).limit(limit + 1);
    const result = await (signal ? request.abortSignal(signal) : request);
    if (signal?.aborted || requestId !== refreshId.current) return;
    if (result.error) { setNotice("تعذّر تحميل المنشورات. جرّب التحديث."); return; }
    const posts = (result.data ?? []) as Post[];
    const visible = posts.slice(0, limit);
    const newPaths = visible.flatMap(post => post.media_path ? [post.media_path] : []);
    const oldPaths = [...new Set(visible.flatMap(post => post.legacy_media.map(media => media.path)))];
    const paths = [...new Set([...newPaths, ...oldPaths])];
    const now = Date.now();
    const shouldSign = (path: string) => (mediaCache.current.get(path)?.refreshAfter ?? 0) <= now;
    const unsignedUploads = newPaths.filter(shouldSign);
    const unsignedGallery = oldPaths.filter(shouldSign);
    const [counts, uploads, gallery] = await Promise.all([
      visible.length ? db.rpc("plateau_interaction_counts", { post_ids: visible.map(post => post.id) }) : null,
      unsignedUploads.length ? db.storage.from("post-media").createSignedUrls(unsignedUploads, 3600) : null,
      unsignedGallery.length ? db.storage.from("studio-gallery").createSignedUrls(unsignedGallery, 3600) : null,
    ]);
    if (signal?.aborted || requestId !== refreshId.current) return;
    for (const item of [...(uploads?.data ?? []), ...(gallery?.data ?? [])]) {
      if (item.path && item.signedUrl) mediaCache.current.set(item.path, { url: item.signedUrl, refreshAfter: now + 50 * 60000 });
    }
    const visiblePaths = new Set(paths);
    for (const path of mediaCache.current.keys()) {
      if (!visiblePaths.has(path)) mediaCache.current.delete(path);
    }
    const urls = Object.fromEntries(paths.map(path => [path, mediaCache.current.get(path)?.url ?? ""]));
    const interactions = (counts?.data ?? []) as (InteractionCounts & { post_id: number })[];
    setFeed({ posts, urls, counts: Object.fromEntries(interactions.map(row => [row.post_id, row])) });
    setRefreshVersion(version => version + 1);
    setNotice(counts?.error ? "تعذّر تحديث أعداد التفاعلات." : "");
  }, [limit]);

  useEffect(() => {
    if (access !== "member") return;
    let request: AbortController | undefined;
    const sync = () => {
      request?.abort();
      request = new AbortController();
      void refresh(request.signal);
    };
    const syncVisible = () => { if (!document.hidden) sync(); };
    sync();
    const interval = window.setInterval(syncVisible, 20000);
    document.addEventListener("visibilitychange", syncVisible);
    return () => {
      request?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncVisible);
    };
  }, [access, refresh]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const db = getSupabase();
    if (!db || !viewer || busy) return;
    const text = body.trim();
    const embed = link.trim() ? youtubeId(link.trim()) : null;
    setActionError("");
    if (link.trim() && !embed) { setActionError("استخدم رابط HTTPS لفيديو YouTube."); return; }
    if (!text && !file && !embed) return;
    let path: string | null = null;
    let saved = false;
    setBusy(file ? "جارٍ رفع الملف…" : "جارٍ النشر…");
    try {
      if (file) {
        path = `${viewer.id}/${crypto.randomUUID()}.${mediaTypes[file.type]}`;
        const upload = await db.storage.from("post-media").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        setBusy("جارٍ حفظ المنشور…");
      }
      const result = await db.from("plateau_posts").insert({
        body: text, media_path: path, media_kind: file ? file.type.split("/")[0] : null, youtube_id: embed,
      });
      if (result.error) throw result.error;
      saved = true;
      setBody("");
      setFile(undefined);
      if (mediaInput.current) mediaInput.current.value = "";
      setLink("");
      setShowLink(false);
      await refresh();
    } catch {
      if (path && !saved) {
        const cleanup = await db.storage.from("post-media").remove([path]).catch(() => null);
        if (cleanup?.error) console.warn("Unable to clean up the incomplete Plateau upload.");
      }
      setActionError(saved ? "المنشور اتحفظ. حدّث الصفحة لعرضه." : "تعذّر نشر المنشور. جرّب مرة تانية.");
    } finally {
      setBusy("");
    }
  }

  async function moderate(post: Post, remove: boolean) {
    const db = getSupabase();
    if (!db || !viewer?.supervisor || moderating) return;
    if (remove && !window.confirm("حذف المنشور وتعليقاته من التايم لاين؟")) return;
    setModerating(post.id);
    setActionError("");
    try {
      const result = remove
        ? await db.from("plateau_posts").delete().eq("id", post.id).select("id").single()
        : await db.from("plateau_posts").update({ pinned_at: post.pinned_at ? null : new Date().toISOString() })
          .eq("id", post.id).select("id").single();
      if (result.error) throw result.error;
      if (remove && post.media_path) {
        const cleanup = await db.storage.from("post-media").remove([post.media_path]);
        if (cleanup.error) setActionError("اتحذف المنشور، وتعذّر تنظيف الملف المرفق.");
      }
      await refresh();
    } catch {
      setActionError("تعذّر تنفيذ الإجراء. جرّب تاني.");
    } finally {
      setModerating(undefined);
    }
  }

  return <main className="gallery-shell plateau-feed">
    <div className="plateau-content">
      <header className="plateau-intro"><h1>التايم لاين</h1>
        <p>شاركوا تقدم الشغل ولحظات الكواليس مع فريقكم.</p>
      </header>
      {access === "loading" && <p role="status">جارٍ تحميل التايم لاين…</p>}
      {access === "guest" && <section className="plateau-card plateau-access">
        <h2>أهلًا بفريق العمل</h2><p>سجّل دخولك علشان تشوف المنشورات وتشارك مع الفريق.</p>
        <Link className="plateau-primary" href="/login">تسجيل الدخول</Link> <Link href="/register">طلب الانضمام</Link>
      </section>}
      {access === "pending" && <p className="plateau-card plateau-access">التايم لاين هيتفتح بعد اعتماد حسابك.</p>}
      {access === "offline" && <p role="status">اتصال Supabase غير متاح. لو بتشغّل الموقع محليًا، راجع إعدادات الاتصال في README.</p>}
      {viewer && <form className="plateau-card plateau-composer" onSubmit={publish}>
        <label htmlFor="plateau-post"><strong>إنشاء منشور</strong></label>
        <textarea id="plateau-post" rows={3} maxLength={4000} disabled={!!busy} value={body}
          onChange={event => setBody(event.target.value)} placeholder={`شارك حاجة مع فريقك، ${viewer.name || "زميلنا"}…`} />
        {preview && file && <div className="plateau-composer-preview">
          {file.type.startsWith("image/") ? <img src={preview} alt="معاينة الصورة" /> : <video src={preview} controls />}
          <button type="button" disabled={!!busy} onClick={() => { setFile(undefined); if (mediaInput.current) mediaInput.current.value = ""; }}>إزالة المرفق</button>
        </div>}
        {showLink && <label>رابط فيديو YouTube<input type="url" dir="ltr" disabled={!!busy} value={link} onChange={event => setLink(event.target.value)} /></label>}
        <div className="plateau-composer-tools">
          <input ref={mediaInput} type="file" accept={Object.keys(mediaTypes).join(",")} aria-label="رفع صورة أو فيديو" hidden
            onChange={event => {
              const selected = event.target.files?.[0];
              if (!selected) return;
              if (!mediaTypes[selected.type] || selected.size < 1 || selected.size > 52428800) {
                setActionError("اختار صورة أو فيديو بصيغة مدعومة وحجم لحد 50 ميجابايت.");
                event.target.value = "";
                return;
              }
              setActionError(""); setFile(selected); setLink(""); setShowLink(false);
            }} />
          <button type="button" disabled={!!busy} onClick={() => mediaInput.current?.click()}>صورة أو فيديو</button>
          <button type="button" aria-expanded={showLink} disabled={!!busy || !!file} onClick={() => { setShowLink(!showLink); setLink(""); }}>رابط فيديو</button>
          <button className="plateau-primary" disabled={!!busy || (!body.trim() && !file && !link.trim())}>{busy || "نشر"}</button>
        </div>
        {busy && <p role="status">{busy}</p>}
      </form>}
      {actionError && <p role="alert" className="plateau-notice">{actionError}</p>}
      {notice && <p role="status" className="plateau-notice">{notice} <button onClick={() => void refresh()}>تحديث</button></p>}
      {viewer && refreshVersion > 0 && !feed.posts.length && <p className="plateau-empty">لسه مفيش منشورات. شارك أول لحظة مع الفريق.</p>}
      <section className="plateau-posts" aria-label="منشورات الفريق">
        {viewer && feed.posts.slice(0, limit).map(post => {
          const media = post.media_path && post.media_kind ? [{ path: post.media_path, kind: post.media_kind }] : post.legacy_media;
          return <article className="plateau-card plateau-post" key={post.id}>
            <header className="plateau-post-header">
              <span aria-hidden="true" className="plateau-avatar">{post.author_name.trim().slice(0, 1) || "P"}</span>
              <div><strong>{post.author_name}</strong>
                <div className="plateau-byline"><span>{post.author_role === "supervisor" ? "المشرفة" : "عضو الفريق"}</span>
                  <time dateTime={post.created_at}>{dateFormatter.format(new Date(post.created_at))}</time>
                  {post.pinned_at && <span>منشور مثبّت</span>}
                </div>
              </div>
            </header>
            {post.body && <p className="plateau-post-body" dir="auto">{post.body}</p>}
            {!!media.length && <div className="plateau-media">
              {media.map((item, index) => {
                const url = feed.urls[item.path];
                if (!url) return <p key={item.path}>المرفق غير متاح حاليًا.</p>;
                return item.kind === "video" ? <video key={item.path} src={url} controls playsInline preload="metadata" /> :
                  <button key={item.path} className="plateau-media-button" onClick={() => { setLightbox(url); dialog.current?.showModal(); }}
                    aria-label={`تكبير صورة ${index + 1}`}><img loading="lazy" src={url} alt={`صورة من منشور ${post.author_name}`} /></button>;
              })}
            </div>}
            {post.youtube_id && <iframe className="plateau-embed" title={`فيديو YouTube من ${post.author_name}`} loading="lazy"
              src={`https://www.youtube-nocookie.com/embed/${post.youtube_id}`} allowFullScreen />}
            {viewer.supervisor && <div className="plateau-moderation">
              <button disabled={!!moderating} onClick={() => void moderate(post, false)}>{post.pinned_at ? "إلغاء التثبيت" : "تثبيت"}</button>
              <button disabled={!!moderating} onClick={() => void moderate(post, true)}>حذف المنشور</button>
            </div>}
            <PostInteractions postId={post.id} counts={feed.counts[post.id] ?? zeroCounts} refreshVersion={refreshVersion}
              viewerId={viewer.id} supervisor={viewer.supervisor} />
          </article>;
        })}
      </section>
      {feed.posts.length > limit && <button className="plateau-more" onClick={() => setLimit(previous => previous + pageSize)}>منشورات أقدم</button>}
      <footer className="plateau-credits">
        <span>الإشراف الأكاديمي: <span className="plateau-credit-name">د. أحمد عبد المنعم</span></span>
        <span>تصميم وتطوير: <span className="plateau-credit-name">نوران أحمد</span></span>
      </footer>
    </div>
    <dialog ref={dialog} className="plateau-lightbox" onClose={() => setLightbox("")}>
      <form method="dialog"><button aria-label="إغلاق الصورة">إغلاق</button></form>
      {lightbox && <img src={lightbox} alt="الصورة بالحجم الكامل" />}
    </dialog>
  </main>;
}
