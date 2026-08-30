import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PunchType, WorkerStatus } from "../gql/graphql";
import type { PunchResult } from "../lib/actions";
import { PunchPanel } from "./punch-panel";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setup(
  status: WorkerStatus,
  onPunch: (w: string, t: PunchType) => Promise<PunchResult> = vi
    .fn()
    .mockResolvedValue({ ok: true }),
) {
  render(
    <PunchPanel workerId="W1" displayName="山田" initialStatus={status} onPunch={onPunch} />,
  );
  return { onPunch };
}

describe("PunchPanel", () => {
  it("未出勤なら「出勤」ボタンで CLOCK_IN を送り、完了表示になる", async () => {
    const { onPunch } = setup(WorkerStatus.NotClockedIn);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "出勤" }));
    });
    expect(onPunch).toHaveBeenCalledWith("W1", PunchType.ClockIn);
    expect(screen.getByText("出勤しました")).toBeInTheDocument();
  });

  it("勤務中なら「退勤」ボタンで CLOCK_OUT を送る", async () => {
    const { onPunch } = setup(WorkerStatus.Working);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "退勤" }));
    });
    expect(onPunch).toHaveBeenCalledWith("W1", PunchType.ClockOut);
    expect(screen.getByText("退勤しました")).toBeInTheDocument();
  });

  it("連打してもクールダウンで1回しか送らない", async () => {
    let resolve!: (v: PunchResult) => void;
    const onPunch = vi.fn(() => new Promise<PunchResult>((r) => (resolve = r)));
    setup(WorkerStatus.NotClockedIn, onPunch);
    const btn = screen.getByRole("button", { name: "出勤" });
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    expect(onPunch).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ ok: true });
    });
  });

  it("完了後、一定時間で一覧へ自動的に戻る", async () => {
    vi.useFakeTimers();
    try {
      setup(WorkerStatus.NotClockedIn);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "出勤" }));
      });
      expect(screen.getByText("出勤しました")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(pushMock).toHaveBeenCalledWith("/");
    } finally {
      vi.useRealTimers();
    }
  });

  it("失敗時はエラーを表示し、再試行できるようロックを解放する", async () => {
    const onPunch = vi
      .fn<(w: string, t: PunchType) => Promise<PunchResult>>()
      .mockResolvedValueOnce({ ok: false, message: "network" })
      .mockResolvedValueOnce({ ok: true });
    setup(WorkerStatus.NotClockedIn, onPunch);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "出勤" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("network");
    // 再試行できる
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "出勤" }));
    });
    expect(onPunch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("出勤しました")).toBeInTheDocument();
  });
});
