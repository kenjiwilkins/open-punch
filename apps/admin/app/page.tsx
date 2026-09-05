import {
  DailyPunchesView,
  type PunchRow,
} from "../src/components/daily-punches-view";
import { requireEmployee } from "../src/lib/auth/guard";
import { fetchLocations, fetchPunchesByDate } from "../src/lib/graphql-client";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const employee = await requireEmployee();
  const { location } = await searchParams;

  const locations = await fetchLocations();
  const selectedLocationId = location ?? null;

  let punches: PunchRow[] = [];
  if (selectedLocationId) {
    const raw = await fetchPunchesByDate(selectedLocationId);
    // スキーマ上フィールドは nullable なので、必須が揃うものだけ通す。
    punches = raw.flatMap((p) =>
      p?.id && p.type && p.occurredAt && p.timeZone
        ? [
            {
              id: p.id,
              type: p.type,
              occurredAt: p.occurredAt,
              timeZone: p.timeZone,
              workerName: p.worker?.displayName ?? "(不明)",
            },
          ]
        : [],
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">当日打刻一覧</h1>
          <p className="text-muted-foreground">{employee.email} でログイン中</p>
        </div>
        <a href="/api/auth/logout" className="text-primary underline underline-offset-4">
          ログアウト
        </a>
      </header>

      <DailyPunchesView
        locations={locations.flatMap((l) => (l?.id && l.name ? [{ id: l.id, name: l.name }] : []))}
        selectedLocationId={selectedLocationId}
        punches={punches}
      />
    </main>
  );
}
