import { afterEach, describe, expect, it, vi } from "vitest";

const punchMock = vi.hoisted(() => vi.fn());
vi.mock("./kiosk-client", () => ({ punch: punchMock }));

import { PunchType } from "../gql/graphql";
import { submitPunch } from "./actions";

afterEach(() => vi.clearAllMocks());

describe("submitPunch", () => {
  it("成功なら ok:true（type を渡す・時刻は渡さない）", async () => {
    punchMock.mockResolvedValue({ id: "P1" });
    const result = await submitPunch("W1", PunchType.ClockIn);
    expect(result).toEqual({ ok: true });
    expect(punchMock).toHaveBeenCalledWith("W1", PunchType.ClockIn);
  });

  it("サーバー側デデュープ（既存イベントが返る）も正常系", async () => {
    punchMock.mockResolvedValue({ id: "OLD" }); // 既存イベント
    expect(await submitPunch("W1", PunchType.ClockIn)).toEqual({ ok: true });
  });

  it("例外なら ok:false とメッセージ", async () => {
    punchMock.mockRejectedValue(new Error("boom"));
    expect(await submitPunch("W1", PunchType.ClockOut)).toEqual({ ok: false, message: "boom" });
  });
});
