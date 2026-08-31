import { WorkerGrid, type WorkerGridItem } from "./worker-grid";

// 名前一覧ページの見た目（presentational）。データ取得はページ側が担い、
// ここは props で受け取った状態を描画するだけ（Story 化しやすくするため）。
export function HomeView({
  workers,
  error,
}: {
  workers: WorkerGridItem[];
  error?: string | null;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">名前をタップしてください</h1>
        <p className="text-muted-foreground">出勤・退勤を打刻します</p>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/50 p-4 text-destructive" role="alert">
          一覧を取得できませんでした: {error}
        </p>
      ) : (
        <WorkerGrid workers={workers} />
      )}
    </main>
  );
}
