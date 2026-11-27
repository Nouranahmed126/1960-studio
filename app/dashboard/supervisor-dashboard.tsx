"use client";

import { useMemo, useState } from "react";
import SubmissionRadar from "../submission-radar";
import SupervisorArchive from "../supervisor-archive";

type Profile = { id: string; full_name: string; approval_status: string; app_role: string };
type Student = { id: string; full_name: string; approval_status: string; app_role: string };
type Team = { id: number; name: string };
type Assignment = { id: number; title: string; created_at: string; archived_at: string | null; due_at: string | null };
type Request = { user_id: string; team_id: number; status: string };
type FileSubmission = { id: number; uploaded_by: string; file_name: string; storage_path: string | null; external_url: string | null; created_at: string; team_id: number | null; contribution_id: number | null };
type WrittenSubmission = { source_type: "contribution" | "submission" | "work"; source_id: number; user_id: string; title: string; content: string; created_at: string; assignment_id: number | null; team_id: number | null };
type Classification = { source_type: string; source_id: number; assignment_id: number | null; team_id: number | null; is_self_initiated: boolean };
type FileReview = { attachment_id: number; stars: number; received: boolean; opened_at: string | null };
type WrittenReview = { source_type: string; source_id: number; stars: number; received: boolean; opened_at: string | null };
type StudentEntry = { key: string; kind: "file" | "written"; id: number; title: string; created_at: string; file?: FileSubmission; written?: WrittenSubmission };

type Props = {
  profile: Profile;
  students: Student[];
  teams: Team[];
  assignments: Assignment[];
  files: FileSubmission[];
  writtenItems: WrittenSubmission[];
  classifications: Classification[];
  requests: Request[];
  fileReviews: FileReview[];
  writtenReviews: WrittenReview[];
  busy: boolean;
  message: string;
  onLogout: () => void;
  onApprove: (id: string) => Promise<void>;
  onOpenFile: (file: FileSubmission) => Promise<void>;
  onMarkFileReceived: (id: number, received: boolean) => Promise<void>;
  onUpdateWrittenReview: (sourceType: "contribution" | "submission" | "work", sourceId: number, patch: { stars?: number; received?: boolean; opened_at?: string }) => Promise<void>;
  onSaved: () => Promise<void>;
  onClearMessage: () => void;
};

function submissionKind(entry: StudentEntry) {
  if (entry.kind === "written") return "نص مكتوب";
  const name = entry.title.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic|svg)$/i.test(name)) return "صورة";
  if (/\.(mp4|mov|m4v|webm|avi)$/i.test(name)) return "فيديو";
  if (/\.(mp3|m4a|wav|ogg|aac)$/i.test(name)) return "تسجيل صوتي";
  if (entry.file?.external_url && !entry.file.storage_path) return "رابط";
  return "ملف";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "تاريخ غير محدد" : date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
}

export default function SupervisorDashboard(props: Props) {
  const {
    profile, students, teams, assignments, files, writtenItems, classifications,
    requests, fileReviews, writtenReviews, busy, message, onLogout, onApprove,
    onOpenFile, onMarkFileReceived, onUpdateWrittenReview, onSaved, onClearMessage
  } = props;

  const [activeTab, setActiveTab] = useState<"students" | "archive" | "assignments">("students");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const approvedStudents = useMemo(
    () => students.filter(student => student.approval_status === "approved"),
    [students]
  );
  const pendingStudents = useMemo(
    () => students.filter(student => student.approval_status === "pending" && requests.some(request => request.user_id === student.id && request.status === "pending")),
    [students, requests]
  );
  const activeAssignments = useMemo(
    () => assignments.filter(assignment => !assignment.archived_at).sort((a, b) => b.id - a.id),
    [assignments]
  );

  const entriesByStudent = useMemo(() => {
    const result: Record<string, StudentEntry[]> = {};
    approvedStudents.forEach(student => { result[student.id] = []; });
    files.forEach(file => {
      if (!result[file.uploaded_by]) return;
      result[file.uploaded_by].push({
        key: "file:" + file.id, kind: "file", id: file.id,
        title: file.file_name, created_at: file.created_at, file
      });
    });
    writtenItems.forEach(item => {
      if (!result[item.user_id]) return;
      result[item.user_id].push({
        key: item.source_type + ":" + item.source_id, kind: "written", id: item.source_id,
        title: item.title, created_at: item.created_at, written: item
      });
    });
    Object.values(result).forEach(entries => entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    return result;
  }, [approvedStudents, files, writtenItems]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase("ar");
    return approvedStudents.filter(student => !query || student.full_name.toLocaleLowerCase("ar").includes(query));
  }, [approvedStudents, studentSearch]);

  const selectedStudent = approvedStudents.find(student => student.id === selectedStudentId) ?? null;
  const selectedEntries = selectedStudent ? entriesByStudent[selectedStudent.id] ?? [] : [];

  const archiveRows = useMemo(() => [
    ...files.map(file => ({
      source_type: "file" as const, source_id: file.id, title: file.file_name,
      student_id: file.uploaded_by, team_id: file.team_id, assignment_id: null
    })),
    ...writtenItems.map(item => {
      const classification = classifications.find(row => row.source_type === item.source_type && row.source_id === item.source_id);
      return {
        source_type: item.source_type, source_id: item.source_id, title: item.title,
        student_id: item.user_id, team_id: classification?.team_id ?? item.team_id,
        assignment_id: classification?.assignment_id ?? item.assignment_id
      };
    })
  ], [files, writtenItems, classifications]);

  const totalSubmissions = files.length + writtenItems.length;

  return (
    <main className="supervisor-v2" dir="rtl">
      <SubmissionRadar compact hideWhenClear />
      <header className="sv-topbar">
        <div className="sv-greeting">
          <span className="sv-eyebrow">PLATEAU CREW HUB</span>
          <h1>أهلاً د/ {profile.full_name.replace(/^\s*(?:د\s*\/\s*)+/u, "").trim()}</h1>
        </div>
        <button type="button" className="sv-logout" onClick={onLogout}>تسجيل خروج</button>
      </header>

      {message && (
        <div className="sv-status" role="status">
          <span>{message}</span>
          <button type="button" onClick={onClearMessage} aria-label="إغلاق الإشعار">×</button>
        </div>
      )}

      <section className="sv-stats" aria-label="إحصائيات المشروع">
        <article><strong>{approvedStudents.length}</strong><span>طالب معتمد</span></article>
        <article><strong>{teams.length}</strong><span>فرق</span></article>
        <article><strong>{totalSubmissions}</strong><span>إجمالي التسليمات</span></article>
        <article><strong>{activeAssignments.length}</strong><span>تكليف نشط</span></article>
      </section>

      <nav className="sv-tabs" aria-label="أقسام لوحة المشرفة">
        <button type="button" aria-pressed={activeTab === "students"} onClick={() => setActiveTab("students")}>الطلاب <small>{approvedStudents.length}</small></button>
        <button type="button" aria-pressed={activeTab === "archive"} onClick={() => setActiveTab("archive")}>الأرشيف <small>{totalSubmissions}</small></button>
        <button type="button" aria-pressed={activeTab === "assignments"} onClick={() => setActiveTab("assignments")}>التكليفات <small>{activeAssignments.length}</small></button>
      </nav>

      {activeTab === "students" && (
        <section className="sv-tab-panel">
          <div className="sv-section-heading">
            <div><span className="sv-eyebrow">STUDENT WORKSPACE</span><h2>متابعة الطلاب</h2></div>
            <span className="sv-total-pill">{filteredStudents.length} طالب</span>
          </div>
          <label className="sv-search">
            <span aria-hidden="true">⌕</span>
            <input value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="ابحثي باسم الطالب..." aria-label="بحث باسم الطالب" />
          </label>

          <div className="sv-student-list">
            {filteredStudents.map(student => {
              const entries = entriesByStudent[student.id] ?? [];
              const latest = entries[0];
              return (
                <article className="sv-student-card" key={student.id}>
                  <div className="sv-student-main">
                    <div className="sv-student-heading">
                      <strong>{student.full_name}</strong>
                      <span className="sv-count">{entries.length} تسليم</span>
                    </div>
                    <p>{latest ? <>آخر تسليم: <b>{latest.title}</b> · {submissionKind(latest)}</> : "لا توجد تسليمات حتى الآن"}</p>
                    {latest && <time>{formatDate(latest.created_at)}</time>}
                  </div>
                  <button type="button" className="sv-review" onClick={() => setSelectedStudentId(student.id)}>مراجعة <span aria-hidden="true">←</span></button>
                </article>
              );
            })}
            {!filteredStudents.length && <p className="sv-empty">لا توجد أسماء مطابقة للبحث.</p>}
          </div>

          {pendingStudents.length > 0 && (
            <details className="sv-pending">
              <summary>طلبات اعتماد جديدة <span>{pendingStudents.length}</span></summary>
              <div className="sv-pending-list">
                {pendingStudents.map(student => {
                  const requestedTeams = requests.filter(request => request.user_id === student.id && request.status === "pending");
                  return (
                    <article key={student.id}>
                      <div><strong>{student.full_name}</strong><small>{requestedTeams.map(request => teams.find(team => team.id === request.team_id)?.name ?? "فريق").join(" · ") || "لم يحدد الفرق بعد"}</small></div>
                      <button type="button" disabled={busy || requestedTeams.length < 2 || requestedTeams.length > 3} onClick={() => void onApprove(student.id)}>اعتماد</button>
                    </article>
                  );
                })}
              </div>
            </details>
          )}
        </section>
      )}

      {activeTab === "archive" && (
        <section className="sv-tab-panel">
          <div className="sv-section-heading">
            <div><span className="sv-eyebrow">SUBMISSION ARCHIVE</span><h2>الأرشيف والتصنيف</h2></div>
            <span className="sv-total-pill">{totalSubmissions} عنصر</span>
          </div>
          <SupervisorArchive
            supervisorId={profile.id}
            teams={teams}
            students={students}
            assignments={assignments}
            onSaved={onSaved}
            rows={archiveRows}
          />
        </section>
      )}

      {activeTab === "assignments" && (
        <section className="sv-tab-panel">
          <div className="sv-section-heading">
            <div><span className="sv-eyebrow">ACTIVE TASKS</span><h2>التكليفات النشطة</h2></div>
            <a className="sv-create" href="/assignments/new">+ إنشاء تكليف جديد</a>
          </div>
          <div className="sv-task-list">
            {activeAssignments.map(assignment => (
              <article className="sv-task-card" key={assignment.id}>
                <div><strong>{assignment.title}</strong><small>{assignment.due_at ? "آخر موعد: " + formatDate(assignment.due_at) : "بدون موعد نهائي"}</small></div>
                <span>نشط</span>
              </article>
            ))}
            {!activeAssignments.length && <p className="sv-empty">لا توجد تكليفات نشطة حاليًا.</p>}
          </div>
        </section>
      )}

      {selectedStudent && (
        <div className="sv-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedStudentId(null); }}>
          <section className="sv-student-modal" role="dialog" aria-modal="true" aria-label={"تسليمات " + selectedStudent.full_name}>
            <header>
              <div><span className="sv-eyebrow">STUDENT SUBMISSIONS</span><h2>{selectedStudent.full_name}</h2><small>{selectedEntries.length} تسليم</small></div>
              <button type="button" onClick={() => setSelectedStudentId(null)} aria-label="إغلاق">×</button>
            </header>
            <div className="sv-modal-list">
              {selectedEntries.map(entry => {
                if (entry.kind === "file" && entry.file) {
                  const review = fileReviews.find(row => row.attachment_id === entry.id);
                  return (
                    <article className="sv-submission-item" key={entry.key}>
                      <div><strong>{entry.title}</strong><small>{submissionKind(entry)} · {formatDate(entry.created_at)}</small></div>
                      <div className="sv-item-actions">
                        <button type="button" onClick={() => void onOpenFile(entry.file!)}>فتح الملف</button>
                        <button type="button" className={review?.received ? "is-done" : ""} onClick={() => void onMarkFileReceived(entry.id, !review?.received)}>{review?.received ? "تمت المراجعة ✓" : "تأكيد المراجعة"}</button>
                      </div>
                    </article>
                  );
                }
                const written = entry.written!;
                const review = writtenReviews.find(row => row.source_type === written.source_type && row.source_id === written.source_id);
                return (
                  <article className="sv-submission-item sv-written-item" key={entry.key}>
                    <div><strong>{entry.title}</strong><small>نص مكتوب · {formatDate(entry.created_at)}</small></div>
                    <details><summary>عرض النص</summary><p>{written.content || "لا يوجد نص مرفق."}</p></details>
                    <button type="button" className={review?.received ? "is-done" : ""} onClick={() => void onUpdateWrittenReview(written.source_type, written.source_id, { received: !review?.received, opened_at: new Date().toISOString() })}>{review?.received ? "تمت المراجعة ✓" : "تأكيد المراجعة"}</button>
                  </article>
                );
              })}
              {!selectedEntries.length && <p className="sv-empty">لا توجد تسليمات مسجلة لهذا الطالب حتى الآن.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
