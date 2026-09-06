import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock, fetchLocationsMock, fetchPunchesByDateMock } = vi.hoisted(() => ({
  requireEmployeeMock: vi.fn(),
  fetchLocationsMock: vi.fn(),
  fetchPunchesByDateMock: vi.fn(),
}));
vi.mock("../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../src/lib/graphql-client", () => ({
  fetchLocations: fetchLocationsMock,
  fetchPunchesByDate: fetchPunchesByDateMock,
}));

import Page from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const searchParams = (location?: string) => Promise.resolve(location ? { location } : {});

describe("admin ホーム（当日一覧）", () => {
  it("拠点未選択: ログイン中の社員と拠点リンクを出す（一覧は引かない）", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchLocationsMock.mockResolvedValue([{ id: "L1", name: "渋谷店", timeZone: "Asia/Tokyo" }]);

    render(await Page({ searchParams: searchParams() }));

    expect(screen.getByText(/boss@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "渋谷店" })).toBeInTheDocument();
    expect(fetchPunchesByDateMock).not.toHaveBeenCalled();
  });

  it("拠点選択: punchesByDate を引き、拠点TZ時刻で一覧表示", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchLocationsMock.mockResolvedValue([{ id: "L1", name: "渋谷店", timeZone: "Asia/Tokyo" }]);
    fetchPunchesByDateMock.mockResolvedValue([
      {
        id: "P1",
        type: "CLOCK_IN",
        occurredAt: "2026-08-25T00:30:00Z",
        timeZone: "Asia/Tokyo",
        worker: { displayName: "山田" },
      },
    ]);

    render(await Page({ searchParams: searchParams("L1") }));

    expect(fetchPunchesByDateMock).toHaveBeenCalledWith("L1");
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
  });
});
