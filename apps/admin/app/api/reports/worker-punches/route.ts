import { aggregateWorkedPeriods } from "@open-punch/core";
import { requireEmployee } from "../../../../src/lib/auth/guard";
import { toCsv } from "../../../../src/lib/csv";
import { formatDurationHM, formatTimeInZone } from "../../../../src/lib/format";
import { fetchWorkerPunches } from "../../../../src/lib/graphql-client";

// 期間指定の個人別勤怠 CSV エクスポート（#21）。認可・集計ロジックは
// GraphQL resolver / @open-punch/core の純関数と同じものを使う。

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// ULID など。Content-Disposition のファイル名に入るため、記号・引用符・改行は許可しない。
const ID_RE = /^[A-Za-z0-9_-]+$/;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function badRequest(message: string): Response {
  return new Response(message, { status: 400 });
}

export async function GET(request: Request): Promise<Response> {
  await requireEmployee();

  const url = new URL(request.url);
  const workerId = url.searchParams.get("workerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const timeZone = url.searchParams.get("timeZone") ?? "UTC";
  if (!workerId || !from || !to) {
    return badRequest("workerId, from, to は必須です");
  }
  if (!ID_RE.test(workerId)) return badRequest("workerId の形式が不正です");
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return badRequest("from, to は YYYY-MM-DD 形式で指定してください");
  }
  if (!isValidTimeZone(timeZone)) return badRequest("timeZone が不正です");

  const raw = await fetchWorkerPunches(workerId, from, to);
  const punchesAsc = [...raw].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const periods = aggregateWorkedPeriods(punchesAsc);

  const rows: string[][] = [["日付", "出勤", "退勤", "稼働時間"]];
  let totalMs = 0;
  for (const p of periods) {
    rows.push([
      p.businessDate,
      formatTimeInZone(p.clockInAt, timeZone),
      p.clockOutAt ? formatTimeInZone(p.clockOutAt, timeZone) : "未退勤",
      p.durationMs != null ? formatDurationHM(p.durationMs) : "",
    ]);
    totalMs += p.durationMs ?? 0;
  }
  rows.push(["合計", "", "", formatDurationHM(totalMs)]);

  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="worker-punches-${workerId}-${from}_${to}.csv"`,
    },
  });
}
