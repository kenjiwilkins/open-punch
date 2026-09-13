import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock, fetchWorkersByLocationMock } = vi.hoisted(() => ({
  requireEmployeeMock: vi.fn(),
  fetchWorkersByLocationMock: vi.fn(),
}));
vi.mock("../../../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../../../src/lib/graphql-client", () => ({
  fetchWorkersByLocation: fetchWorkersByLocationMock,
  createManualPunch: vi.fn(),
}));

import ManualPunchPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("打刻手動追加ページ", () => {
  it("拠点の有効なアルバイトを選択肢に出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchWorkersByLocationMock.mockResolvedValue([{ id: "W1", displayName: "山田" }]);
    render(await ManualPunchPage({ searchParams: Promise.resolve({ location: "L1" }) }));
    expect(fetchWorkersByLocationMock).toHaveBeenCalledWith("L1");
    expect(screen.getByRole("option", { name: "山田" })).toBeInTheDocument();
  });

  it("拠点にアルバイトがいなければ案内を出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchWorkersByLocationMock.mockResolvedValue([]);
    render(await ManualPunchPage({ searchParams: Promise.resolve({ location: "L1" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("有効なアルバイトがいません");
  });

  it("拠点が指定されていなければ案内を出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    render(await ManualPunchPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent("拠点が指定されていません");
    expect(fetchWorkersByLocationMock).not.toHaveBeenCalled();
  });

  it("未ログインはガードでリダイレクト", async () => {
    requireEmployeeMock.mockImplementation((): never => {
      throw new Error("REDIRECT:/api/auth/login");
    });
    await expect(
      ManualPunchPage({ searchParams: Promise.resolve({ location: "L1" }) }),
    ).rejects.toThrow("REDIRECT:/api/auth/login");
  });
});
