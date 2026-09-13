import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchWorkersMock = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/kiosk-client", () => ({ fetchWorkers: fetchWorkersMock }));

import Page from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ホーム（名前一覧）", () => {
  it("有効なワーカーを一覧表示する", async () => {
    // スキーマが non-null 化された（#32）ので必須項目は常に揃う。
    fetchWorkersMock.mockResolvedValue([
      { id: "W1", displayName: "山田", nameKana: "やまだ" },
      { id: "W2", displayName: "鈴木", nameKana: "すずき" },
    ]);
    render(await Page());
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByText("鈴木")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("取得失敗時はエラーを表示する", async () => {
    fetchWorkersMock.mockRejectedValue(new Error("down"));
    render(await Page());
    expect(screen.getByRole("alert")).toHaveTextContent("down");
  });
});
