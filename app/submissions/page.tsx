"use client";

import { cleanupFailedUpload } from "../../lib/cleanup-failed-upload";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase-browser";
import "./submissions.css";

type Team = { id: number; name: string };
type Attachment = {
  id: number;
  file_name: string;
  storage_path: string | null;
  team_id: number | null;
  created_at: string;
  uploaded_by: string;
};
type Submission = {
  id: number;
  student_id: string;
  team_id: number | null;
  title: string;
  category: string;
  body: string;
  created_at: string;
};

const categories = [
  "سيناريو",
  "معالجة درامية",
  "أفكار",
  "إنتاج",
  "تصميم فني",
  "تصوير",
  "صوت",
  "مونتاج",
  "تقرير",
  "أخرى",
];

const filters = [
  ["all", "الكل", "⌕"],
  ["image", "صور", "▧"],
  ["video", "فيديو", "▶"],
  ["audio", "صوتيات", "♫"],
] as const;

export default function Submissions() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [assetType, setAssetType] = useState("all");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recordError, setRecordError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [supervisor, setSupervisor] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [items, setItems] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState("");
  const [category, setCategory] = useState("سيناريو");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  async function load() {
    const db = getSupabase();
    if (!db) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setAuthReady(true);
      return;
    }
    const { data: { user: currentUser } } = await db.auth.getUser();
    if (!currentUser) {
      setUser("");
      setAuthRequired(true);
      setAuthReady(true);
      return;
    }

    setAuthRequired(false);
    setUser(currentUser.id);
    const [profile, teamResult, submissions, attachmentResult] = await Promise.all([
      db.from("profiles").select("app_role").eq("id", currentUser.id).single(),
      db.from("teams").select("id,name").order("id"),
      db.from("work_submissions")
        .select("id,student_id,team_id,title,category,body,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("attachments")
        .select("id,file_name,storage_path,team_id,created_at,uploaded_by")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (attachmentResult.data) setAttachments(attachmentResult.data as Attachment[]);
    setSupervisor(profile.data?.app_role === "supervisor");
    if (teamResult.data) setTeams(teamResult.data);
    if (submissions.data) {
      setItems(submissions.data);
      if (profile.data?.app_role === "supervisor") {
        const ids = [...new Set(submissions.data.map((item) => item.student_id))];
        if (ids.length) {
          const people = await db.from("profiles").select("id,full_name").in("id", ids);
          if (people.data) {
            setNames(Object.fromEntries(people.data.map((person) => [person.id, person.full_name || "طالب"])));
          }
        }
      }
    }
    setAuthReady(true);
  }

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const requestedTeam = params.get("team");
    if (requestedTeam) setTeam(requestedTeam);
    const kind = params.get("kind");
    if (kind === "media") setAssetType("media");
    else if (kind === "file") setAssetType("all");
    if (kind === "link") {
      window.setTimeout(() => document.getElementById("link-dock")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }
    if (kind === "voice") {
      window.setTimeout(() => document.getElementById("voice-dock")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }
    if (kind === "file" || kind === "media") {
      window.setTimeout(() => document.getElementById("upload-files")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }
  }, []);

  async function submit() {
    const db = getSupabase();
    if (!db || !user || !team || title.trim().length < 3) return;
    setSaving(true);
    setError("");
    setNotice("");
    const { error: saveError } = await db.from("work_submissions").insert({
      student_id: user,
      team_id: Number(team),
      title: title.trim(),
      category,
      body: body.trim(),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setBody("");
    setNotice("تم حفظ التسليم بنجاح ✓");
    await load();
  }

  async function uploadAsset(asset: File | Blob, voice = false, keepSelection = false) {
    if (voice) setVoiceStatus("جارٍ إرسال التسجيل…");
    const db = getSupabase();
    if (!db || !user || !team || title.trim().length < 3) {
      setError("اكتبي عنوان التسليم واختاري الفريق أولًا.");
      if (voice) setVoiceStatus("التسجيل ما زال محفوظًا هنا. احتفظي بنسخة على جهازك.");
      return;
    }

    const voiceMime = asset.type || "audio/webm";
    const voiceExt = voiceMime.includes("mp4") ? "m4a" : voiceMime.includes("ogg") ? "ogg" : "webm";
    const name = title.trim() + " — " + (
      voice
        ? "تسجيل صوتي " + new Date().toISOString().replace(/[:.]/g, "-") + "." + voiceExt
        : (asset as File).name
    );

    if (!asset.size || asset.size > 52428800) {
      setError("الحد الأقصى لحجم الملف 50 ميجابايت.");
      if (voice) setVoiceStatus("التسجيل ما زال متاحًا للتحميل.");
      return;
    }

    setUploadBusy(true);
    setError("");
    setNotice("");
    const storagePath = team + "/direct/" + user + "/" + crypto.randomUUID();
    const upload = await db.storage.from("studio-files").upload(storagePath, asset, {
      contentType: voice ? voiceMime : asset.type || "application/octet-stream",
      upsert: false,
    });

    if (upload.error) {
      setError("تعذر رفع الملف: " + upload.error.message);
      if (voice) setVoiceStatus("فشل الرفع. احتفظي بنسخة ثم حاولي مجددًا.");
      setUploadBusy(false);
      return;
    }

    const result = await db.from("attachments").insert({
      contribution_id: null,
      team_id: Number(team),
      uploaded_by: user,
      storage_path: storagePath,
      file_name: name,
      file_type: voice ? voiceMime : asset.type || null,
    });
    setUploadBusy(false);

    if (result.error) {
      const cleaned = await cleanupFailedUpload(db, storagePath);
      setError(cleaned
        ? "لم يُحفظ الملف. يمكنك إعادة المحاولة."
        : "لم يتم تأكيد الحفظ أو تنظيف النسخة غير المحفوظة. راجعي المشرفة قبل إعادة الرفع.");
      if (voice) setVoiceStatus("لم يتم تأكيد حفظ التسجيل.");
      return;
    }

    if (!keepSelection) setFiles([]);
    if (voice) {
      setVoiceSaved(true);
      setVoiceStatus("تم إرسال التسجيل وحفظه بنجاح ✓");
    } else {
      setNotice("تم حفظ الملف ✓");
    }
    if (!keepSelection) await load();
  }

  async function uploadMany() {
    if (!files.length || !team || title.trim().length < 3) return;
    setUploadProgress("");
    let done = 0;

    for (const asset of files) {
      setUploadProgress("جارٍ رفع " + (done + 1) + " من " + files.length + " · " + asset.name);
      const db = getSupabase();
      if (!db || !user) break;
      if (!asset.size || asset.size > 52428800) {
        setError("الملف " + asset.name + " فارغ أو يتجاوز 50 ميجابايت.");
        break;
      }

      setUploadBusy(true);
      setError("");
      const storagePath = team + "/direct/" + user + "/" + crypto.randomUUID();
      const upload = await db.storage.from("studio-files").upload(storagePath, asset, {
        contentType: asset.type || "application/octet-stream",
        upsert: false,
      });
      if (upload.error) {
        setError("تعذر رفع " + asset.name + ": " + upload.error.message);
        break;
      }

      const row = await db.from("attachments").insert({
        contribution_id: null,
        team_id: Number(team),
        uploaded_by: user,
        storage_path: storagePath,
        file_name: title.trim() + " — " + asset.name,
        file_type: asset.type || null,
      });
      if (row.error) {
        const cleaned = await cleanupFailedUpload(db, storagePath);
        setError(cleaned
          ? "فشل تسجيل " + asset.name + " ويمكنك إعادة المحاولة."
          : "لم يتم تأكيد تسجيل " + asset.name + " أو تنظيفه. تواصلي مع المشرفة.");
        break;
      }
      done++;
    }

    setUploadBusy(false);
    setFiles((previous) => previous.slice(done));
    setUploadProgress("");
    if (done) setNotice("تم رفع " + done + " من " + files.length + " عناصر بنجاح ✓");
    await load();
  }

  async function submitLink() {
    const db = getSupabase();
    setError("");
    setNotice("");
    if (!db) {
      setError("تعذر الاتصال بقاعدة البيانات. حدّثي الصفحة وحاولي مرة أخرى.");
      return;
    }
    if (!user) {
      setError("سجّلي الدخول أولًا لحفظ الرابط.");
      return;
    }
    if (!team) {
      setError("اختاري الفريق أولًا.");
      document.getElementById("submission-team")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    let normalized = "";
    let hostname = "";
    try {
      const url = new URL(sourceUrl.trim());
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".")) throw Error("invalid");
      normalized = url.toString();
      hostname = url.hostname.replace(/^www\./, "");
    } catch {
      setError("اكتبي رابطًا صحيحًا يبدأ بـ https:// أو http://");
      return;
    }

    const linkTitle = sourceLabel.trim() || title.trim() || ("رابط من " + hostname);
    setSaving(true);
    const result = await db.from("work_submissions").insert({
      student_id: user,
      team_id: Number(team),
      title: linkTitle,
      category: "روابط ومصادر",
      body: normalized,
    }).select("id").single();
    setSaving(false);

    if (result.error || !result.data) {
      setError("تعذر حفظ الرابط: " + (result.error?.message || "لم يتم تأكيد الحفظ"));
      return;
    }

    setSourceUrl("");
    setSourceLabel("");
    setNotice("تم حفظ الرابط بنجاح ✓");
    await load();
  }

  async function startRecording() {
    if (audio && !voiceSaved && !window.confirm("عند بدء تسجيل جديد سيتم استبدال التسجيل الحالي. احفظي نسخة منه على جهازك أولًا. هل تريدين المتابعة؟")) return;
    if (!team || title.trim().length < 3) {
      setRecordError("اكتبي عنوان التسليم واختاري الفريق قبل التسجيل.");
      document.getElementById(!team ? "submission-team" : "submission-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordError("المتصفح لا يدعم التسجيل الصوتي.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;
      chunks.current = [];
      setVoiceSaved(false);
      setVoiceStatus("");
      setAudio(null);
      const preferred = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = new MediaRecorder(mediaStream, preferred ? { mimeType: preferred } : undefined);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const recorded = new Blob(chunks.current, { type: mediaRecorder.mimeType || preferred || "audio/webm" });
        if (recorded.size) {
          setAudio(recorded);
          setVoiceStatus("أوقفي التسجيل، استمعي إليه، ثم أرسليه.");
        } else {
          setRecordError("التسجيل فارغ. حاولي مرة أخرى.");
        }
        mediaStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setRecording(false);
      };
      mediaRecorder.start();
      setRecordError("");
      setRecording(true);
    } catch {
      setRecordError("اسمحي للموقع باستخدام الميكروفون من إعدادات المتصفح.");
    }
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function discardRecording() {
    if (!audio || uploadBusy || recording) return;
    if (!window.confirm("هل تريدين حذف التسجيل الحالي؟ لا يمكن استرجاعه إذا لم تحفظي نسخة على جهازك.")) return;
    setAudio(null);
    setVoiceSaved(false);
    setVoiceStatus("تم حذف التسجيل.");
    setRecordError("");
    setError("");
  }

  useEffect(() => {
    if (!audio) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  useEffect(() => () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function downloadRecording() {
    if (!audioUrl) return;
    const anchor = document.createElement("a");
    anchor.href = audioUrl;
    anchor.download = "تسجيل-plateau-" + new Date().toISOString().slice(0, 10) + (
      audio?.type.includes("mp4") ? ".m4a" : audio?.type.includes("ogg") ? ".ogg" : ".webm"
    );
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setVoiceStatus("تم طلب تنزيل النسخة الاحتياطية. تأكدي من حفظها على جهازك.");
  }

  async function openAsset(storagePath: string) {
    const db = getSupabase();
    if (!db) return;
    const result = await db.storage.from("studio-files").createSignedUrl(storagePath, 60);
    if (result.error || !result.data?.signedUrl) {
      setError("تعذر فتح الملف.");
      return;
    }
    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const fileAccept = assetType === "image"
    ? "image/*"
    : assetType === "video"
      ? "video/*"
      : assetType === "audio"
        ? "audio/*"
        : assetType === "media"
          ? "image/*,video/*"
          : undefined;

  return (
    <main className="submissions-page" dir="rtl">
      <header className="submissions-header">
        <a className="submissions-back" href="/production-hub">← غرفة الإنتاج</a>
        <div className="submissions-title">
          <span className="submissions-eyebrow">PLATEAU CREW HUB · WORKSPACE</span>
          <h1>التسليمات</h1>
          <p>اكتبي، ارفعي، وراجعي تسليماتك.</p>
        </div>
      </header>

      {(error || notice) && (
        <div className={"submission-feedback" + (error ? " is-error" : " is-success")} role={error ? "alert" : "status"}>
          <span aria-hidden="true">{error ? "!" : "✦"}</span>
          <p>{error || notice}</p>
        </div>
      )}

      {!authReady ? (
        <section className="submission-card submission-login-required" aria-live="polite">
          <div className="submission-card-heading">
            <span className="submission-step">🔐</span>
            <div><h2>جارٍ استعادة جلستك</h2><p>نتحقق من تسجيل الدخول المحفوظ على هذا المتصفح…</p></div>
          </div>
        </section>
      ) : authRequired ? (
        <section className="submission-card submission-login-required">
          <div className="submission-card-heading">
            <span className="submission-step">🔐</span>
            <div><h2>تسجيل الدخول مطلوب</h2><p>سجّلي الدخول مرة واحدة على هذا الرابط والمتصفح، وستظل جلستك محفوظة.</p></div>
          </div>
          <button type="button" className="submission-button submission-button-primary" onClick={() => window.location.assign("/login?next=%2Fsubmissions")}>تسجيل الدخول والعودة للتسليمات</button>
        </section>
      ) : user && (
        <>
          <section className="submission-card submission-card-details">
            <div className="submission-card-heading">
              <span className="submission-step">01</span>
              <div><h2>بيانات التسليم</h2><p>العنوان والفريق</p></div>
            </div>
            <div className="submission-fields">
              <label className="submission-field">
                <span>عنوان التسليم</span>
                <input id="submission-title" maxLength={160} placeholder="مثال: معالجة المشهد الأول" value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="submission-field">
                <span>الفريق</span>
                <select id="submission-team" value={team} onChange={(event) => setTeam(event.target.value)}>
                  <option value="">اختاري فريقك</option>
                  {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="submission-card submission-card-writing">
            <div className="submission-card-heading">
              <span className="submission-step">02</span>
              <div><h2>كتابة نص <small>اختياري</small></h2><p>اختاري النوع واكتبي النص</p></div>
            </div>
            <div className="submission-fields">
              <label className="submission-field">
                <span>نوع التسليم</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="submission-field submission-field-full">
                <span>النص</span>
                <textarea rows={5} maxLength={20000} placeholder="اكتبي النص هنا…" value={body} onChange={(event) => setBody(event.target.value)} />
                <small className="submission-field-note">{body.length.toLocaleString("ar-EG")} / 20,000 · 20 حرفًا على الأقل للحفظ</small>
              </label>
            </div>
            <div className="submission-card-footer">
              <button className="submission-button submission-button-primary" disabled={saving || !team || title.trim().length < 3 || body.trim().length < 20} onClick={() => void submit()}>
                {saving ? "جارٍ الحفظ…" : "حفظ التسليم"}
              </button>
            </div>
          </section>

          <section className="submission-card submission-card-tools" id="upload-files">
            <div className="submission-card-heading">
              <span className="submission-step">03</span>
              <div><h2>الملفات والروابط والصوت</h2><p>اختاري طريقة الإرسال</p></div>
            </div>

            <div className="submission-filter-row" role="group" aria-label="نوع الملفات">
              {filters.map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  className={"submission-filter" + (assetType === value ? " is-active" : "")}
                  aria-pressed={assetType === value}
                  onClick={() => { setAssetType(value); setFiles([]); }}
                >
                  <span aria-hidden="true">{icon}</span>{label}
                </button>
              ))}
            </div>

            <div className="submission-upload-box">
              <label className="submission-field">
                <span>اختيار الملفات</span>
                <input
                  key={assetType}
                  className="submission-file-input"
                  type="file"
                  multiple
                  accept={fileAccept}
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                />
              </label>
              {files.length > 0 && (
                <div className="submission-file-list">
                  <div className="submission-file-count">تم اختيار {files.length} عناصر</div>
                  {files.map((file, index) => (
                    <div className="submission-file-row" key={index}>
                      <span>{file.name}</span><small>{(file.size / 1048576).toFixed(1)} MB</small>
                    </div>
                  ))}
                  <button type="button" className="submission-text-button" onClick={() => setFiles([])}>إلغاء التحديد</button>
                </div>
              )}
              <div className="submission-card-footer">
                <button
                  className="submission-button submission-button-primary"
                  disabled={!team || title.trim().length < 3 || !files.length || uploadBusy}
                  onClick={() => void uploadMany()}
                >
                  {uploadBusy ? "جارٍ رفع الملفات…" : "رفع " + files.length + " عناصر"}
                </button>
              </div>
              {uploadProgress && <p className="submission-progress" role="status">{uploadProgress}</p>}
            </div>

            <div className="submission-tools-grid">
              <div className="submission-tool-panel" id="link-dock">
                <div className="submission-tool-title"><span aria-hidden="true">↗</span><h3>إضافة رابط</h3></div>
                <label className="submission-field">
                  <span>الرابط</span>
                  <input type="url" dir="ltr" placeholder="https://…" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
                </label>
                <label className="submission-field">
                  <span>اسم المصدر <small>اختياري</small></span>
                  <input placeholder="اسم مختصر للرابط" value={sourceLabel} maxLength={160} onChange={(event) => setSourceLabel(event.target.value)} />
                </label>
                <button type="button" className="submission-button submission-button-secondary" disabled={saving || !sourceUrl.trim()} onClick={() => void submitLink()}>
                  {saving ? "جارٍ الحفظ…" : "حفظ الرابط"}
                </button>
              </div>

              <div className={"submission-tool-panel submission-voice-panel" + (recording ? " is-recording" : "")} id="voice-dock" data-recording={recording}>
                <div className="submission-tool-title">
                  <span aria-hidden="true">♫</span><h3>تسجيل صوتي</h3>
                  <i className="submission-recording-dot" aria-hidden="true" />
                </div>
                <div className="submission-voice-actions">
                  <button type="button" className="submission-button submission-button-secondary" disabled={recording || uploadBusy} onClick={() => void startRecording()}>بدء التسجيل</button>
                  <button type="button" className="submission-button submission-button-quiet" disabled={!recording} onClick={stopRecording}>إيقاف</button>
                </div>
                {audio && (
                  <div className="submission-audio-tools">
                    <audio controls preload="metadata" src={audioUrl} />
                    <div className="submission-voice-actions">
                      <button type="button" className="submission-button submission-button-primary" disabled={uploadBusy} onClick={() => void uploadAsset(audio, true)}>
                        {uploadBusy ? "جارٍ الإرسال…" : "إرسال التسجيل"}
                      </button>
                      <button type="button" className="submission-button submission-button-quiet" disabled={uploadBusy || recording} onClick={downloadRecording}>حفظ نسخة</button>
                      <button type="button" className="submission-text-button" disabled={uploadBusy || recording} onClick={discardRecording}>حذف</button>
                    </div>
                    <span className="submission-voice-saved">{voiceSaved ? "تم الحفظ في الموقع ✓" : "التسجيل لم يُرسل بعد"}</span>
                  </div>
                )}
                {recording && <p className="submission-recording-live" role="status">● جارٍ التسجيل الآن</p>}
                {voiceStatus && <p className="submission-status-line" role="status">{voiceStatus}</p>}
                {recordError && <p className="submission-inline-error" role="alert">{recordError}</p>}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="submission-card submission-history">
        <div className="submission-card-heading">
          <span className="submission-step">04</span>
          <div><h2>التسليمات السابقة</h2><p>{items.length} تسليم</p></div>
        </div>

        {items.length === 0 ? (
          <div className="submission-empty">لا توجد تسليمات حتى الآن.</div>
        ) : (
          <div className="submission-history-list">
            {items.map((item) => (
              <article className="submission-history-item" key={item.id}>
                <div className="submission-history-main">
                  <strong>{item.title}</strong>
                  <div className="submission-history-meta">
                    <span>{supervisor ? (names[item.student_id] ?? "طالب") : "تسليمي"}</span>
                    <span>{item.category}</span>
                    <span>{teams.find((entry) => entry.id === item.team_id)?.name ?? "بدون فريق"}</span>
                    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("ar-EG")}</time>
                  </div>
                </div>
                <div className="submission-history-actions">
                  <button type="button" className="submission-button submission-button-quiet" onClick={() => setSelected(selected === item.id ? null : item.id)}>
                    {selected === item.id ? "إخفاء النص" : "عرض النص"}
                  </button>
                  {supervisor && (
                    <button
                      type="button"
                      className="submission-button submission-button-secondary"
                      onClick={() => { sessionStorage.setItem("review_submission", item.body); window.location.href = "/ai-review"; }}
                    >
                      إرسال للوكيل للمراجعة
                    </button>
                  )}
                </div>
                {selected === item.id && (
                  <div className="submission-history-body">
                    {item.category === "روابط ومصادر"
                      ? <a href={item.body} target="_blank" rel="noopener noreferrer">{item.body}</a>
                      : item.body}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="submission-attachments">
            <div className="submission-subheading"><h3>الملفات المرفوعة</h3><span>{attachments.length}</span></div>
            <div className="submission-attachment-list">
              {attachments.map((attachment) => (
                <article className="submission-attachment-item" key={attachment.id}>
                  <span className="submission-attachment-icon" aria-hidden="true">
                    {attachment.file_name.toLowerCase().includes("تسجيل صوتي") ? "♫" : "▧"}
                  </span>
                  <div><strong>{attachment.file_name}</strong><small>{teams.find((entry) => entry.id === attachment.team_id)?.name ?? "ملف"} · {new Date(attachment.created_at).toLocaleDateString("ar-EG")}</small></div>
                  <button type="button" className="submission-text-button" disabled={!attachment.storage_path} onClick={() => attachment.storage_path && void openAsset(attachment.storage_path)}>فتح</button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
