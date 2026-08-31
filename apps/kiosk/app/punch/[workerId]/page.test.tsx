import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { pushMock, fetchWorkerStatusMock, submitPunchMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  fetchWorkerStatusMock: vi.fn(),
  submitPunchMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));
vi.mock("../../../src/lib/kiosk-client", () => ({ fetchWorkerStatus: fetchWorkerStatusMock }));
vi.mock("../../../src/lib/actions", () => ({ submitPunch: submitPunchMock }));

import PunchPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const params = (workerId: string) => Promise.resolve({ workerId });
const search = (name?: string) => Promise.resolve(name ? { name } : {});

describe("打刻ページ（フロー統合・GraphQL モック）", () => {
  it("WORKING は退勤ボタン→押下で punch 実行→完了表示", async () => {
    fetchWorkerStatusMock.mockResolvedValue({ workerId: "W1", status: "WORKING", lastPunchAt: null });
    submitPunchMock.mockResolvedValue({ ok: true });

    render(await PunchPage({ params: params("W1"), searchParams: search("山田") }));
    expect(screen.getByText("山田")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "退勤" }));
    });
    expect(submitPunchMock).toHaveBeenCalledWith("W1", expect.anything());
    expect(screen.getByText("退勤しました")).toBeInTheDocument();
  });

  it("NOT_CLOCKED_IN は出勤ボタンを出す", async () => {
    fetchWorkerStatusMock.mockResolvedValue({
      workerId: "W1",
      status: "NOT_CLOCKED_IN",
      lastPunchAt: null,
    });
    render(await PunchPage({ params: params("W1"), searchParams: search() }));
    expect(screen.getByRole("button", { name: "出勤" })).toBeInTheDocument();
  });

  it("状態取得に失敗したらエラーを表示", async () => {
    fetchWorkerStatusMock.mockRejectedValue(new Error("nope"));
    render(await PunchPage({ params: params("W1"), searchParams: search() }));
    expect(screen.getByRole("alert")).toHaveTextContent("nope");
  });
});
