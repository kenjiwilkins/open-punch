import type { ReactNode } from "react";

export const metadata = {
  title: "open-punch kiosk",
  description: "アルバイト用の打刻キオスク",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
