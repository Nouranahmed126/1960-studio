"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getSupabase } from "../../../lib/supabase-browser";

type StudentAccount = {
  userId: string;
  fullName: string;
  username: string;
  approvalStatus: string;
};

type Credentials = {
  fullName: string;
  username: string;
  temporaryPassword: string;
};

const panel: CSSProperties = {
  background: "rgba(255,255,255,.96)",
  border: "1px solid #dfd1e8",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 12px 30px rgba(73,53,83,.07)",
};

const actionButton: CSSProperties = {
  border: "1px solid #c8a85f",
  borderRadius: 12,
  padding: "10px 14px",
  background: "linear-gradient(135deg,#ead8a7,#c6a96f)",
  color: "#40334a",
  fontWeight: 800,
  cursor: "pointer",
};

export default function StudentAccountsPage() {
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAccounts() {
      const db = getSupabase();
      if (!db) {
        if (active) { setMessage("تعذر الاتصال بقاعدة البيانات."); setLoading(false); }
        return;
      }

      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) {
        window.location.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("app_role")
        .eq("id", user.id)
        .single();

      if (!active) return;
      if (profileError || profile?.app_role !== "supervisor") {
        setMessage("هذه الصفحة متاحة للمشرفة فقط.");
        setLoading(false);
        return;
      }

      const { data, error } = await db.functions.invoke("supervisor-reset-student-password", {
        body: { action: "list_students" },
      });

      if (!active) return;
      if (error) {
        setMessage(data?.message || "تعذر تحميل حسابات الطلاب.");
        setLoading(false);
        return;
      }

      setAccounts((data?.students || []) as StudentAccount[]);
      setLoading(false);
    }

    void loadAccounts().catch(() => {
      if (active) { setMessage("حدث خطأ أثناء تحميل الحسابات."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return accounts;
    return accounts.filter(account =>
      account.fullName.toLocaleLowerCase().includes(query) ||
      account.username.toLocaleLowerCase().includes(query)
    );
  }, [accounts, search]);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("تعذر النسخ تلقائيًا. حددي النص وانسخيه يدويًا.");
    }
  }

  async function resetPassword(account: StudentAccount) {
    if (!window.confirm("إعادة تعيين كلمة مرور " + account.fullName + "؟ سيتم إنشاء كلمة مؤقتة جديدة.")) return;
    const db = getSupabase();
    if (!db) return;

    setBusyId(account.userId);
    setMessage("");
    setCredentials(null);

    const { data, error } = await db.functions.invoke("supervisor-reset-student-password", {
      body: { action: "reset_password", userId: account.userId },
    });

    setBusyId(null);
    if (error || !data?.temporaryPassword) {
      setMessage(data?.message || error?.message || "تعذر إعادة تعيين كلمة المرور.");
      return;
    }

    setCredentials({
      fullName: account.fullName,
      username: account.username,
      temporaryPassword: data.temporaryPassword,
    });
    setMessage("تم إنشاء كلمة المرور المؤقتة بنجاح. انسخي البيانات وأرسليها للطالب بشكل خاص.");
  }

  const pageStyle: CSSProperties = {
    maxWidth: 920,
    margin: "0 auto",
    padding: "28px 16px 120px",
    color: "#493650",
    direction: "rtl",
  };

  return (
    <main style={pageStyle}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <p style={{ color: "#9a7b43", letterSpacing: 2, fontWeight: 800, margin: 0 }}>PLATEAU CREW HUB</p>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>إدارة حسابات الطلاب</h1>
          <p style={{ color: "#76677d", margin: 0 }}>استعادة اسم المستخدم وإصدار كلمة مرور مؤقتة للحسابات المعتمدة.</p>
        </div>
        <a href="/dashboard" style={{ color: "#684b78", fontWeight: 800, textDecoration: "none" }}>← العودة للوحة المشرفة</a>
      </header>

      <section style={{ ...panel, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <strong>عدد الحسابات المعتمدة: {accounts.length}</strong>
          <span style={{ color: "#8a7b90" }}>لا يتم إنشاء حسابات جديدة أو حذف أي بيانات قديمة.</span>
        </div>
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="ابحثي باسم الطالب أو اسم المستخدم..."
          aria-label="البحث عن طالب"
          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d5c5df", borderRadius: 13, padding: "14px 16px", fontSize: 16, color: "#493650", background: "#fff" }}
        />
      </section>

      {credentials && (
        <section style={{ ...panel, border: "2px solid #c5a45e", marginBottom: 18 }} aria-live="polite">
          <h2 style={{ marginTop: 0 }}>بيانات الدخول المؤقتة · {credentials.fullName}</h2>
          <p style={{ color: "#6d5d75", lineHeight: 1.8, marginBottom: 8 }}>انسخي البيانات وأرسليها للطالب بشكل خاص. كلمة المرور المؤقتة لن تظهر مرة أخرى بعد مغادرة هذه الصفحة.</p>
          <div style={{ background: "#f8f3fb", borderRadius: 12, padding: 13, marginBottom: 10 }}>
            <div><strong>اسم المستخدم:</strong> <bdi>{credentials.username}</bdi></div>
            <div style={{ marginTop: 8 }}><strong>كلمة المرور المؤقتة:</strong> <code style={{ fontSize: 17, userSelect: "all" }}><bdi>{credentials.temporaryPassword}</bdi></code></div>
          </div>
          <button type="button" style={actionButton} onClick={() => void copyText("اسم المستخدم: " + credentials.username + "\nكلمة المرور المؤقتة: " + credentials.temporaryPassword)}>
            {copied ? "✓ تم النسخ" : "نسخ بيانات الدخول"}
          </button>
        </section>
      )}

      {message && <p role="status" aria-live="polite" style={{ color: message.includes("تعذر") || message.includes("خطأ") ? "#a33d46" : "#5f4770", lineHeight: 1.8 }}>{message}</p>}
      {loading ? <section style={panel}>جارٍ تحميل حسابات الطلاب...</section> : filtered.length === 0 ? (
        <section style={panel}>لا توجد نتائج مطابقة للبحث.</section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {filtered.map(account => (
            <article key={account.userId} style={{ ...panel, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 180, flex: "1 1 230px" }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 19 }}>{account.fullName}</h2>
                <div style={{ color: "#76677d" }}>اسم المستخدم: <strong style={{ color: "#493650" }}><bdi>{account.username || "غير مسجل"}</bdi></strong></div>
                <span style={{ display: "inline-block", marginTop: 8, borderRadius: 99, padding: "4px 10px", background: "#f0e8f5", color: "#654a72", fontSize: 12, fontWeight: 800 }}>حساب معتمد</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={{ ...actionButton, background: "#fff", borderColor: "#d5c5df" }} disabled={!account.username} onClick={() => void copyText(account.username)}>نسخ اسم المستخدم</button>
                <button type="button" style={actionButton} disabled={busyId !== null} onClick={() => void resetPassword(account)}>
                  {busyId === account.userId ? "جارٍ الإنشاء..." : "إعادة تعيين كلمة المرور"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
