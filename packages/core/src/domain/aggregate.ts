// 期間指定の個人別勤怠集計（#21）。すべて純関数。
// CLOCK_IN → CLOCK_OUT のペアを畳み込んで稼働期間にする。休憩は「一旦退勤」で
// 表現される運用（鉄則6）なので、ペア単位の合算がそのまま「中抜け」を表す。
import type { PunchEvent } from "./types";

/** 集計に必要な最小限のフィールド（GraphQL クライアントの生成型でもそのまま渡せる）。 */
export type AggregatablePunch = Pick<PunchEvent, "occurredAt" | "businessDate"> & {
  type: PunchEvent["type"] | `${PunchEvent["type"]}`;
};

export interface WorkedPeriod {
  /** ペアの帰属日。締め跨ぎのシフトも CLOCK_IN 側の businessDate に計上する。 */
  businessDate: string;
  clockInAt: string;
  /** 対応する退勤が無い（未退勤）場合は null。 */
  clockOutAt: string | null;
  /** clockOutAt が null の場合は null（時間を確定できないため合計に含めない）。 */
  durationMs: number | null;
}

export interface DailyWorkedSummary {
  businessDate: string;
  totalMs: number;
  periods: WorkedPeriod[];
}

/**
 * occurredAt 昇順の PunchEvent 列から稼働期間を組み立てる。
 * - CLOCK_IN → CLOCK_OUT を1ペアとする。中抜けは複数ペアとして自然に表れる。
 * - 対応する CLOCK_OUT が無いまま次の CLOCK_IN が来た場合（異常系）、直前の
 *   CLOCK_IN は未退勤として確定し、新しい CLOCK_IN から数え直す。
 * - 対応する CLOCK_IN が無い CLOCK_OUT（期間の開始前から出勤していた等）は無視する。
 * - 末尾まで対応する CLOCK_OUT が無ければ未退勤（durationMs: null）として含める。
 */
export function aggregateWorkedPeriods(punchesAsc: readonly AggregatablePunch[]): WorkedPeriod[] {
  const periods: WorkedPeriod[] = [];
  let open: AggregatablePunch | undefined;

  const closeAsUnfinished = (clockIn: AggregatablePunch) => {
    periods.push({
      businessDate: clockIn.businessDate,
      clockInAt: clockIn.occurredAt,
      clockOutAt: null,
      durationMs: null,
    });
  };

  for (const p of punchesAsc) {
    if (p.type === "CLOCK_IN") {
      if (open) closeAsUnfinished(open);
      open = p;
    } else if (open) {
      periods.push({
        businessDate: open.businessDate,
        clockInAt: open.occurredAt,
        clockOutAt: p.occurredAt,
        durationMs: Date.parse(p.occurredAt) - Date.parse(open.occurredAt),
      });
      open = undefined;
    }
    // else: 対応する CLOCK_IN が無い CLOCK_OUT は無視する。
  }
  if (open) closeAsUnfinished(open);

  return periods;
}

/** 稼働期間を businessDate ごとに畳み込む（日別合計・期間合計の元データ）。 */
export function summarizeByBusinessDate(periods: readonly WorkedPeriod[]): DailyWorkedSummary[] {
  const byDate = new Map<string, WorkedPeriod[]>();
  for (const p of periods) {
    const list = byDate.get(p.businessDate);
    if (list) list.push(p);
    else byDate.set(p.businessDate, [p]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([businessDate, datePeriods]) => ({
      businessDate,
      totalMs: totalWorkedMs(datePeriods),
      periods: datePeriods,
    }));
}

/** 未退勤（durationMs: null）を除いた合計稼働時間（ms）。 */
export function totalWorkedMs(periods: readonly WorkedPeriod[]): number {
  return periods.reduce((sum, p) => sum + (p.durationMs ?? 0), 0);
}

/**
 * businessDate の範囲 [from, to] を安全に覆う occurredAt(UTC) の検索範囲を返す。
 * businessDate は拠点TZ・締め時刻で算出されるため、UTC の暦日とは最大でも
 * 前後1日ずれる。余裕を持って `marginDays`（既定2日）だけ広げてから
 * Query し、呼び出し側で businessDate の厳密一致フィルタをかける想定。
 */
export function widenBusinessDateRangeToOccurredAt(
  from: string,
  to: string,
  marginDays = 2,
): { fromOccurredAt: string; toOccurredAt: string } {
  const shift = (dateStr: string, days: number): string => {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return {
    fromOccurredAt: `${shift(from, -marginDays)}T00:00:00.000Z`,
    toOccurredAt: `${shift(to, marginDays)}T23:59:59.999Z`,
  };
}
