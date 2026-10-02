import { formatDurationHM, formatTimeInZone } from "../lib/format";

export interface WorkerReportPeriod {
  businessDate: string;
  clockInAt: string;
  clockOutAt: string | null;
  durationMs: number | null;
}

export interface WorkerReportDay {
  businessDate: string;
  totalMs: number;
  periods: WorkerReportPeriod[];
}

// 期間指定の個人別勤怠集計（presentational, #21）。日別の稼働期間（中抜けは複数行）と
// 日別合計・期間合計を表示する。集計そのものは @open-punch/core の純関数で行う。
export function WorkerReportView({
  days,
  totalMs,
  timeZone,
  csvHref,
}: {
  days: WorkerReportDay[];
  totalMs: number;
  timeZone: string;
  csvHref: string;
}) {
  if (days.length === 0) {
    return (
      <p className="text-muted-foreground" role="status">
        指定期間の打刻はありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          期間合計: <span className="font-semibold tabular-nums">{formatDurationHM(totalMs)}</span>
        </p>
        <a href={csvHref} className="text-primary underline underline-offset-4">
          CSVダウンロード
        </a>
      </div>

      {days.map((day) => (
        <section key={day.businessDate} className="flex flex-col gap-2">
          <h3 className="flex items-baseline justify-between text-sm font-semibold">
            <span>{day.businessDate}</span>
            <span className="tabular-nums">{formatDurationHM(day.totalMs)}</span>
          </h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-1 pr-4 font-medium">出勤</th>
                <th className="py-1 pr-4 font-medium">退勤</th>
                <th className="py-1 font-medium">稼働時間</th>
              </tr>
            </thead>
            <tbody>
              {day.periods.map((p) => (
                <tr key={p.clockInAt} className="border-b">
                  <td className="py-1 pr-4 tabular-nums">{formatTimeInZone(p.clockInAt, timeZone)}</td>
                  <td className="py-1 pr-4 tabular-nums">
                    {p.clockOutAt ? formatTimeInZone(p.clockOutAt, timeZone) : "未退勤"}
                  </td>
                  <td className="py-1 tabular-nums">
                    {p.durationMs != null ? formatDurationHM(p.durationMs) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
