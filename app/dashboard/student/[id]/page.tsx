"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { getSupabase } from "../../../../lib/supabase-browser";

type Profile = { id: string; full_name: string; approval_status: string; app_role: string };
type Team = { id: number; name: string };
type Assignment = { id: number; title: string; due_at: string | null; archived_at: string | null };
type AssignmentTeam = { assignment_id: number; team_id: number };
type Classification = { source_type: string; source_id: number; assignment_id: number | null; team_id: number | null };
type Attachment = {
  id: number; uploaded_by: string; file_name: string; storage_path: string | null;
  external_url: string | null; file_type: string | null; description: string | null;
  created_at: string; team_id: number | null; contribution_id: number | null;
};
type Item = {
  key: string; sourceType: "file" | "contribution" | "submission" | "work"; sourceId: number;
  title: string; createdAt: string; assignmentId: number | null; teamId: number | null;
  body: string | null; category: string | null; storagePath: string | null;
  externalUrl: string | null; fileType: string | null;
};
type Preview = { title: string; url: string; mime: string };

const panel: CSSProperties = {
  background: "#fff", border: "1px solid #e2d5e9", borderRadius: 18,
  boxShadow: "0 10px 28px rgba(74,52,86,.07)",
};
const goldButton: CSSProperties = {
  border: "1px solid #c5a15b", borderRadius: 12, padding: "11px 15px",
  background: "linear-gradient(135deg,#f1dfb8,#d4b06f)", color: "#493650",
  fontWeight: 800, cursor: "pointer",
};
const mutedButton: CSSProperties = {
  border: "1px solid #d9c9e1", borderRadius: 12, padding: "10px 14px",
  background: "#fff", color: "#60466e", fontWeight: 750, cursor: "pointer",
};

function fileMime(item: Item) {
  if (item.fileType) return item.fileType.toLowerCase();
  const name = item.title.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (/\.(png|jpg|jpeg|gif|webp|heic)$/.test(name)) return "image/*";
  if (/\.(mp4|mov|webm)$/.test(name)) return "video/*";
  if (/\.(mp3|m4a|wav|ogg|webm)$/.test(name)) return "audio/*";
  return "application/octet-stream";
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short",
  });
}

function kindLabel(item: Item) {
  if (item.sourceType === "file") {
    const mime = fileMime(item);
    if (mime.startsWith("image/")) return "🖼️ صورة";
    if (mime.startsWith("video/")) return "🎬 فيديو";
    if (mime.startsWith("audio/")) return "🎙️ تسجيل صوتي";
    if (mime.includes("pdf")) return "📕 ملف PDF";
    return "📎 ملف";
  }
  if (item.sourceType === "work") return "✍️ تسليم نصي";
  if (item.sourceType === "contribution") return "📝 مشاركة مكتوبة";
  return "📄 إجابة مكتوبة";
}

export default function StudentReviewPage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id || "";
  const [student, setStudent] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [studentTeamIds, setStudentTeamIds] = useState<number[]>([]);
  const [assignmentTeams, setAssignmentTeams] = useState<AssignmentTeam[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<number | "unassigned" | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let active = true;

    async function load() {
      const db = getSupabase();
      if (!db) {
        if (active) { setError("تعذر الاتصال بقاعدة البيانات."); setLoading(false); }
        return;
      }

      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) {
        window.location.replace("/login");
        return;
      }

      const [supervisorResult, studentResult, teamsResult, assignmentsResult,
        contributionsResult, submissionsResult, worksResult, filesResult, teamMembersResult, assignmentTeamsResult, classificationsResult] = await Promise.all([
        db.from("profiles").select("app_role").eq("id", user.id).single(),
        db.from("profiles").select("id,full_name,approval_status,app_role").eq("id", studentId).single(),
        db.from("teams").select("id,name").order("id"),
        db.from("assignments").select("id,title,due_at,archived_at").order("id", { ascending: true }).limit(300),
        db.from("contributions").select("id,assignment_id,team_id,user_id,title,content,created_at").eq("user_id", studentId).order("created_at", { ascending: false }).limit(1000),
        db.from("submissions").select("id,assignment_id,team_id,submitted_by,content,submitted_at,created_at").eq("submitted_by", studentId).order("created_at", { ascending: false }).limit(1000),
        db.from("work_submissions").select("id,student_id,team_id,title,category,body,created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(1000),
        db.from("attachments").select("id,uploaded_by,file_name,storage_path,external_url,file_type,description,created_at,team_id,contribution_id").eq("uploaded_by", studentId).order("created_at", { ascending: false }).limit(1000),
        db.from("team_members").select("team_id").eq("user_id", studentId),
        db.from("assignment_teams").select("assignment_id,team_id"),
        db.from("submission_classifications").select("source_type,source_id,assignment_id,team_id"),
      ]);

      if (!active) return;
      if (supervisorResult.error || supervisorResult.data?.app_role !== "supervisor") {
        window.location.replace("/dashboard");
        return;
      }
      if (studentResult.error || !studentResult.data || studentResult.data.app_role !== "student") {
        setError("لم يتم العثور على حساب الطالب.");
        setLoading(false);
        return;
      }

      const queryErrors = [
        teamsResult.error, assignmentsResult.error, contributionsResult.error,
        submissionsResult.error, worksResult.error, filesResult.error, teamMembersResult.error, assignmentTeamsResult.error, classificationsResult.error,
      ].filter(Boolean);
      if (queryErrors.length) {
        setError("تعذر تحميل بعض التسليمات. حدّثي الصفحة وحاولي مرة أخرى.");
        setLoading(false);
        return;
      }

      const contributions = contributionsResult.data || [];
      const contributionMap = new Map(contributions.map(x => [x.id, x]));
      let allFiles = filesResult.data || [];

      // Include files attached to this student's written contributions, even if another team member uploaded them.
      const contributionIds = contributions.map(x => x.id);
      if (contributionIds.length) {
        const linked = await db.from("attachments")
          .select("id,uploaded_by,file_name,storage_path,external_url,file_type,description,created_at,team_id,contribution_id")
          .in("contribution_id", contributionIds)
          .order("created_at", { ascending: false })
          .limit(1000);
        if (linked.error) {
          setError("تعذر تحميل الملفات المرتبطة بمشاركات الطالب.");
          setLoading(false);
          return;
        }
        const byId = new Map(allFiles.map(x => [x.id, x]));
        for (const file of linked.data || []) byId.set(file.id, file);
        allFiles = [...byId.values()];
      }

      const classifications = classificationsResult.data || [];
      const classMap = new Map(classifications.map(x => [x.source_type + ":" + x.source_id, x]));
      const built: Item[] = [];

      for (const file of allFiles as Attachment[]) {
        const classification = classMap.get("file:" + file.id);
        const parent = file.contribution_id ? contributionMap.get(file.contribution_id) : undefined;
        built.push({
          key: "file:" + file.id, sourceType: "file", sourceId: file.id,
          title: file.file_name || "ملف بدون اسم", createdAt: file.created_at,
          assignmentId: classification?.assignment_id ?? parent?.assignment_id ?? null,
          teamId: classification?.team_id ?? file.team_id ?? parent?.team_id ?? null,
          body: file.description || null, category: null,
          storagePath: file.storage_path, externalUrl: file.external_url, fileType: file.file_type,
        });
      }

      for (const contribution of contributions) {
        const classification = classMap.get("contribution:" + contribution.id);
        built.push({
          key: "contribution:" + contribution.id, sourceType: "contribution", sourceId: contribution.id,
          title: contribution.title || "مشاركة مكتوبة", createdAt: contribution.created_at,
          assignmentId: classification?.assignment_id ?? contribution.assignment_id ?? null,
          teamId: classification?.team_id ?? contribution.team_id ?? null,
          body: contribution.content || null, category: null,
          storagePath: null, externalUrl: null, fileType: null,
        });
      }

      for (const submission of submissionsResult.data || []) {
        const classification = classMap.get("submission:" + submission.id);
        built.push({
          key: "submission:" + submission.id, sourceType: "submission", sourceId: submission.id,
          title: "تسليم مكتوب", createdAt: submission.submitted_at || submission.created_at,
          assignmentId: classification?.assignment_id ?? submission.assignment_id ?? null,
          teamId: classification?.team_id ?? submission.team_id ?? null,
          body: submission.content || null, category: null,
          storagePath: null, externalUrl: null, fileType: null,
        });
      }

      for (const work of worksResult.data || []) {
        const classification = classMap.get("work:" + work.id);
        built.push({
          key: "work:" + work.id, sourceType: "work", sourceId: work.id,
          title: work.title || ("تسليم نصي · " + (work.category || "عام")), createdAt: work.created_at,
          assignmentId: classification?.assignment_id ?? null,
          teamId: classification?.team_id ?? work.team_id ?? null,
          body: work.body || null, category: work.category || null,
          storagePath: null, externalUrl: null, fileType: null,
        });
      }

      const assignmentRows = (assignmentsResult.data || []) as Assignment[];
      const validAssignmentIds = new Set(assignmentRows.map(x => x.id));
      const normalized = built.map(item => ({
        ...item,
        assignmentId: item.assignmentId && validAssignmentIds.has(item.assignmentId) ? item.assignmentId : null,
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setStudent(studentResult.data as Profile);
      setTeams((teamsResult.data || []) as Team[]);
      setStudentTeamIds((teamMembersResult.data || []).map(x => x.team_id));
      setAssignmentTeams((assignmentTeamsResult.data || []) as AssignmentTeam[]);
      setAssignments(assignmentRows);
      setItems(normalized);
      setLoading(false);
    }

    void load().catch(() => {
      if (active) { setError("حدث خطأ أثناء تحميل ملفات الطالب."); setLoading(false); }
    });
    return () => { active = false; };
  }, [studentId]);

  const grouped = useMemo(() => {
    const assignedIds = new Set(assignmentTeams.filter(link => studentTeamIds.includes(link.team_id)).map(link => link.assignment_id));
    const groups = assignments
      .filter(assignment => assignedIds.has(assignment.id) || items.some(item => item.assignmentId === assignment.id))
      .map(assignment => ({
        assignment,
        items: items.filter(item => item.assignmentId === assignment.id),
      }))
      .sort((a, b) => a.assignment.id - b.assignment.id);
    const unassigned = items.filter(item => !item.assignmentId);
    return { groups, unassigned };
  }, [assignments, assignmentTeams, studentTeamIds, items]);

  const selectedItems = selectedAssignment === "unassigned"
    ? grouped.unassigned
    : grouped.groups.find(group => group.assignment.id === selectedAssignment)?.items || [];

  async function openFile(item: Item) {
    const db = getSupabase();
    if (!db) return;
    setOpeningFile(item.key);
    setError("");
    try {
      let url = item.externalUrl || "";
      if (item.storagePath) {
        const result = await db.storage.from("studio-files").createSignedUrl(item.storagePath, 300);
        if (result.error || !result.data?.signedUrl) {
          setError("تعذر فتح الملف. تأكدي من صلاحية الملف ثم حاولي مرة أخرى.");
          return;
        }
        url = result.data.signedUrl;
      }
      if (!url) {
        setError("لا يوجد رابط صالح لهذا الملف.");
        return;
      }
      setPreview({ title: item.title, url, mime: fileMime(item) });
    } catch {
      setError("حدث خطأ أثناء فتح الملف.");
    } finally {
      setOpeningFile(null);
    }
  }

  const page: CSSProperties = {
    maxWidth: 980, margin: "0 auto", padding: "24px 14px 110px",
    color: "#4b3554", direction: "rtl",
  };

  return (
    <main style={page}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, color: "#aa8a4e", fontWeight: 850, letterSpacing: 2 }}>PLATEAU CREW HUB</p>
          <h1 style={{ margin: "7px 0 3px", fontSize: 26 }}>ملفات الطالب وتسليماته</h1>
          <p style={{ margin: 0, color: "#806f87" }}>اختاري التكليف لعرض كل الملفات والتسليمات المرتبطة به</p>
        </div>
        <a href="/dashboard#assignments" style={{ color: "#694b79", fontWeight: 800, textDecoration: "none" }}>← العودة للطلاب</a>
      </header>

      {loading ? <section style={{ ...panel, padding: 22 }}>جارٍ تحميل ملفات الطالب...</section> : error && !student ? (
        <section style={{ ...panel, padding: 22, color: "#a13d48" }}>{error}</section>
      ) : student && <>
        <section style={{ ...panel, padding: 18, marginBottom: 18, background: "linear-gradient(135deg,#fff 0%,#f6eff9 100%)", borderColor: "#d8c6e2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 99, background: "#eee4f4", color: "#6b4b7b", fontSize: 12, fontWeight: 800 }}>ملف الطالب</span>
              <h2 style={{ margin: "9px 0 4px", fontSize: 23 }}>{student.full_name}</h2>
              <p style={{ margin: 0, color: "#786982" }}>
                {items.length} تسليم · {grouped.groups.length} تكليف مخصص لفرق الطالب
              </p>
              <p style={{ margin: "6px 0 0", color: "#88788e", fontSize: 13 }}>{teams.filter(t => studentTeamIds.includes(t.id)).map(t => t.name).join(" · ") || "لم يتم ربط الطالب بفريق بعد"}</p>
            </div>
            <div style={{ color: "#8b7b91", fontSize: 13 }}>
              {student.approval_status === "approved" ? "✓ حساب معتمد" : "حالة الحساب: " + student.approval_status}
            </div>
          </div>
        </section>

        {error && <p role="status" style={{ color: "#a13d48", lineHeight: 1.7 }}>{error}</p>}

        {items.length === 0 ? (
          <section style={{ ...panel, padding: 22, textAlign: "center" }}>
            <strong>لا توجد ملفات أو تسليمات مسجلة لهذا الطالب حتى الآن.</strong>
          </section>
        ) : <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "18px 0 12px" }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>اختاري التكليف</h2>
            <span style={{ color: "#87768e", fontSize: 13 }}>اضغطي على أي بطاقة لعرض محتواها</span>
          </div>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {grouped.groups.map(group => {
              const active = selectedAssignment === group.assignment.id;
              const latest = group.items[0]?.createdAt;
              return (
                <button key={group.assignment.id} type="button" onClick={() => { setSelectedAssignment(active ? null : group.assignment.id); setExpandedItem(null); }}
                  aria-pressed={active}
                  style={{ ...panel, padding: 16, textAlign: "right", cursor: "pointer", border: active ? "2px solid #c6a15c" : "1px solid #dfd2e6", background: active ? "#f4edf8" : "#fff", color: "#4b3554" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong style={{ fontSize: 16, lineHeight: 1.6 }}>{group.assignment.title}</strong>
                    <span style={{ color: "#98783f", fontSize: 22 }}>›</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
                    <span style={{ background: "#eee5f3", color: "#654b73", borderRadius: 99, padding: "4px 9px", fontSize: 12, fontWeight: 800 }}>{group.items.length} تسليم</span>
                    {latest ? <small style={{ color: "#88788e" }}>آخر تسليم: {dateLabel(latest)}</small> : <small style={{ color: "#88788e" }}>لم يسلّم بعد</small>}
                  </div>
                </button>
              );
            })}
            {grouped.unassigned.length > 0 && (
              <button type="button" onClick={() => { setSelectedAssignment(selectedAssignment === "unassigned" ? null : "unassigned"); setExpandedItem(null); }}
                aria-pressed={selectedAssignment === "unassigned"}
                style={{ ...panel, padding: 16, textAlign: "right", cursor: "pointer", border: selectedAssignment === "unassigned" ? "2px solid #c6a15c" : "1px solid #dfd2e6", background: selectedAssignment === "unassigned" ? "#f4edf8" : "#fff", color: "#4b3554" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <strong style={{ fontSize: 16 }}>تسليمات غير مرتبطة بتكليف</strong><span style={{ color: "#98783f", fontSize: 22 }}>›</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ background: "#f7efdf", color: "#80632f", borderRadius: 99, padding: "4px 9px", fontSize: 12, fontWeight: 800 }}>{grouped.unassigned.length} تسليم</span>
                </div>
              </button>
            )}
          </section>

          {selectedAssignment !== null && (
            <section style={{ marginTop: 18, ...panel, padding: 16, borderColor: "#d8c7e2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {selectedAssignment === "unassigned" ? "تسليمات غير مرتبطة بتكليف" : assignments.find(x => x.id === selectedAssignment)?.title}
                </h2>
                <button type="button" style={mutedButton} onClick={() => { setSelectedAssignment(null); setExpandedItem(null); }}>إغلاق التكليف</button>
              </div>

              {selectedItems.length === 0 ? <p style={{ color: "#88788e", margin: 0 }}>لا توجد ملفات أو تسليمات مرتبطة بهذا التكليف حتى الآن.</p> : <div style={{ display: "grid", gap: 10 }}>
                {selectedItems.map(item => (
                  <article key={item.key} style={{ border: "1px solid #e6dcea", borderRadius: 14, padding: 13, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                        <strong style={{ display: "block", overflowWrap: "anywhere", lineHeight: 1.6 }}>{item.title}</strong>
                        <small style={{ color: "#897990" }}>
                          {kindLabel(item)} · {teams.find(t => t.id === item.teamId)?.name || "بدون فريق"} · {dateLabel(item.createdAt)}
                        </small>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {item.sourceType === "file" ? (
                          <button type="button" style={goldButton} disabled={openingFile === item.key} onClick={() => void openFile(item)}>
                            {openingFile === item.key ? "جارٍ الفتح..." : "فتح الملف"}
                          </button>
                        ) : item.body ? (
                          <button type="button" style={mutedButton} onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}>
                            {expandedItem === item.key ? "إخفاء النص" : "عرض النص"}
                          </button>
                        ) : <span style={{ color: "#9a8da0", fontSize: 13 }}>لا يوجد محتوى نصي</span>}
                      </div>
                    </div>
                    {item.body && expandedItem === item.key && (
                      <div style={{ marginTop: 12, borderTop: "1px solid #eee5f2", paddingTop: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.9, color: "#55435e" }}>
                        {item.category && <strong style={{ display: "block", marginBottom: 6 }}>التصنيف: {item.category}</strong>}
                        {item.body}
                      </div>
                    )}
                  </article>
                ))}
              </div>}
            </section>
          )}
        </>}
      </>}

      {preview && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(35,22,43,.72)", display: "grid", placeItems: "center", padding: 12 }}>
          <section role="dialog" aria-modal="true" aria-label={preview.title}
            style={{ width: "min(920px,100%)", maxHeight: "92vh", overflow: "auto", background: "#fff", borderRadius: 18, padding: 14, color: "#4b3554" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <strong style={{ overflowWrap: "anywhere" }}>{preview.title}</strong>
              <button type="button" style={mutedButton} onClick={() => setPreview(null)}>إغلاق ×</button>
            </header>
            {preview.mime.startsWith("image/") ? (
              <img src={preview.url} alt={preview.title} style={{ display: "block", maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", margin: "0 auto" }} />
            ) : preview.mime.startsWith("video/") ? (
              <video src={preview.url} controls playsInline style={{ width: "100%", maxHeight: "72vh" }} />
            ) : preview.mime.startsWith("audio/") ? (
              <audio src={preview.url} controls style={{ width: "100%" }} />
            ) : preview.mime.includes("pdf") ? (
              <iframe src={preview.url} title={preview.title} style={{ width: "100%", height: "72vh", border: 0 }} />
            ) : (
              <p>هذا النوع من الملفات لا يدعم المعاينة هنا. <a href={preview.url} target="_blank" rel="noopener noreferrer" style={{ color: "#684b78", fontWeight: 800 }}>افتحيه في تبويب جديد</a></p>
            )}
            <p style={{ textAlign: "left", marginBottom: 0 }}><a href={preview.url} target="_blank" rel="noopener noreferrer" style={{ color: "#684b78", fontWeight: 800 }}>فتح الملف في تبويب جديد ↗</a></p>
          </section>
        </div>
      )}
    </main>
  );
}
