import { describe, expect, it } from "vitest";
import { computeBusinessDate } from "./businessDate";

describe("computeBusinessDate", () => {
  describe("Asia/Tokyo（DST無・UTC+9, cutoff=0）", () => {
    it("JST 朝の打刻はその日の業務日", () => {
      // 2026-08-25T00:30:00Z = JST 09:30
      expect(computeBusinessDate("2026-08-25T00:30:00Z", "Asia/Tokyo")).toBe("2026-08-25");
    });

    it("JST 深夜（0時前）はまだ同じ業務日", () => {
      // 2026-08-25T14:59:00Z = JST 23:59
      expect(computeBusinessDate("2026-08-25T14:59:00Z", "Asia/Tokyo")).toBe("2026-08-25");
    });

    it("JST 0時を過ぎると翌業務日", () => {
      // 2026-08-25T15:30:00Z = JST 2026-08-26 00:30
      expect(computeBusinessDate("2026-08-25T15:30:00Z", "Asia/Tokyo")).toBe("2026-08-26");
    });
  });

  describe("Australia/Sydney（DST有）", () => {
    it("夏（1月・UTC+11）: 深夜0時境界を正しく跨ぐ", () => {
      // 2026-01-15T13:30:00Z = Sydney 2026-01-16 00:30（+11）
      expect(computeBusinessDate("2026-01-15T13:30:00Z", "Australia/Sydney")).toBe("2026-01-16");
      // 2026-01-15T12:30:00Z = Sydney 2026-01-15 23:30（+11）
      expect(computeBusinessDate("2026-01-15T12:30:00Z", "Australia/Sydney")).toBe("2026-01-15");
    });

    it("冬（7月・UTC+10）: オフセットが変わっても正しい", () => {
      // 2026-07-15T14:30:00Z = Sydney 2026-07-16 00:30（+10）
      expect(computeBusinessDate("2026-07-15T14:30:00Z", "Australia/Sydney")).toBe("2026-07-16");
      // 2026-07-15T13:30:00Z = Sydney 2026-07-15 23:30（+10）
      expect(computeBusinessDate("2026-07-15T13:30:00Z", "Australia/Sydney")).toBe("2026-07-15");
    });
  });

  describe("その他の豪州TZ", () => {
    it("Australia/Perth（DST無・UTC+8）", () => {
      // 2026-01-15T16:30:00Z = Perth 2026-01-16 00:30
      expect(computeBusinessDate("2026-01-15T16:30:00Z", "Australia/Perth")).toBe("2026-01-16");
    });

    it("Australia/Adelaide（30分刻み・夏はUTC+10:30）", () => {
      // 2026-01-15T14:00:00Z = Adelaide 2026-01-16 00:30（+10:30）
      expect(computeBusinessDate("2026-01-15T14:00:00Z", "Australia/Adelaide")).toBe("2026-01-16");
    });
  });

  describe("締め時刻あり（cutoffHour）", () => {
    it("Asia/Tokyo cutoff=5: AM5時より前は前日", () => {
      // 2026-08-25T19:00:00Z = JST 2026-08-26 04:00 → 締め5時なので前日
      expect(computeBusinessDate("2026-08-25T19:00:00Z", "Asia/Tokyo", 5)).toBe("2026-08-25");
      // 2026-08-25T20:00:00Z = JST 2026-08-26 05:00 → 当日
      expect(computeBusinessDate("2026-08-25T20:00:00Z", "Asia/Tokyo", 5)).toBe("2026-08-26");
    });

    it("Australia/Sydney cutoff=5（夏）: 前日補正が月境界を跨ぐ", () => {
      // 2026-01-31T16:00:00Z = Sydney 2026-02-01 03:00（+11）→ 締め5時なので前日 = 2026-01-31
      expect(computeBusinessDate("2026-01-31T16:00:00Z", "Australia/Sydney", 5)).toBe("2026-01-31");
    });
  });

  describe("入力バリデーション", () => {
    it("不正な日付は例外", () => {
      expect(() => computeBusinessDate("not-a-date", "Asia/Tokyo")).toThrow();
    });

    it("不正なタイムゾーンは例外", () => {
      expect(() => computeBusinessDate("2026-08-25T00:00:00Z", "Mars/Phobos")).toThrow();
    });

    it("範囲外の cutoffHour は例外", () => {
      expect(() => computeBusinessDate("2026-08-25T00:00:00Z", "Asia/Tokyo", 24)).toThrow();
      expect(() => computeBusinessDate("2026-08-25T00:00:00Z", "Asia/Tokyo", -1)).toThrow();
    });
  });
});
