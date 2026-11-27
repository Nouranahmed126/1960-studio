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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body className="site-gold-canvas" style={{margin:0,fontFamily:"system-ui, sans-serif"}}>
    <div className="gold-starfield" aria-hidden="true" />
    <PasswordChangeGuard/>
    <SiteNavigation/>
    {children}<MeetingReminders/>
  </body></html>;
}
