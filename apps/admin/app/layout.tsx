import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "open-punch admin",
  description: "社員用の勤怠管理画面",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
