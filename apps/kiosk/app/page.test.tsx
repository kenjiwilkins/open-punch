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
  it("有効なワーカーを表示し、必須項目が欠けるものは除外する", async () => {
    fetchWorkersMock.mockResolvedValue([
      { id: "W1", displayName: "山田", nameKana: "やまだ" },
      { id: null, displayName: "壊れ", nameKana: null }, // id 欠け → 除外
      { id: "W2", displayName: null, nameKana: "すずき" }, // displayName 欠け → 除外
    ]);
    render(await Page());
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.queryByText("壊れ")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("取得失敗時はエラーを表示する", async () => {
    fetchWorkersMock.mockRejectedValue(new Error("down"));
    render(await Page());
    expect(screen.getByRole("alert")).toHaveTextContent("down");
  });
});
