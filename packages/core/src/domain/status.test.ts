import { describe, expect, it } from "vitest";
import { computeWorkerStatus } from "./status";
import { PunchType, WorkerStatus } from "./types";

const IN = { type: PunchType.CLOCK_IN };
const OUT = { type: PunchType.CLOCK_OUT };

describe("computeWorkerStatus", () => {
  it("打刻なしは未出勤", () => {
    expect(computeWorkerStatus([])).toBe(WorkerStatus.NOT_CLOCKED_IN);
  });

  it("出勤で勤務中", () => {
    expect(computeWorkerStatus([IN])).toBe(WorkerStatus.WORKING);
  });

  it("出勤→退勤で退勤済", () => {
    expect(computeWorkerStatus([IN, OUT])).toBe(WorkerStatus.CLOCKED_OUT);
  });

  it("退勤→再出勤（中抜け）で勤務中に戻る", () => {
    expect(computeWorkerStatus([IN, OUT, IN])).toBe(WorkerStatus.WORKING);
  });

  it("最新イベントで決まる（複数ペア）", () => {
    expect(computeWorkerStatus([IN, OUT, IN, OUT])).toBe(WorkerStatus.CLOCKED_OUT);
  });
});
