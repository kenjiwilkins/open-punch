import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock, fetchLocationsMock, fetchWorkersByLocationMock, fetchWorkerPunchesMock } =
  vi.hoisted(() => ({
    requireEmployeeMock: vi.fn(),
    fetchLocationsMock: vi.fn(),
    fetchWorkersByLocationMock: vi.fn(),
    fetchWorkerPunchesMock: vi.fn(),
  }));
vi.mock("../../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../../src/lib/graphql-client", () => ({
  fetchLocations: fetchLocationsMock,
  fetchWorkersByLocation: fetchWorkersByLocationMock,
  fetchWorkerPunches: fetchWorkerPunchesMock,
}));

import ReportsPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const sp = (v: Record<string, string> = {}) => Promise.resolve(v);
const employee = { sub: "s", email: "boss@example.com" };
const locations = [{ id: "L1", name: "渋谷店", timeZone: "Asia/Tokyo" }];

describe("集計ページ", () => {
  it("拠点未選択なら選択を促し、何も引かない", async () => {
    requireEmployeeMock.mockResolvedValue(employee);
    fetchLocationsMock.mockResolvedValue(locations);
    render(await ReportsPage({ searchParams: sp() }));
    expect(screen.getByRole("status")).toHaveTextContent("拠点を選択");
    expect(fetchWorkersByLocationMock).not.toHaveBeenCalled();
    expect(fetchWorkerPunchesMock).not.toHaveBeenCalled();
  });

  it("拠点選択でアルバイト選択を出し、集計はまだ引かない", async () => {
    requireEmployeeMock.mockResolvedValue(employee);
    fetchLocationsMock.mockResolvedValue(locations);
    fetchWorkersByLocationMock.mockResolvedValue([{ id: "W1", displayName: "山田" }]);
    render(await ReportsPage({ searchParams: sp({ location: "L1" }) }));
    expect(screen.getByRole("link", { name: "山田" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("アルバイトを選択");
    expect(fetchWorkerPunchesMock).not.toHaveBeenCalled();
  });

  it("アルバイト選択で期間の打刻を引き、拠点TZで日別集計とCSVリンクを出す", async () => {
    requireEmployeeMock.mockResolvedValue(employee);
    fetchLocationsMock.mockResolvedValue(locations);
    fetchWorkersByLocationMock.mockResolvedValue([{ id: "W1", displayName: "山田" }]);
    fetchWorkerPunchesMock.mockResolvedValue([
      { id: "P2", type: "CLOCK_OUT", occurredAt: "2026-08-25T08:30:00Z", businessDate: "2026-08-25" },
      { id: "P1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", businessDate: "2026-08-25" },
    ]); // 順不同で返ってきても昇順に直して集計する

    render(
      await ReportsPage({
        searchParams: sp({ location: "L1", workerId: "W1", from: "2026-08-01", to: "2026-08-31" }),
      }),
    );

    expect(fetchWorkerPunchesMock).toHaveBeenCalledWith("W1", "2026-08-01", "2026-08-31");
    expect(screen.getByText("09:00")).toBeInTheDocument(); // 00:00Z = 09:00 JST
    expect(screen.getByText("17:30")).toBeInTheDocument();
    expect(screen.getAllByText("8:30")).toHaveLength(3); // 期間の稼働・日別合計・期間合計
    expect(screen.getByRole("link", { name: "CSVダウンロード" })).toHaveAttribute(
      "href",
      "/api/reports/worker-punches?workerId=W1&from=2026-08-01&to=2026-08-31&timeZone=Asia%2FTokyo",
    );
  });

  it("未ログインはガードでリダイレクト", async () => {
    requireEmployeeMock.mockImplementation((): never => {
      throw new Error("REDIRECT:/api/auth/login");
    });
    await expect(ReportsPage({ searchParams: sp() })).rejects.toThrow("REDIRECT:/api/auth/login");
  });
});
