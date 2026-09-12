import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requireEmployeeMock, fetchAdminLocationsMock } = vi.hoisted(() => ({
  requireEmployeeMock: vi.fn(),
  fetchAdminLocationsMock: vi.fn(),
}));
vi.mock("../../src/lib/auth/guard", () => ({ requireEmployee: requireEmployeeMock }));
vi.mock("../../src/lib/graphql-client", () => ({
  fetchAdminLocations: fetchAdminLocationsMock,
  fetchWorkersByLocation: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  createWorker: vi.fn(),
  updateWorker: vi.fn(),
  deactivateWorker: vi.fn(),
}));

import LocationsPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("拠点ページ", () => {
  it("拠点一覧・編集リンク・作成フォームを表示する", async () => {
    requireEmployeeMock.mockResolvedValue({ sub: "s", email: "boss@example.com" });
    fetchAdminLocationsMock.mockResolvedValue([
      { id: "L1", name: "渋谷店", timeZone: "Asia/Tokyo", businessDayCutoffHour: 0, country: "JP", active: true },
    ]);

    render(await LocationsPage());

    expect(screen.getByText("渋谷店")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute("href", "/locations/L1/edit");
    // 作成フォーム
    expect(screen.getByLabelText("拠点名")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("未ログインはガードでログインへリダイレクト", async () => {
    requireEmployeeMock.mockImplementation((): never => {
      throw new Error("REDIRECT:/api/auth/login");
    });
    await expect(LocationsPage()).rejects.toThrow("REDIRECT:/api/auth/login");
  });
});
