import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "open-punch kiosk",
  description: "アルバイト用の打刻キオスク",
};

// iPad 横向き・タップ前提。ズーム抑止のため viewport を固定する。
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
