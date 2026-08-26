import { describe, expect, it } from "vitest";
import { GSI1, GSI2, PK, SK } from "./keys";

describe("keys", () => {
  it("PK/SK", () => {
    expect(PK.location("L1")).toBe("LOCATION#L1");
    expect(PK.worker("W1")).toBe("WORKER#W1");
    expect(PK.employee("sub-1")).toBe("EMPLOYEE#sub-1");
    expect(SK.profile).toBe("PROFILE");
    expect(SK.punch("2026-08-25T00:00:00Z", "01K")).toBe("PUNCH#2026-08-25T00:00:00Z#01K");
    expect(SK.punchPrefix).toBe("PUNCH#");
  });

  it("GSI1 は拠点別・nameKana 昇順ソート", () => {
    expect(GSI1.pk("L1")).toBe("LOCATION#L1");
    expect(GSI1.sk("やまだ", "W1")).toBe("やまだ#WORKER#W1");
  });

  it("GSI2 は拠点＋営業日、時刻昇順ソート", () => {
    expect(GSI2.pk("L1", "2026-08-25")).toBe("LOCATION#L1#2026-08-25");
    expect(GSI2.sk("2026-08-25T09:00:00Z", "W1")).toBe("2026-08-25T09:00:00Z#WORKER#W1");
  });
});
