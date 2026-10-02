import {
  aggregateWorkedPeriods,
  summarizeByBusinessDate,
  totalWorkedMs,
} from "@open-punch/core";
import Link from "next/link";
import { AdminNav } from "../../src/components/admin-nav";
import { WorkerReportView } from "../../src/components/worker-report-view";
import { requireEmployee } from "../../src/lib/auth/guard";
import { fetchLocations, fetchWorkerPunches, fetchWorkersByLocation } from "../../src/lib/graphql-client";

export const dynamic = "force-dynamic";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 既定の期間: 今月1日〜今日（UTC基準。拠点TZでのズレは業務日フィルタ側で吸収済み）。 */
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: toISODate(firstOfMonth), to: toISODate(now) };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; workerId?: string; from?: string; to?: string }>;
}) {
  const employee = await requireEmployee();
  const { location, workerId, from, to } = await searchParams;
  const selectedLocationId = location ?? null;
  const selectedWorkerId = workerId ?? null;
  const { from: defaultFrom, to: defaultTo } = defaultRange();
  const effectiveFrom = from ?? defaultFrom;
  const effectiveTo = to ?? defaultTo;

  const locations = await fetchLocations();
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const workers = selectedLocationId
    ? (await fetchWorkersByLocation(selectedLocationId)).map((w) => ({
        id: w.id,
        displayName: w.displayName,
      }))
    : [];

  let days: ReturnType<typeof summarizeByBusinessDate> = [];
  let totalMs = 0;
  if (selectedLocationId && selectedWorkerId) {
    const raw = await fetchWorkerPunches(selectedWorkerId, effectiveFrom, effectiveTo);
    const punchesAsc = [...raw].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const periods = aggregateWorkedPeriods(punchesAsc);
    days = summarizeByBusinessDate(periods);
    totalMs = totalWorkedMs(periods);
  }

  const csvHref =
    selectedWorkerId &&
    `/api/reports/worker-punches?workerId=${selectedWorkerId}&from=${effectiveFrom}&to=${effectiveTo}&timeZone=${encodeURIComponent(selectedLocation?.timeZone ?? "UTC")}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">期間別の個人集計</h1>

      <nav aria-label="拠点選択" className="flex flex-wrap gap-2">
        {locations.map((loc) => (
          <Link
            key={loc.id}
            href={`/reports?location=${loc.id}`}
            aria-current={loc.id === selectedLocationId ? "true" : undefined}
            className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent aria-[current]:bg-primary aria-[current]:text-primary-foreground"
          >
            {loc.name}
          </Link>
        ))}
      </nav>

      {!selectedLocationId ? (
        <p className="text-muted-foreground" role="status">
          拠点を選択してください。
        </p>
      ) : workers.length === 0 ? (
        <p className="text-muted-foreground" role="status">
          この拠点には有効なアルバイトがいません。
        </p>
      ) : (
        <>
          <nav aria-label="アルバイト選択" className="flex flex-wrap gap-2">
            {workers.map((w) => (
              <Link
                key={w.id}
                href={`/reports?location=${selectedLocationId}&workerId=${w.id}&from=${effectiveFrom}&to=${effectiveTo}`}
                aria-current={w.id === selectedWorkerId ? "true" : undefined}
                className="rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent aria-[current]:bg-primary aria-[current]:text-primary-foreground"
              >
                {w.displayName}
              </Link>
            ))}
          </nav>

          {!selectedWorkerId ? (
            <p className="text-muted-foreground" role="status">
              アルバイトを選択してください。
            </p>
          ) : (
            <>
              <form className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="location" value={selectedLocationId} />
                <input type="hidden" name="workerId" value={selectedWorkerId} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="from" className="text-sm">
                    開始日
                  </label>
                  <input
                    id="from"
                    name="from"
                    type="date"
                    defaultValue={effectiveFrom}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="to" className="text-sm">
                    終了日
                  </label>
                  <input
                    id="to"
                    name="to"
                    type="date"
                    defaultValue={effectiveTo}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground"
                >
                  集計する
                </button>
              </form>

              <WorkerReportView
                days={days}
                totalMs={totalMs}
                timeZone={selectedLocation?.timeZone ?? "UTC"}
                csvHref={csvHref || "#"}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
