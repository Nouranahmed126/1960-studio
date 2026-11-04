import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "1960 STUDIO", description: "مساحة عمل مشروع التخرج 1960" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#10131c", color: "#f7f4ed" }}>{children}</body></html>;
}