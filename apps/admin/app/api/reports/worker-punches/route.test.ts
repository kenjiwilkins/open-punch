import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock, fetchWorkerPunchesMock } = vi.hoisted(() => ({
  requireEmployeeMock: vi.fn(),
  fetchWorkerPunchesMock: vi.fn(),
}));
vi.mock("../../../../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../../../../src/lib/graphql-client", () => ({ fetchWorkerPunches: fetchWorkerPunchesMock }));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

const req = (qs: string) => new Request(`http://localhost/api/reports/worker-punches?${qs}`);

// Response.text() は UTF-8 BOM を除去して返すため、生バイトで BOM を検証する。
async function readCsv(res: Response): Promise<{ hasBom: boolean; lines: string[] }> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  return { hasBom, lines: text.replace(/^﻿/, "").split("\r\n") };
}

describe("CSV エクスポート Route Handler", () => {
  it("UTF-8 BOM 付きで、拠点TZの時刻・稼働時間・合計行を出力する（中抜け＝複数行）", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    fetchWorkerPunchesMock.mockResolvedValue([
      { id: "1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" },
      { id: "2", type: "CLOCK_OUT", occurredAt: "2026-08-25T03:00:00Z", businessDate: "2026-08-25" },
      { id: "3", type: "CLOCK_IN", occurredAt: "2026-08-25T04:00:00Z", businessDate: "2026-08-25" },
      { id: "4", type: "CLOCK_OUT", occurredAt: "2026-08-25T08:00:00Z", businessDate: "2026-08-25" },
    ]);

    const res = await GET(req("workerId=W1&from=2026-08-25&to=2026-08-25&timeZone=Asia%2FTokyo"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const csv = await readCsv(res);
    expect(csv.hasBom).toBe(true);
    expect(csv.lines).toEqual([
      "日付,出勤,退勤,稼働時間",
      "2026-08-25,09:00,12:00,3:00",
      "2026-08-25,13:00,17:00,4:00",
      "合計,,,7:00",
    ]);
    expect(fetchWorkerPunchesMock).toHaveBeenCalledWith("W1", "2026-08-25", "2026-08-25");
  });

  it("未退勤は「未退勤」と出力し、合計に含めない", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    fetchWorkerPunchesMock.mockResolvedValue([
      { id: "1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" },
    ]);
    const csv = await readCsv(
      await GET(req("workerId=W1&from=2026-08-25&to=2026-08-25&timeZone=Asia%2FTokyo")),
    );
    expect(csv.lines).toEqual([
      "日付,出勤,退勤,稼働時間",
      "2026-08-25,09:00,未退勤,",
      "合計,,,0:00",
    ]);
  });

  it("豪州の30分刻みTZ（Adelaide +9:30）で時刻を出力する", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    fetchWorkerPunchesMock.mockResolvedValue([
      { id: "1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" },
      { id: "2", type: "CLOCK_OUT", occurredAt: "2026-08-25T08:00:00Z", businessDate: "2026-08-25" },
    ]);
    const csv = await readCsv(
      await GET(req("workerId=W1&from=2026-08-25&to=2026-08-25&timeZone=Australia%2FAdelaide")),
    );
    expect(csv.lines[1]).toBe("2026-08-25,09:30,17:30,8:00");
  });

  it("日またぎのシフトは CLOCK_IN の businessDate の行に出る（実時間で計算）", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    fetchWorkerPunchesMock.mockResolvedValue([
      { id: "1", type: "CLOCK_IN", occurredAt: "2026-08-25T14:00:00Z", businessDate: "2026-08-25" }, // 23:00 JST
      { id: "2", type: "CLOCK_OUT", occurredAt: "2026-08-25T17:30:00Z", businessDate: "2026-08-26" }, // 02:30 JST
    ]);
    const csv = await readCsv(
      await GET(req("workerId=W1&from=2026-08-25&to=2026-08-26&timeZone=Asia%2FTokyo")),
    );
    expect(csv.lines).toEqual([
      "日付,出勤,退勤,稼働時間",
      "2026-08-25,23:00,02:30,3:30",
      "合計,,,3:30",
    ]);
  });

  it("打刻が無い期間はヘッダと 0:00 の合計行だけを出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    fetchWorkerPunchesMock.mockResolvedValue([]);
    const csv = await readCsv(await GET(req("workerId=W1&from=2026-08-25&to=2026-08-25")));
    expect(csv.lines).toEqual(["日付,出勤,退勤,稼働時間", "合計,,,0:00"]);
  });

  it("ファイル名に workerId と期間が入る", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    fetchWorkerPunchesMock.mockResolvedValue([]);
    const res = await GET(req("workerId=01ABC&from=2026-08-01&to=2026-08-31"));
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="worker-punches-01ABC-2026-08-01_2026-08-31.csv"',
    );
  });

  it.each([
    ["timeZone が不正", "workerId=W1&from=2026-08-25&to=2026-08-25&timeZone=Not%2FAZone"],
    ["日付形式が不正", "workerId=W1&from=2026%2F08%2F25&to=2026-08-25"],
    ["workerId に引用符（ヘッダ注入）", "workerId=W1%22%0D%0AX-Evil%3A1&from=2026-08-25&to=2026-08-25"],
  ])("%s は 400 で、データを引かない", async (_label, qs) => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    const res = await GET(req(qs));
    expect(res.status).toBe(400);
    expect(fetchWorkerPunchesMock).not.toHaveBeenCalled();
  });

  it("必須パラメータが欠けると 400", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    const res = await GET(req("workerId=W1"));
    expect(res.status).toBe(400);
    expect(fetchWorkerPunchesMock).not.toHaveBeenCalled();
  });

  it("未ログインはガードでリダイレクト（データは引かない）", async () => {
    requireEmployeeMock.mockImplementation((): never => {
      throw new Error("REDIRECT:/api/auth/login");
    });
    await expect(GET(req("workerId=W1&from=2026-08-25&to=2026-08-25"))).rejects.toThrow(
      "REDIRECT:/api/auth/login",
    );
    expect(fetchWorkerPunchesMock).not.toHaveBeenCalled();
  });
});
