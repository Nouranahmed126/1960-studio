"use client";

import { useEffect, useRef } from "react";

const seenKey = "studio1960-intro-seen";

export default function CinematicIntro() {
  const welcome = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = welcome.current;
    if (!dialog) return;
    try {
      if (sessionStorage.getItem(seenKey) === "1") return;
    } catch {
      // The welcome can still be dismissed when session storage is unavailable.
    }
    if (!dialog.open) dialog.showModal();

  }, []);

  function enter() {
    try {
      sessionStorage.setItem(seenKey, "1");
    } catch {
      // The dialog closes even when session storage is unavailable.
    }
  }

  return <dialog ref={welcome} className="plateau-welcome" aria-labelledby="plateau-welcome-title" onClose={enter}>
    <div className="plateau-welcome-content">
      <span className="plateau-welcome-badge" aria-hidden="true">P</span>
      <h1 id="plateau-welcome-title" dir="ltr">Plateau <span>|</span> Crew Hub</h1>
      <p>منصة فريق مشروع التخرج</p>
      <p>الإشراف الأكاديمي: <span>د. أحمد عبد المنعم</span></p>
      <p>تصميم وتطوير: <span>نوران أحمد</span></p>
      <form method="dialog"><button type="submit">دخول المنصة</button></form>
    </div>
  </dialog>;
}
