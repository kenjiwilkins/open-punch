import { requireEmployee } from "../src/lib/auth/guard";

// 認証必須。未ログインは requireEmployee 内で Hosted UI ログインへ誘導する。
export const dynamic = "force-dynamic";

export default async function Page() {
  const employee = await requireEmployee();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">open-punch 管理</h1>
          <p className="text-muted-foreground">{employee.email} でログイン中</p>
        </div>
        <a href="/api/auth/logout" className="text-primary underline underline-offset-4">
          ログアウト
        </a>
      </header>

      <section className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          拠点選択・当日打刻一覧・各種 CRUD は後続の issue で実装します。
        </p>
      </section>
    </main>
  );
}
