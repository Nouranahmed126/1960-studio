import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import "./community/community.css";
import SiteNavigation from "./site-navigation";
import MeetingReminders from "./meeting-reminders";

export const metadata: Metadata = {
  title: { default: "Plateau | Crew Hub", template: "%s · Plateau | Crew Hub" },
  description: "مساحة عمل طاقم مشروع التخرج وتكليفاته وتحديثاته.",
  authors: [{ name: "Nouran Ahmed" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body style={{margin:0,fontFamily:"system-ui, sans-serif"}}>
    <header className="plateau-nav">
      <div>
        <Link href="/" className="plateau-brand" dir="ltr">Plateau <span>|</span> Crew Hub</Link>
        <nav aria-label="الأقسام الرئيسية">
          <Link href="/">التايم لاين</Link>
          <Link href="/dashboard#assignments">التكليفات</Link>
          <Link href="/film#quick-submission">تسليم سريع</Link>
          <Link href="/honor-board">لوحة الشرف</Link>
          <Link href="/dashboard">حسابي</Link>
        </nav>
      </div>
    </header>
    {children}<MeetingReminders/><SiteNavigation/>
  </body></html>;
}
