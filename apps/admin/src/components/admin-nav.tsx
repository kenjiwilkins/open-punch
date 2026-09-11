import Link from "next/link";

// admin 共通ナビ（presentational）。
export function AdminNav({ email }: { email: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
      <nav className="flex gap-4 text-sm">
        <Link href="/" className="hover:underline">
          当日一覧
        </Link>
        <Link href="/locations" className="hover:underline">
          拠点
        </Link>
        <Link href="/workers" className="hover:underline">
          アルバイト
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{email}</span>
        <a href="/api/auth/logout" className="text-primary underline underline-offset-4">
          ログアウト
        </a>
      </div>
    </header>
  );
}
