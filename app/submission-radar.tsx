"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthUser, getSupabase } from "../lib/supabase-browser";

type Item = {
  key: string;
  kind: "file" | "work";
  id: number;
  team: number;
  student: string;
  title: string;
  created: string;
  path?: string | null;
  mime?: string | null;
  url?: string | null;
  body?: string | null;
  seen: boolean;
  reviewed: boolean;
  stars: number;
  stampStatus: string | null;
  note: string;
};

type StatusFilter = "all" | "unseen" | "pending" | "reviewed";
type StampChoice = "approved" | "revise" | "reviewing";
type PreviewKind = "text" | "image" | "video" | "audio" | "pdf" | "other";

const teamNames: Record<number, string> = {
  1: "التصميم والصوت",
  2: "الإنتاج والممثلين",
  3: "التصوير والإخراج",
  4: "المونتاج",
  5: "الكتابة والسيناريو",
};

function getPreviewKind(item: Item): PreviewKind {
  if (item.kind === "work") return "text";
  const mime = (item.mime || "").toLowerCase();
  const name = item.title.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|svg)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi)$/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac)$/i.test(name)) return "audio";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  return "other";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "تاريخ غير محدد"
    : date.toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
}

export default function SubmissionRadar({
  compact = false,
  hideWhenClear = false,
}: {
  compact?: boolean;
  hideWhenClear?: boolean;
}) {
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("unseen");
  const [selected, setSelected] = useState<Item | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [stampChoice, setStampChoice] = useState<StampChoice>("reviewing");
  const [reviewNote, setReviewNote] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const load = useCallback(async () => {
    const db = getSupabase();
    if (!db) return;

    const { data: { user }, error: authError } = await getAuthUser();
    if (authError || !user) return;

    const profile = await db.from("profiles").select("app_role").eq("id", user.id).single();
    if (profile.error || profile.data?.app_role !== "supervisor") {
      setAllowed(false);
      return;
    }

    setAllowed(true);

    const [files, works, views, fileReviews, writtenReviews, feedback, profiles] = await Promise.all([
      db.from("attachments")
        .select("id,team_id,uploaded_by,file_name,storage_path,file_type,external_url,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("work_submissions")
        .select("id,team_id,student_id,title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("supervisor_submission_views")
        .select("source_type,source_id")
        .eq("supervisor_id", user.id),
      db.from("attachment_reviews")
        .select("attachment_id,stars,stamp_status,reviewed_by"),
      db.from("written_submission_reviews")
        .select("source_type,source_id,stars,stamp_status,reviewed_by"),
      db.from("submission_feedback_notes")
        .select("source_type,source_id,note"),
      db.from("profiles").select("id,full_name"),
    ]);

    if (files.error || works.error || views.error) {
      setError("تعذر تحميل التسليمات: " + (files.error?.message || works.error?.message || views.error?.message));
      return;
    }

    const seen = new Set((views.data || []).map((x) => x.source_type + ":" + x.source_id));
    const fileReviewMap = new Map((fileReviews.data || []).map((x) => [x.attachment_id, x]));
    const writtenReviewMap = new Map((writtenReviews.data || []).map((x) => [x.source_type + ":" + x.source_id, x]));
    const noteMap = new Map((feedback.data || []).map((x) => [x.source_type + ":" + x.source_id, x.note || ""]));
    const names = new Map((profiles.data || []).map((x) => [x.id, x.full_name]));

    const all: Item[] = [
      ...(files.data || []).map((x) => {
        const review = fileReviewMap.get(x.id);
        const key = "file:" + x.id;
        return {
          key,
          kind: "file" as const,
          id: x.id,
          team: Number(x.team_id || 0),
          student: names.get(x.uploaded_by) || "طالب",
          title: x.file_name,
          created: x.created_at,
          path: x.storage_path,
          mime: x.file_type,
          url: x.external_url,
          seen: seen.has(key),
          reviewed: Boolean(review?.stamp_status || review?.reviewed_by || Number(review?.stars) > 0),
          stars: Number(review?.stars || 0),
          stampStatus: review?.stamp_status || null,
          note: noteMap.get(key) || "",
        };
      }),
      ...(works.data || []).map((x) => {
        const key = "work:" + x.id;
        const review = writtenReviewMap.get(key);
        return {
          key,
          kind: "work" as const,
          id: x.id,
          team: Number(x.team_id || 0),
          student: names.get(x.student_id) || "طالب",
          title: x.title || "تسليم مكتوب",
          created: x.created_at,
          body: x.body,
          seen: seen.has(key),
          reviewed: Boolean(review?.stamp_status || review?.reviewed_by || Number(review?.stars) > 0),
          stars: Number(review?.stars || 0),
          stampStatus: review?.stamp_status || null,
          note: noteMap.get(key) || "",
        };
      }),
    ].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    setItems(all);
    setError("");
  }, []);

  useEffect(() => {
    void load();
    const db = getSupabase();
    if (!db) return;

    const channel = db.channel("supervisor-radar")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attachments" }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "work_submissions" }, () => void load())
      .subscribe();

    const timer = window.setInterval(() => void load(), 45000);
    return () => {
      window.clearInterval(timer);
      void db.removeChannel(channel);
    };
  }, [load]);

  const unseen = items.filter((item) => !item.seen).length;
  const pending = items.filter((item) => item.seen && !item.reviewed).length;
  const reviewedCount = items.filter((item) => item.reviewed).length;

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "unseen") return !item.seen;
    if (filter === "pending") return item.seen && !item.reviewed;
    if (filter === "reviewed") return item.reviewed;
    return true;
  }), [items, filter]);

  async function markSeen(item: Item) {
    if (item.seen) return true;
    const db = getSupabase();
    if (!db) return false;

    const { data: { user } } = await getAuthUser();
    if (!user) return false;

    const result = await db.from("supervisor_submission_views").upsert(
      { source_type: item.kind, source_id: item.id, supervisor_id: user.id },
      { onConflict: "source_type,source_id,supervisor_id", ignoreDuplicates: true }
    );

    if (result.error) {
      setError("تعذر حفظ حالة المشاهدة: " + result.error.message);
      return false;
    }

    setItems((current) => current.map((entry) =>
      entry.key === item.key ? { ...entry, seen: true } : entry
    ));
    return true;
  }

  async function openItem(item: Item) {
    setBusy(item.key);
    setError("");
    setSavedMessage("");
    setSelected(item);
    setReviewStars(item.stars || 0);
    setStampChoice((item.stampStatus as StampChoice) || "reviewing");
    setReviewNote(item.note || "");
    setPreviewUrl("");
    setPreviewLoading(item.kind === "file");

    try {
      const seenSaved = await markSeen(item);
      setSelected((current) => current?.key === item.key
        ? { ...current, seen: current.seen || seenSaved }
        : current
      );

      if (item.kind === "file") {
        const db = getSupabase();
        let url = item.url || "";

        if (item.path && db) {
          const signed = await db.storage.from("studio-files").createSignedUrl(item.path, 300);
          if (!signed.error && signed.data?.signedUrl) {
            url = signed.data.signedUrl;
          } else if (!url) {
            setError("تعذر تجهيز معاينة الملف. يمكنك إعادة المحاولة بعد قليل.");
          }
        }

        if (url) setPreviewUrl(url);
        else if (!item.path) setError("لا يوجد رابط صالح لهذا الملف.");
      }
    } catch (cause) {
      setError("حدث خطأ أثناء فتح التسليم.");
    } finally {
      setPreviewLoading(false);
      setBusy("");
    }
  }

  async function saveReview() {
    if (!selected) return;
    const db = getSupabase();
    if (!db) return;

    setReviewBusy(true);
    setError("");
    setSavedMessage("");

    const { data: { user } } = await getAuthUser();
    if (!user) {
      setReviewBusy(false);
      setError("انتهت الجلسة. سجّلي الدخول مرة أخرى.");
      return;
    }

    const sourceType = selected.kind === "file" ? "file" : "work";
    const stampFields = {
      stamp_status: stampChoice,
      stamp_at: new Date().toISOString(),
      stamp_by: user.id,
    };

    const noteResult = await db.from("submission_feedback_notes").upsert(
      {
        source_type: sourceType,
        source_id: selected.id,
        note: reviewNote.trim(),
        updated_by: user.id,
      },
      { onConflict: "source_type,source_id" }
    );

    let ratingError: { message: string } | null = null;

    if (selected.kind === "file") {
      const result = await db.from("attachment_reviews").upsert(
        {
          attachment_id: selected.id,
          stars: reviewStars,
          received: true,
          reviewed_by: user.id,
          ...stampFields,
        },
        { onConflict: "attachment_id" }
      );
      ratingError = result.error;
    } else {
      const result = await db.from("written_submission_reviews").upsert(
        {
          source_type: "work",
          source_id: selected.id,
          stars: reviewStars,
          received: true,
          reviewed_by: user.id,
          ...stampFields,
        },
        { onConflict: "source_type,source_id" }
      );
      ratingError = result.error;
    }

    setReviewBusy(false);

    if (noteResult.error || ratingError) {
      setError("تعذر حفظ التقييم: " + (noteResult.error?.message || ratingError?.message));
      return;
    }

    const updated: Item = {
      ...selected,
      seen: true,
      reviewed: true,
      stars: reviewStars,
      stampStatus: stampChoice,
      note: reviewNote.trim(),
    };

    setItems((current) => current.map((entry) => entry.key === selected.key ? updated : entry));
    setSelected(updated);
    setSavedMessage("تم حفظ التقييم والتعليق بنجاح ✓");
  }

  function closeRadar() {
    setOpen(false);
    setSelected(null);
    setPreviewUrl("");
    setSavedMessage("");
  }

  if (!allowed || (hideWhenClear && items.length === 0)) return null;

  const triggerText = unseen > 0
    ? "REC · لديكِ " + unseen + " تسليمات جديدة · " + pending + " بانتظار التقييم — عرض الكل"
    : pending > 0
      ? "🟡 لديكِ " + pending + " تسليمات بانتظار التقييم — عرض الكل"
      : reviewedCount > 0
        ? "✓ تمت مراجعة جميع التسليمات — عرض الكل"
        : "لا توجد تسليمات جديدة";

  return (
    <section className={"submission-radar " + (compact ? "radar-compact" : "")} dir="rtl">
      <button
        type="button"
        className={"radar-trigger " + (unseen ? "radar-alert" : pending ? "radar-pending" : "radar-clear")}
        onClick={() => { setOpen(true); setSelected(null); setFilter(unseen ? "unseen" : pending ? "pending" : "all"); }}
      >
        <i className="radar-rec" />
        <span>{triggerText}</span>
      </button>

      {open && (
        <div className="radar-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRadar();
        }}>
          <div className={"radar-inbox " + (selected ? "radar-detail-inbox" : "")} role="dialog" aria-modal="true" aria-label="مركز عرض وتقييم التسليمات">
            {!selected ? (
              <>
                <header>
                  <strong>🎬 مركز عرض وتقييم التسليمات · الفرق الخمسة</strong>
                  <button type="button" onClick={closeRadar} aria-label="إغلاق">×</button>
                </header>

                <div className="radar-filters">
                  <button type="button" aria-pressed={filter === "unseen"} onClick={() => setFilter("unseen")}>🔴 لم يُشاهد ({unseen})</button>
                  <button type="button" aria-pressed={filter === "pending"} onClick={() => setFilter("pending")}>🟡 بانتظار التقييم ({pending})</button>
                  <button type="button" aria-pressed={filter === "reviewed"} onClick={() => setFilter("reviewed")}>🟢 تم التقييم ({reviewedCount})</button>
                  <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>عرض الكل ({items.length})</button>
                </div>

                {error && <p className="radar-error" role="alert">{error}</p>}

                <div className="radar-list">
                  {filtered.length ? filtered.map((item) => {
                    const statusClass = !item.seen ? "radar-status-unseen" : item.reviewed ? "radar-status-reviewed" : "radar-status-pending";
                    const statusLabel = !item.seen
                      ? "🔴 جديد · لم يُشاهد"
                      : item.reviewed
                        ? "🟢 تم التقييم"
                        : "🟡 تمت المشاهدة · بانتظار التقييم";

                    return (
                      <article key={item.key} className={"radar-item " + statusClass}>
                        <span className="radar-type">
                          {item.kind === "work" ? "📝" : getPreviewKind(item) === "audio" ? "🎙️" : getPreviewKind(item) === "video" ? "🎬" : getPreviewKind(item) === "image" ? "🖼️" : "📄"}
                        </span>
                        <div className="radar-item-text">
                          <strong>{item.title}</strong>
                          <small>{item.student} · {teamNames[item.team] || "الفريق"} · {formatDate(item.created)}</small>
                          <em>{statusLabel}</em>
                        </div>
                        <div className="radar-actions">
                          <button type="button" disabled={busy === item.key} onClick={() => void openItem(item)}>
                            {busy === item.key ? "جارٍ الفتح…" : "عرض وتقييم"}
                          </button>
                        </div>
                      </article>
                    );
                  }) : (
                    <p className="radar-empty">لا توجد تسليمات في هذه الحالة.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <header className="radar-detail-header">
                  <button type="button" className="radar-back-button" onClick={() => { setSelected(null); setPreviewUrl(""); setSavedMessage(""); }} aria-label="العودة لقائمة التسليمات">→</button>
                  <div>
                    <small>PLATEAU CREW HUB · REVIEW</small>
                    <strong>عرض وتقييم التسليم</strong>
                  </div>
                  <button type="button" onClick={closeRadar} aria-label="إغلاق">×</button>
                </header>

                <div className="studio-review-meta">
                  <b>{selected.title}</b>
                  <span>{selected.student} · {teamNames[selected.team] || "الفريق"} · {formatDate(selected.created)}</span>
                </div>

                <div className="studio-review-preview radar-detail-preview">
                  {selected.kind === "work" ? (
                    <div className="radar-work-content">{selected.body || "لا يوجد نص مرفق."}</div>
                  ) : previewLoading ? (
                    <span>جارٍ تجهيز معاينة الملف…</span>
                  ) : previewUrl ? (
                    getPreviewKind(selected) === "image" ? (
                      <img src={previewUrl} alt={selected.title} />
                    ) : getPreviewKind(selected) === "video" ? (
                      <video controls playsInline src={previewUrl} />
                    ) : getPreviewKind(selected) === "audio" ? (
                      <audio controls src={previewUrl} />
                    ) : getPreviewKind(selected) === "pdf" ? (
                      <iframe src={previewUrl} title={"معاينة " + selected.title} />
                    ) : (
                      <object data={previewUrl} type={selected.mime || undefined} aria-label={selected.title}>
                        <a href={previewUrl} target="_blank" rel="noreferrer">فتح الملف في نافذة جديدة ↗</a>
                      </object>
                    )
                  ) : (
                    <span>تعذرت معاينة الملف. {error || "تحققي من رابط الملف."}</span>
                  )}
                </div>

                <div className="radar-review-form">
                  <label className="studio-review-label">ختم التقييم</label>
                  <div className="gold-stamp-options">
                    {([
                      ["approved", "✦ معتمد"],
                      ["revise", "🎬 تعديل بسيط"],
                      ["reviewing", "◷ قيد المراجعة"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={stampChoice === value ? "chosen" : ""}
                        onClick={() => setStampChoice(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="studio-review-label">التقييم بالنجوم</label>
                  <div className="studio-review-stars" aria-label="التقييم من خمسة">
                    {[1, 2, 3, 4, 5].map((number) => (
                      <button
                        key={number}
                        type="button"
                        className={reviewStars >= number ? "selected" : ""}
                        onClick={() => setReviewStars(number)}
                        aria-label={number + " نجوم"}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <label className="studio-review-label" htmlFor="radar-review-note">تعليق وتوجيه للطالب</label>
                  <textarea
                    id="radar-review-note"
                    maxLength={500}
                    rows={3}
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="اكتبي ملاحظاتك أو المطلوب تعديله..."
                  />

                  {savedMessage && <p className="radar-saved-message" role="status">{savedMessage}</p>}
                  {error && <p className="radar-error" role="alert">{error}</p>}

                  <div className="studio-review-actions">
                    <button type="button" className="studio-review-save" disabled={reviewBusy} onClick={() => void saveReview()}>
                      {reviewBusy ? "جارٍ حفظ التقييم…" : "✓ حفظ التقييم والتعليق"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
