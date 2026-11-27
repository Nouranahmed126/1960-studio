import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./community/community.css";
import SiteNavigation from "./site-navigation";
import MeetingReminders from "./meeting-reminders";
import PasswordChangeGuard from "./password-change-guard";

export const metadata: Metadata = {
  metadataBase: new URL("https://plateau-crew-hub.vercel.app"),
  icons: { icon: "/icon-timeline.svg", shortcut: "/icon-timeline.svg" },
  openGraph: { siteName: "Plateau Crew Hub" },
  title: { default: "Plateau Crew Hub", template: "%s · Plateau Crew Hub" },
  description: "مساحة الفريق الإبداعي لمشاركة التحديثات وإدارة المشروعات والتكليفات.",
  authors: [{ name: "Nouran Ahmed" }],
  creator: "Nouran Ahmed — Teaching Assistant",
  publisher: "Nouran Ahmed",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body className="site-gold-canvas" style={{margin:0,fontFamily:"system-ui, sans-serif"}}>
    <div className="gold-starfield" aria-hidden="true" />
    <PasswordChangeGuard/>
    <SiteNavigation/>
    {children}
    <footer className="site-identity-footer" dir="ltr">
      <div className="site-footer-academic">
        <small>ACADEMIC SUPERVISION</small>
        <strong>Dr. Ahmed Abdelmoneim</strong>
      </div>
      <div className="site-footer-owner">
        <small>CREATED &amp; DEVELOPED BY</small>
        <strong>Nouran Ahmed</strong>
        <span>TEACHING ASSISTANT · SITE OWNER</span>
      </div>
    </footer>
    <MeetingReminders/>
  </body></html>;
}
