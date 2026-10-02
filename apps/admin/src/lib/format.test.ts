import { describe, expect, it } from "vitest";
import { formatDurationHM, formatTimeInZone, punchTypeLabel } from "./format";

describe("formatTimeInZone", () => {
  it("Asia/Tokyo（+9）で JST 表示", () => {
    expect(formatTimeInZone("2026-08-25T00:30:00Z", "Asia/Tokyo")).toBe("09:30");
  });

  it("Australia/Adelaide（+9:30, 8月は標準時=30分刻み）", () => {
    expect(formatTimeInZone("2026-08-25T00:30:00Z", "Australia/Adelaide")).toBe("10:00");
  });
});

describe("punchTypeLabel", () => {
  it("CLOCK_IN=出勤 / CLOCK_OUT=退勤", () => {
    expect(punchTypeLabel("CLOCK_IN")).toBe("出勤");
    expect(punchTypeLabel("CLOCK_OUT")).toBe("退勤");
  });
});

describe("formatDurationHM", () => {
  it("時:分（0埋め）で表示する", () => {
    expect(formatDurationHM(8.5 * 3600_000)).toBe("8:30");
    expect(formatDurationHM(3600_000)).toBe("1:00");
    expect(formatDurationHM(5 * 60_000)).toBe("0:05");
  });

  it("秒未満の端数は分単位で四捨五入する", () => {
    expect(formatDurationHM(90_000)).toBe("0:02"); // 1分30秒 → 2分
  });

  it("負値は 0:00 に丸める", () => {
    expect(formatDurationHM(-1000)).toBe("0:00");
  });
});
