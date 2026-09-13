import { HomeView } from "../src/components/home-view";
import type { WorkerGridItem } from "../src/components/worker-grid";
import { fetchWorkers } from "../src/lib/kiosk-client";

// 打刻データは常に最新を見せたいので静的化しない（ビルド時のフェッチも避ける）。
export const dynamic = "force-dynamic";

export default async function Page() {
  let workers: WorkerGridItem[] = [];
  let error: string | null = null;

  try {
    const raw = await fetchWorkers();
    // スキーマが non-null 化された（#32）ので防御的な絞り込みは不要。
    workers = raw.map((w) => ({ id: w.id, displayName: w.displayName, nameKana: w.nameKana }));
  } catch (e) {
    error = e instanceof Error ? e.message : "不明なエラー";
  }

  return <HomeView workers={workers} error={error} />;
}
