import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock, fetchAdminLocationsMock, fetchWorkersByLocationMock } = vi.hoisted(
  () => ({
    requireEmployeeMock: vi.fn(),
    fetchAdminLocationsMock: vi.fn(),
    fetchWorkersByLocationMock: vi.fn(),
  }),
);
vi.mock("../../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../../src/lib/graphql-client", () => ({
  fetchAdminLocations: fetchAdminLocationsMock,
  fetchWorkersByLocation: fetchWorkersByLocationMock,
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  createWorker: vi.fn(),
  updateWorker: vi.fn(),
  deactivateWorker: vi.fn(),
}));

import WorkersPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const sp = (location?: string) => Promise.resolve(location ? { location } : {});

describe("アルバイトページ", () => {
  it("拠点未選択なら選択を促し、一覧は引かない", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchAdminLocationsMock.mockResolvedValue([{ id: "L1", name: "渋谷店" }]);

    render(await WorkersPage({ searchParams: sp() }));

    expect(screen.getByRole("status")).toHaveTextContent("拠点を選択");
    expect(fetchWorkersByLocationMock).not.toHaveBeenCalled();
  });

  it("拠点選択で有効ワーカー一覧・編集リンク・退職ボタン・作成フォームを出す", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchAdminLocationsMock.mockResolvedValue([{ id: "L1", name: "渋谷店" }]);
    fetchWorkersByLocationMock.mockResolvedValue([
      { id: "W1", name: "山田 太郎", displayName: "山田", nameKana: "やまだ", active: true },
    ]);

    render(await WorkersPage({ searchParams: sp("L1") }));

    expect(fetchWorkersByLocationMock).toHaveBeenCalledWith("L1");
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute(
      "href",
      "/workers/W1/edit?location=L1",
    );
    expect(screen.getByRole("button", { name: "退職" })).toBeInTheDocument();
    expect(screen.getByLabelText("氏名")).toBeInTheDocument(); // 作成フォーム
  });

  it("未ログインはガードでリダイレクト", async () => {
    requireEmployeeMock.mockImplementation((): never => {
      throw new Error("REDIRECT:/api/auth/login");
    });
    await expect(WorkersPage({ searchParams: sp("L1") })).rejects.toThrow("REDIRECT:/api/auth/login");
  });
});
