import { describe, expect, it } from "vitest";
import { formatTimeInZone, punchTypeLabel } from "./format";

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
