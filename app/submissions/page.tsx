"use client";

import { cleanupFailedUpload } from "../../lib/cleanup-failed-upload";
import { useEffect, useRef, useState } from "react";
import { getAuthUser, getSupabase } from "../../lib/supabase-browser";
import "./submissions.css";

type Team = { id: number; name: string };

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

const methods = [["file","ملفات","▧"],["link","رابط","↗"],["voice","صوت","♫"],["text","نص","≡"]] as const;
type Method = typeof methods[number][0];

export default function Submissions() {
  const [method, setMethod] = useState<Method | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileAccept, setFileAccept] = useState<string | undefined>(undefined);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [sourceUrl, setSourceUrl] = useState("");
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
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [supervisor, setSupervisor] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState("");
  const [category, setCategory] = useState("سيناريو");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const db = getSupabase();
    if (!db) {
      setError("تعذر الاتصال بقاعدة البيانات.");
      setAuthReady(true);
      return;
    }
    const { data: { user: currentUser } } = await getAuthUser();
    if (!currentUser) {
      setUser("");
      setAuthRequired(true);
      setAuthReady(true);
      return;
    }

    setAuthRequired(false);
    if (currentUser.app_metadata?.must_change_password === true) {
      window.location.replace("/change-password");
      return;
    }
    const profile = await db.from("profiles").select("app_role,approval_status").eq("id", currentUser.id).single();
    if (profile.error || profile.data?.approval_status !== "approved") {
      setError("التسليم متاح بعد اعتماد الحساب.");
      setAuthReady(true);
      return;
    }
    const isSupervisor = profile.data.app_role === "supervisor";
    setSupervisor(isSupervisor);
    const [teamResult, membershipResult] = await Promise.all([
      db.from("teams").select("id,name").order("id"),
      db.from("team_members").select("team_id").eq("user_id",currentUser.id),
    ]);
    if (teamResult.error || membershipResult.error) {
      setError("تعذر تحميل الفرق. حدّثي الصفحة.");
      setAuthReady(true);
      return;
    }
    const allowedIds = new Set((membershipResult.data ?? []).map(x=>x.team_id));
    const allowed = (teamResult.data ?? []).filter(t=>isSupervisor || allowedIds.has(t.id));
    setTeams(allowed);
    setTeam(previous=>allowed.some(t=>String(t.id)===previous)?previous:allowed.length===1?String(allowed[0].id):"");
    setUser(currentUser.id);
    setAuthReady(true);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTeam = params.get("team");
    if (requestedTeam) setTeam(requestedTeam);
    const kind = params.get("kind");
    if (kind === "media") {setMethod("file");setFileAccept("image/*,video/*");}
    else if (kind === "file" || kind === "link" || kind === "voice" || kind === "text") setMethod(kind);
    void load();
  }, []);

  async function submit() {
    const db = getSupabase();
    if (!db || !user || !team || title.trim().length < 3 || body.trim().length < 20 || saving) return;
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
    setFileInputKey(value=>value+1);
    setUploadProgress("");
    if (done) setNotice("تم رفع " + done + " من " + files.length + " عناصر بنجاح ✓");
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
    if (!team || title.trim().length < 3) {
      setError("اكتبي عنوان التسليم واختاري الفريق أولًا.");
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

    const linkTitle = title.trim() || ("رابط من " + hostname);
    setSaving(true);
    const result = await db.from("work_submissions").insert({
      student_id: user,
      team_id: Number(team),
      title: linkTitle,
      category: "روابط ومصادر",
      body: normalized,
    });
    setSaving(false);

    if (result.error) {
      setError("تعذر حفظ الرابط: " + (result.error?.message || "لم يتم تأكيد الحفظ"));
      return;
    }

    setSourceUrl("");
    setNotice("تم حفظ الرابط بنجاح ✓");
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

  const busy = saving || uploadBusy || recording;
  const ready = Boolean(user && team && title.trim().length >= 3);

  return (
    <main className="quick-submit-clean" dir="rtl">
      <header className="qs-header" dir="ltr">
        <a className="qs-back" href="/" aria-label="Back to home">←</a>
        <h1>Quick Submit</h1>
      </header>
      {!authReady && <p className="qs-status" role="status">جارٍ التحميل…</p>}
      {authReady && authRequired && <section className="qs-login"><a href="/login?next=%2Fsubmissions">تسجيل الدخول للتسليم</a></section>}
      {authReady && user && (
        <section className="qs-card">
          <div className="qs-fields">
            <label>عنوان التسليم<input id="submission-title" maxLength={160} placeholder="عنوان التكليف" disabled={busy} value={title} onChange={e=>setTitle(e.target.value)}/></label>
            <label>الفريق<select id="submission-team" disabled={busy} value={team} onChange={e=>setTeam(e.target.value)}>
              <option value="">اختاري الفريق</option>
              {teams.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
          </div>
          <div className="qs-methods" role="group" aria-label="طريقة التسليم">
            {methods.map(([value,label,icon])=><button key={value} type="button" disabled={busy} aria-pressed={method===value} onClick={()=>{setMethod(method===value?null:value);setError("");setNotice("");}}><span aria-hidden="true">{icon}</span>{label}</button>)}
          </div>
          {method==="file" && <div className="qs-panel" id="upload-files">
            <label className="qs-file-picker">＋ اختاري الملفات<input key={fileInputKey} type="file" multiple accept={fileAccept} disabled={busy} onChange={e=>setFiles(Array.from(e.target.files??[]))}/></label>
            <small>حتى 50 ميجابايت لكل ملف.</small>
            {files.length>0&&<div className="qs-file-list">{files.map((file,index)=><span key={index}>{file.name}</span>)}<button type="button" className="qs-secondary" disabled={busy} onClick={()=>{setFiles([]);setFileInputKey(v=>v+1);}}>إلغاء الاختيار</button></div>}
            <button className="qs-send" disabled={!ready||busy||!files.length} onClick={()=>void uploadMany()}>{uploadBusy?"جارٍ الرفع…":"إرسال"+(files.length?" ("+files.length+")":"")}</button>
            {uploadProgress&&<p className="qs-status" role="status">{uploadProgress}</p>}
          </div>}
          {method==="link" && <div className="qs-panel" id="link-dock">
            <label>الرابط<input type="url" dir="ltr" placeholder="https://…" disabled={busy} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label>
            <button className="qs-send" disabled={!ready||busy||!sourceUrl.trim()} onClick={()=>void submitLink()}>{saving?"جارٍ الإرسال…":"إرسال"}</button>
          </div>}
          {method==="voice" && <div className="qs-panel" id="voice-dock">
            {!recording?<button type="button" className="qs-secondary" disabled={!ready||saving||uploadBusy} onClick={()=>void startRecording()}>● بدء التسجيل</button>:<button type="button" className="qs-stop" onClick={stopRecording}>■ إيقاف التسجيل</button>}
            {recording&&<p className="qs-status" role="status">جارٍ التسجيل…</p>}
            {audio&&<><audio controls preload="metadata" src={audioUrl}/><div className="qs-voice-actions"><button type="button" className="qs-secondary" disabled={busy} onClick={downloadRecording}>حفظ نسخة</button><button type="button" className="qs-secondary" disabled={busy} onClick={discardRecording}>حذف التسجيل</button></div><button className="qs-send" disabled={!ready||busy||voiceSaved} onClick={()=>void uploadAsset(audio,true)}>{uploadBusy?"جارٍ الإرسال…":voiceSaved?"تم الإرسال ✓":"إرسال"}</button></>}
            {voiceStatus&&<p className="qs-status" role="status">{voiceStatus}</p>}
            {recordError&&<p className="qs-error" role="alert">{recordError}</p>}
          </div>}
          {method==="text" && <div className="qs-panel">
            <label>نوع النص<select value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}>{categories.map(item=><option key={item}>{item}</option>)}</select></label>
            <label>النص<textarea rows={4} maxLength={20000} placeholder="اكتبي النص هنا…" disabled={busy} value={body} onChange={e=>setBody(e.target.value)}/></label>
            <small>20 حرفًا على الأقل.</small>
            <button className="qs-send" disabled={!ready||busy||body.trim().length<20} onClick={()=>void submit()}>{saving?"جارٍ الإرسال…":"إرسال"}</button>
          </div>}
        </section>
      )}
      {(error||notice)&&<p className={error?"qs-error":"qs-success"} role={error?"alert":"status"}>{error||notice}</p>}
      {authReady&&user&&supervisor&&<a className="qs-review" href="/dashboard">مراجعة التسليمات في لوحة المشرف ←</a>}
    </main>
  );
}
