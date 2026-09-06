import Link from "next/link";
import { cn } from "@open-punch/ui";
import { formatTimeInZone, punchTypeLabel } from "../lib/format";

export interface LocationOption {
  id: string;
  name: string;
}

export interface PunchRow {
  id: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  occurredAt: string;
  timeZone: string;
  workerName: string;
}

// 当日打刻一覧（presentational）。拠点選択とその拠点の当日一覧を表示する。
// 時刻は各打刻の拠点タイムゾーンで表示する。
export function DailyPunchesView({
  locations,
  selectedLocationId,
  punches,
}: {
  locations: LocationOption[];
  selectedLocationId: string | null;
  punches: PunchRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="拠点選択" className="flex flex-wrap gap-2">
        {locations.map((loc) => (
          <Link
            key={loc.id}
            href={`/?location=${loc.id}`}
            aria-current={loc.id === selectedLocationId ? "true" : undefined}
            className={cn(
              "rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent",
              loc.id === selectedLocationId && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {loc.name}
          </Link>
        ))}
      </nav>

      {!selectedLocationId ? (
        <p className="text-muted-foreground" role="status">
          拠点を選択してください。
        </p>
      ) : punches.length === 0 ? (
        <p className="text-muted-foreground" role="status">
          本日の打刻はまだありません。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="py-2 pr-4 font-medium">時刻</th>
                <th className="py-2 pr-4 font-medium">種別</th>
                <th className="py-2 font-medium">名前</th>
              </tr>
            </thead>
            <tbody>
              {punches.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-4 tabular-nums">
                    {formatTimeInZone(p.occurredAt, p.timeZone)}
                  </td>
                  <td className="py-2 pr-4">{punchTypeLabel(p.type)}</td>
                  <td className="py-2">{p.workerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
