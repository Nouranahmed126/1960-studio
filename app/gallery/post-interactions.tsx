"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "../../lib/supabase-browser";

import { getVisitorToken } from "../../lib/plateau-visitor";

export type InteractionCounts = { likes: number; comments: number; liked: boolean };
type Comment = { id: string; own: boolean; visitor: boolean; author_name: string; body: string; created_at: string };
const commentPageSize = 20;
const dateFormat = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" });

export default function PostInteractions({ postId, viewerId, supervisor, counts, refreshVersion }: {
  postId: number;
  viewerId?: string;
  supervisor: boolean;
  counts: InteractionCounts;
  refreshVersion: number;
}) {
  const [reaction, setReaction] = useState<{ liked: boolean; likes: number }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState<number>();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [liking, setLiking] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [commentError, setCommentError] = useState("");
  useEffect(() => {
    setReaction(undefined);
    setCommentCount(undefined);
  }, [refreshVersion]);

  useEffect(() => {
    if (!open || refreshVersion === 0) return;
    const db = getSupabase();
    if (!db) return;
    let active = true;
    void db.rpc("plateau_public_comments", { target: postId, max_rows: Math.max(comments.length, commentPageSize) }).then(result => {
      if (active && !result.error) setComments(result.data ?? []);
    });
    return () => { active = false; };
  }, [refreshVersion, open, postId]);

  const { liked, likes } = reaction ?? counts;
  const total = commentCount ?? counts.comments;

  async function toggleLike() {
    const db = getSupabase();
    if (!db || liking) return;
    setLiking(true);
    setLikeError("");
    try {
      const action = !viewerId
        ? await db.rpc("plateau_visitor_like", { target: postId, visitor_token: getVisitorToken(), desired: !liked })
        : liked
        ? await db.from("plateau_likes").delete().eq("post_id", postId).eq("user_id", viewerId)
        : await db.from("plateau_likes").insert({ post_id: postId });
      if (action.error && action.error.code !== "23505") throw action.error;

      const summary = await db.rpc("plateau_public_counts", { post_ids: [postId], visitor_token: viewerId ? null : getVisitorToken() }).single<InteractionCounts>();
      const next = summary.data ?? { liked: !liked, likes: Math.max(0, likes + (liked ? -1 : 1)) };
      setReaction(next);
    } catch {
      setLikeError("تعذّر تحديث الإعجاب. جرّب تاني.");
    } finally {
      setLiking(false);
    }
  }

  async function fetchComments(limit: number) {
    const db = getSupabase();
    if (!db) return;
    const result = await db.rpc("plateau_public_comments", { target: postId, max_rows: limit });
    if (result.error) throw result.error;
    setComments(result.data ?? []);

  }

  async function updateComments(action: () => Promise<void>) {
    if (loadingComments) return;
    setLoadingComments(true);
    setCommentError("");
    try {
      await action();
    } catch {
      setCommentError("تعذّر إكمال العملية. جرّب تاني.");
    } finally {
      setLoadingComments(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const db = getSupabase();
    const body = draft.trim();
    if (!db || !body) return;
    await updateComments(async () => {
      const result = viewerId
        ? await db.from("plateau_comments").insert({ post_id: postId, body })
        : await db.rpc("plateau_visitor_comment", { target: postId, visitor_token: getVisitorToken(), message: body });
      if (result.error) throw result.error;
      setDraft("");
      await fetchComments(Math.max(comments.length, commentPageSize));
      setCommentCount(current => (current ?? counts.comments) + 1);
    });
  }

  async function removeComment(comment: Comment) {
    const db = getSupabase();
    if (!db) return;
    await updateComments(async () => {
      const result = comment.visitor
        ? await db.rpc("plateau_remove_visitor_comment", { target: postId, comment_id: comment.id })
        : await db.from("plateau_comments").delete().eq("post_id", postId).eq("id", comment.id).select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("Comment unavailable");
      setComments(current => current.filter(item => item.id !== comment.id));
      setCommentCount(current => Math.max(0, (current ?? counts.comments) - 1));
    });
  }

  return <div className="community-interactions">
    <div className="community-actions">
      <button type="button" aria-pressed={liked} disabled={liking} onClick={toggleLike}>
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span> إعجاب <b>{likes}</b>
      </button>
      <button type="button" aria-expanded={open} aria-controls={`comments-${postId}`} disabled={loadingComments} onClick={() => {
        setOpen(!open);
        if (!open) void updateComments(() => fetchComments(commentPageSize));
      }}>تعليقات <b>{total}</b></button>
    </div>
    {likeError && <p role="alert">{likeError}</p>}
    {open && <section id={`comments-${postId}`} aria-label="تعليقات المنشور">
      <form className="community-comment-form" onSubmit={submitComment}>
        <input aria-label="اكتب تعليق" placeholder="اكتب تعليق…" required maxLength={500} value={draft}
          disabled={loadingComments} onChange={event => setDraft(event.target.value)} />
        <button disabled={loadingComments || !draft.trim()}>إرسال</button>
      </form>
      {loadingComments && <p role="status">جارٍ التحديث…</p>}
      {commentError && <p role="alert">{commentError}</p>}
      {!loadingComments && !commentError && comments.length === 0 && <p>كن أول واحد يعلّق.</p>}
      <ul className="community-comments">
        {comments.map(comment => <li key={comment.id}>
          <div><strong>{comment.author_name}</strong> <time dateTime={comment.created_at}>{dateFormat.format(new Date(comment.created_at))}</time></div>
          <p>{comment.body}</p>
          {(supervisor || comment.own) &&
            <button type="button" disabled={loadingComments} onClick={() => void removeComment(comment)}>حذف التعليق</button>}
        </li>)}
      </ul>
      {comments.length < Math.min(total, 1000) && <button type="button" disabled={loadingComments}
        onClick={() => void updateComments(() => fetchComments(comments.length + commentPageSize))}>عرض تعليقات أكتر</button>}
    </section>}
  </div>;
}
