import { aggregateWorkedPeriods } from "@open-punch/core";
import { requireEmployee } from "../../../../src/lib/auth/guard";
import { formatDurationHM, formatTimeInZone } from "../../../../src/lib/format";
import { fetchWorkerPunches } from "../../../../src/lib/graphql-client";

// 期間指定の個人別勤怠 CSV エクスポート（#21）。認可・集計ロジックは
// GraphQL resolver / @open-punch/core の純関数と同じものを使う。

function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toCsv(rows: string[][]): string {
  // Excel（日本語ロケール）で文字化けしないよう UTF-8 BOM を先頭に付ける。
  return `﻿${rows.map((r) => r.map(csvEscape).join(",")).join("\r\n")}`;
}

export async function GET(request: Request): Promise<Response> {
  await requireEmployee();

  const url = new URL(request.url);
  const workerId = url.searchParams.get("workerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const timeZone = url.searchParams.get("timeZone") ?? "UTC";
  if (!workerId || !from || !to) {
    return new Response("workerId, from, to は必須です", { status: 400 });
  }

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
