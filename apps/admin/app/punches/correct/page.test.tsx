import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock } = vi.hoisted(() => ({ requireEmployeeMock: vi.fn() }));
vi.mock("../../../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../../../src/lib/graphql-client", () => ({ correctPunch: vi.fn() }));

import CorrectPunchPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("打刻補正ページ", () => {
  it("必要なクエリが揃っていればフォームを出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    render(
      await CorrectPunchPage({
        searchParams: Promise.resolve({
          workerId: "W1",
          id: "P1",
          occurredAt: "2026-08-25T00:01:00Z",
          type: "CLOCK_IN",
          location: "L1",
          workerName: "山田",
        }),
      }),
    );
    expect(screen.getByText(/山田/)).toBeInTheDocument();
    expect(screen.getByLabelText("補正後の時刻（UTC, ISO8601）")).toHaveValue("2026-08-25T00:01:00Z");
  });

  it("クエリが欠けていれば案内を出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    render(await CorrectPunchPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent("補正対象が指定されていません");
  });

  it("未ログインはガードでリダイレクト", async () => {
    requireEmployeeMock.mockImplementation((): never => {
      throw new Error("REDIRECT:/api/auth/login");
    });
    await expect(
      CorrectPunchPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/api/auth/login");
  });
});
