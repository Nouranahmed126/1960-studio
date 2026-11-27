"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import "./student-review.css";
import { getAuthUser, getSupabase } from "../../../../lib/supabase-browser";

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
  if (item.sourceType === "work") return item.category === "روابط ومصادر" ? "↗ رابط" : "✍️ تسليم نصي";
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
  const [selectedAssignment, setSelectedAssignment] = useState<number | "unassigned" | "all" | null>(null);
  const [textItem, setTextItem] = useState<Item | null>(null);
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

      const { data: { user }, error: authError } = await getAuthUser();
      if (authError || !user) {
        window.location.replace("/login?next="+encodeURIComponent("/dashboard/student/"+studentId));
        return;
      }

      const supervisorResult = await db.from("profiles").select("app_role,approval_status").eq("id", user.id).single();
      if (!active) return;
      if (supervisorResult.error || supervisorResult.data?.app_role !== "supervisor" || supervisorResult.data?.approval_status !== "approved" || user.app_metadata?.must_change_password === true) {
        window.location.replace(user.app_metadata?.must_change_password === true ? "/change-password" : "/dashboard");
        return;
      }
      const [studentResult, teamsResult, assignmentsResult,
        contributionsResult, submissionsResult, worksResult, filesResult, teamMembersResult, assignmentTeamsResult, classificationsResult] = await Promise.all([
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
      const allFiles = filesResult.data || [];

      // Only files actually uploaded by this student belong in this review.
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
      .filter(assignment => (!assignment.archived_at && assignedIds.has(assignment.id)) || items.some(item => item.assignmentId === assignment.id))
      .map(assignment => ({
        assignment,
        items: items.filter(item => item.assignmentId === assignment.id),
      }))
      .sort((a, b) => a.assignment.id - b.assignment.id);
    const unassigned = items.filter(item => !item.assignmentId);
    return { groups, unassigned };
  }, [assignments, assignmentTeams, studentTeamIds, items]);

  const selectedItems = selectedAssignment === "all" ? items : selectedAssignment === "unassigned"
    ? grouped.unassigned
    : grouped.groups.find(group => group.assignment.id === selectedAssignment)?.items || [];

  async function openFile(item: Item) {
    const db = getSupabase();
    if (!db) return;
    setOpeningFile(item.key);
    setError("");
    try {
      let url = item.externalUrl || (item.category === "روابط ومصادر" ? item.body || "" : "");
      if (item.storagePath) {
        const result = await db.storage.from("studio-files").createSignedUrl(item.storagePath, 300);
        if (result.error || !result.data?.signedUrl) {
          setError("تعذر فتح الملف. تأكدي من صلاحية الملف ثم حاولي مرة أخرى.");
          return;
        }
        url = result.data.signedUrl;
      }
      if (!/^https?:\/\//i.test(url)) {
        setError("لا يوجد رابط صالح لهذا الملف.");
        return;
      }
      setPreview({ title: item.title, url, mime: item.storagePath ? fileMime(item) : "text/uri-list" });
    } catch {
      setError("حدث خطأ أثناء فتح الملف.");
    } finally {
      setOpeningFile(null);
    }
  }

  const selectedTitle = selectedAssignment === "all" ? "كل ملفات الطالب" : selectedAssignment === "unassigned" ? "ملفات غير مرتبطة بتكليف" : assignments.find(x=>x.id===selectedAssignment)?.title || "";
  function chooseAssignment(id: number | "all" | "unassigned" | null) {
    setSelectedAssignment(id); setTextItem(null); setPreview(null); setError("");
    window.scrollTo({top:0,behavior:"auto"});
  }
  useEffect(()=>{
    if (!preview && !textItem) return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setPreview(null);setTextItem(null);}};
    window.addEventListener("keydown",escape);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape);};
  },[preview,textItem]);

  return <main className="student-review-clean" dir="rtl">
    <header className="sr-head" dir="ltr">
      {selectedAssignment===null?<a href="/dashboard" className="sr-back" aria-label="العودة للطلاب">←</a>:<button type="button" className="sr-back" onClick={()=>chooseAssignment(null)} aria-label="العودة للتكليفات">←</button>}
      <h1>{selectedAssignment===null?"Student Files":"Assignment Files"}</h1>
    </header>
    {loading?<p className="sr-status" role="status">جارٍ تحميل الملفات…</p>:!student?<p className="sr-error" role="alert">{error||"تعذر تحميل الطالب."}</p>:<>
      <div className="sr-student"><strong>{student.full_name}</strong><small>{items.length} ملف / تسليم</small></div>
      {error&&<p className="sr-error" role="alert">{error}</p>}
      {selectedAssignment===null?<section className="sr-list" aria-label="تكليفات الطالب">
        <button type="button" className="sr-row sr-all" onClick={()=>chooseAssignment("all")}><strong>كل ملفات الطالب</strong><span className="sr-count">{items.length}</span><span aria-hidden="true">‹</span></button>
        {grouped.groups.map(group=><button type="button" className="sr-row" key={group.assignment.id} onClick={()=>chooseAssignment(group.assignment.id)}><strong>{group.assignment.title}{group.assignment.archived_at&&<small> · مؤرشف</small>}</strong><span className="sr-count">{group.items.length}</span><span aria-hidden="true">‹</span></button>)}
        {grouped.unassigned.length>0&&<button type="button" className="sr-row" onClick={()=>chooseAssignment("unassigned")}><strong>ملفات غير مرتبطة بتكليف</strong><span className="sr-count">{grouped.unassigned.length}</span><span aria-hidden="true">‹</span></button>}
      </section>:<section className="sr-list" aria-label="ملفات التكليف">
        <h2 className="sr-section-title">{selectedTitle}</h2>
        {selectedItems.length===0?<p className="sr-status">لا توجد ملفات مرتبطة بهذا التكليف.</p>:selectedItems.map(item=>{
          const canOpen=Boolean(item.storagePath||item.externalUrl||item.body);
          return <button type="button" className="sr-row sr-file" key={item.key} disabled={!canOpen||openingFile!==null} onClick={()=>{if(item.storagePath||item.externalUrl||item.category==="روابط ومصادر"){void openFile(item);}else setTextItem(item);}}>
            <span className="sr-file-name"><strong>{item.title}</strong><small>{kindLabel(item)}</small></span>
            <span className="sr-open">{openingFile===item.key?"جارٍ الفتح…":"فتح"}</span><span aria-hidden="true">‹</span>
          </button>;
        })}
      </section>}
    </>}
    {(preview||textItem)&&<div className="sr-overlay" onMouseDown={event=>{if(event.target===event.currentTarget){setPreview(null);setTextItem(null);}}}>
      <section role="dialog" aria-modal="true" aria-label={preview?.title||textItem?.title} className="sr-dialog">
        <header><strong>{preview?.title||textItem?.title}</strong><button type="button" className="sr-close" onClick={()=>{setPreview(null);setTextItem(null);}}>إغلاق ×</button></header>
        {textItem?<p className="sr-text">{textItem.body}</p>:preview&&<>
          {preview.mime.startsWith("image/")?<img src={preview.url} alt={preview.title}/>:preview.mime.startsWith("video/")?<video src={preview.url} controls playsInline/>:preview.mime.startsWith("audio/")?<audio src={preview.url} controls/>:preview.mime.includes("pdf")?<iframe src={preview.url} title={preview.title}/>:null}
          <a className="sr-external" href={preview.url} target="_blank" rel="noopener noreferrer">{preview.mime==="text/uri-list"?"فتح الرابط ↗":"فتح في تبويب جديد ↗"}</a>
        </>}
      </section>
    </div>}
  </main>;
}
