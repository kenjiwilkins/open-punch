import { WorkerGrid, type WorkerGridItem } from "../src/components/worker-grid";
import { fetchWorkers } from "../src/lib/kiosk-client";

// 打刻データは常に最新を見せたいので静的化しない（ビルド時のフェッチも避ける）。
export const dynamic = "force-dynamic";

export default async function Page() {
  let workers: WorkerGridItem[] = [];
  let error: string | null = null;

  try {
    const raw = await fetchWorkers();
    // スキーマ上フィールドは nullable なので、必須項目が揃うものだけを通す。
    workers = raw.flatMap((w) =>
      w?.id && w.displayName
        ? [{ id: w.id, displayName: w.displayName, nameKana: w.nameKana ?? null }]
        : [],
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "不明なエラー";
  }

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
