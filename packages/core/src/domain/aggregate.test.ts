import { describe, expect, it } from "vitest";
import {
  aggregateWorkedPeriods,
  summarizeByBusinessDate,
  totalWorkedMs,
  widenBusinessDateRangeToOccurredAt,
} from "./aggregate";
import { PunchType, type PunchEvent } from "./types";

let seq = 0;
function punch(overrides: Partial<PunchEvent> & Pick<PunchEvent, "type" | "occurredAt" | "businessDate">): PunchEvent {
  seq += 1;
  return {
    id: `P${seq}`,
    workerId: "W1",
    locationId: "L1",
    timeZone: "Asia/Tokyo",
    source: "KIOSK",
    corrected: false,
    createdAt: overrides.occurredAt,
    ...overrides,
  };
}

describe("aggregateWorkedPeriods", () => {
  it("空配列は空配列", () => {
    expect(aggregateWorkedPeriods([])).toEqual([]);
  });

  it("出勤/退勤ペア: 1件の稼働期間になる", () => {
    const periods = aggregateWorkedPeriods([
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" }),
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T08:30:00Z", businessDate: "2026-08-25" }),
    ]);
    expect(periods).toEqual([
      {
        businessDate: "2026-08-25",
        clockInAt: "2026-08-25T00:00:00Z",
        clockOutAt: "2026-08-25T08:30:00Z",
        durationMs: 8.5 * 60 * 60 * 1000,
      },
    ]);
  });

  it("中抜け: 退勤→出勤を挟むと2ペアになる", () => {
    const periods = aggregateWorkedPeriods([
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" }), // 09:00 JST
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T03:00:00Z", businessDate: "2026-08-25" }), // 12:00 JST 昼休み
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T04:00:00Z", businessDate: "2026-08-25" }), // 13:00 JST 復帰
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T08:00:00Z", businessDate: "2026-08-25" }), // 17:00 JST
    ]);
    expect(periods).toHaveLength(2);
    expect(periods[0]!.durationMs).toBe(3 * 60 * 60 * 1000);
    expect(periods[1]!.durationMs).toBe(4 * 60 * 60 * 1000);
  });

  it("日跨ぎ: CLOCK_IN の businessDate に計上され、実時間で duration を計算する", () => {
    // cutoffHour=0 の拠点で 23:50 出勤 → 翌日 00:10 退勤（暦日が変わる＝businessDate も変わる想定）
    const periods = aggregateWorkedPeriods([
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T14:50:00Z", businessDate: "2026-08-25" }),
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T15:10:00Z", businessDate: "2026-08-26" }),
    ]);
    expect(periods).toEqual([
      {
        businessDate: "2026-08-25", // CLOCK_IN 側の日に帰属
        clockInAt: "2026-08-25T14:50:00Z",
        clockOutAt: "2026-08-25T15:10:00Z",
        durationMs: 20 * 60 * 1000,
      },
    ]);
  });

  it("未退勤: 最後が CLOCK_IN のまま終わると durationMs: null で残る", () => {
    const periods = aggregateWorkedPeriods([
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" }),
    ]);
    expect(periods).toEqual([
      {
        businessDate: "2026-08-25",
        clockInAt: "2026-08-25T00:00:00Z",
        clockOutAt: null,
        durationMs: null,
      },
    ]);
  });

  it("異常系: 対応する CLOCK_OUT の無い CLOCK_IN の直後に次の CLOCK_IN が来たら、前者を未退勤として確定する", () => {
    const periods = aggregateWorkedPeriods([
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" }),
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T01:00:00Z", businessDate: "2026-08-25" }),
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T05:00:00Z", businessDate: "2026-08-25" }),
    ]);
    expect(periods).toHaveLength(2);
    expect(periods[0]).toEqual({
      businessDate: "2026-08-25",
      clockInAt: "2026-08-25T00:00:00Z",
      clockOutAt: null,
      durationMs: null,
    });
    expect(periods[1]!.clockInAt).toBe("2026-08-25T01:00:00Z");
    expect(periods[1]!.durationMs).toBe(4 * 60 * 60 * 1000);
  });

  it("異常系: 対応する CLOCK_IN の無い CLOCK_OUT（期間の開始前から出勤）は無視する", () => {
    const periods = aggregateWorkedPeriods([
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" }),
      punch({ type: PunchType.CLOCK_IN, occurredAt: "2026-08-25T01:00:00Z", businessDate: "2026-08-25" }),
      punch({ type: PunchType.CLOCK_OUT, occurredAt: "2026-08-25T05:00:00Z", businessDate: "2026-08-25" }),
    ]);
    expect(periods).toHaveLength(1);
    expect(periods[0]!.clockInAt).toBe("2026-08-25T01:00:00Z");
  });
});

describe("summarizeByBusinessDate / totalWorkedMs", () => {
  it("日別に畳み込み、日付昇順に並べる。未退勤は日別合計に含めない", () => {
    const periods = [
      { businessDate: "2026-08-26", clockInAt: "a", clockOutAt: "b", durationMs: 3 * 3600_000 },
      { businessDate: "2026-08-25", clockInAt: "a", clockOutAt: "b", durationMs: 5 * 3600_000 },
      { businessDate: "2026-08-25", clockInAt: "a", clockOutAt: "b", durationMs: 1 * 3600_000 },
      { businessDate: "2026-08-25", clockInAt: "a", clockOutAt: null, durationMs: null },
    ];
    const summary = summarizeByBusinessDate(periods);
    expect(summary.map((s) => s.businessDate)).toEqual(["2026-08-25", "2026-08-26"]);
    expect(summary[0]!.totalMs).toBe(6 * 3600_000);
    expect(summary[0]!.periods).toHaveLength(3);
    expect(summary[1]!.totalMs).toBe(3 * 3600_000);
    expect(totalWorkedMs(periods)).toBe(9 * 3600_000);
  });

  it("空配列は空配列", () => {
    expect(summarizeByBusinessDate([])).toEqual([]);
    expect(totalWorkedMs([])).toBe(0);
  });
});

describe("widenBusinessDateRangeToOccurredAt", () => {
  it("既定2日ぶん前後に広げる", () => {
    const r = widenBusinessDateRangeToOccurredAt("2026-08-25", "2026-08-27");
    expect(r.fromOccurredAt).toBe("2026-08-23T00:00:00.000Z");
    expect(r.toOccurredAt).toBe("2026-08-29T23:59:59.999Z");
  });

  it("月・年境界をまたいでも正しくずれる", () => {
    const r = widenBusinessDateRangeToOccurredAt("2026-01-01", "2025-12-31", 2);
    expect(r.fromOccurredAt).toBe("2025-12-30T00:00:00.000Z");
    expect(r.toOccurredAt).toBe("2026-01-02T23:59:59.999Z");
  });

  it("marginDays を指定できる", () => {
    const r = widenBusinessDateRangeToOccurredAt("2026-08-25", "2026-08-25", 0);
    expect(r.fromOccurredAt).toBe("2026-08-25T00:00:00.000Z");
    expect(r.toOccurredAt).toBe("2026-08-25T23:59:59.999Z");
  });
});
