import Link from "next/link";

export interface WorkerGridItem {
  id: string;
  displayName: string;
  nameKana?: string | null;
}

// 名前一覧グリッド。並び順（かな順）は呼び出し側（= サーバーの GSI1）に従い、
// ここでは並べ替えない。表示名は displayName を使う（同姓対策）。
export function WorkerGrid({ workers }: { workers: WorkerGridItem[] }) {
  if (workers.length === 0) {
    return (
      <p className="text-lg text-muted-foreground" role="status">
        この拠点に有効なアルバイトが登録されていません。
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {workers.map((worker) => (
        <li key={worker.id}>
          <Link
            href={{ pathname: `/punch/${worker.id}`, query: { name: worker.displayName } }}
            aria-label={`${worker.displayName} の打刻へ`}
            className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border bg-background text-center shadow-sm transition-colors outline-none hover:bg-accent active:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="text-2xl font-semibold leading-tight">{worker.displayName}</span>
            {worker.nameKana ? (
              <span className="text-sm text-muted-foreground">{worker.nameKana}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
