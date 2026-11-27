"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase-browser";
import MiniCinemaIcon from "../mini-cinema-icon";
import Link from "next/link";

type Artifact = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  image_path: string | null;
};

export default function Museum() {
  const [items, setItems] = useState<Artifact[]>([]);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const db = getSupabase();
      if (!db) {
        setError("تعذر الاتصال بالأرشيف");
        setLoading(false);
        return;
      }

      const { data: { user } } = await db.auth.getUser();
      if (!active) return;
      if (!user) {
        setError("سجّلي دخولك لعرض مقتنيات الفريق");
        setLoading(false);
        return;
      }

      const result = await db
        .from("studio_props")
        .select("id,title,description,category,image_path")
        .order("created_at", { ascending: false })
        .limit(150);

      if (!active) return;

      if (result.error) {
        setError("تعذر تحميل المقتنيات: " + result.error.message);
      } else {
        const cassette = await db
          .from("project_gallery")
          .select("id,title,description,storage_path")
          .eq("id", 1)
          .maybeSingle();

        const moved: Artifact[] = cassette.data
          ? [{
              id: -1,
              title: "شرائط الكاسيت القديمة",
              description: cassette.data.description,
              category: "أجهزة قديمة",
              image_path: null,
            }]
          : [];

        const archiveItems = [
          ...(result.data || []).filter(item => item.id !== 2),
          ...moved,
        ];

        const photos: Record<number, string> = {};
        for (const item of result.data || []) {
          if (item.image_path) {
            photos[item.id] = db.storage
              .from("crew-photos")
              .getPublicUrl(item.image_path).data.publicUrl;
          }
        }

        if (cassette.data?.storage_path) {
          const signed = await db.storage
            .from("studio-gallery")
            .createSignedUrl(cassette.data.storage_path, 3600);
          if (signed.data?.signedUrl) photos[-1] = signed.data.signedUrl;
        }

        if (!active) return;
        setItems(archiveItems.filter(item => Boolean(photos[item.id])));
        setUrls(photos);
      }

      if (active) setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, []);

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
