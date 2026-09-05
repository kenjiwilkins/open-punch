import { afterEach, describe, expect, it, vi } from "vitest";

const { getSessionTokenMock, verifyMock, redirectMock } = vi.hoisted(() => ({
  getSessionTokenMock: vi.fn(),
  verifyMock: vi.fn(),
  redirectMock: vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("./session", () => ({ getSessionToken: getSessionTokenMock }));
vi.mock("./config", () => ({ getAuthConfig: () => ({ userPoolId: "pool", clientId: "client" }) }));
vi.mock("./verify", () => ({ createIdTokenVerifier: () => verifyMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { getEmployee, requireEmployee } from "./guard";

afterEach(() => vi.clearAllMocks());

describe("認証ガード", () => {
  it("有効なトークンで employee を返す", async () => {
    getSessionTokenMock.mockResolvedValue("tok");
    verifyMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    expect(await getEmployee()).toEqual({ sub: "s", email: "e@example.com" });
  });

  it("トークン無しは null", async () => {
    getSessionTokenMock.mockResolvedValue(undefined);
    expect(await getEmployee()).toBeNull();
  });

  it("検証失敗は null", async () => {
    getSessionTokenMock.mockResolvedValue("bad");
    verifyMock.mockRejectedValue(new Error("invalid"));
    expect(await getEmployee()).toBeNull();
  });

  it("requireEmployee は未ログインでログインへリダイレクト", async () => {
    getSessionTokenMock.mockResolvedValue(undefined);
    await expect(requireEmployee()).rejects.toThrow("REDIRECT:/api/auth/login");
    expect(redirectMock).toHaveBeenCalledWith("/api/auth/login");
  });

  it("requireEmployee はログイン済みで employee を返す", async () => {
    getSessionTokenMock.mockResolvedValue("tok");
    verifyMock.mockResolvedValue({ sub: "s", email: "e@example.com" });
    expect(await requireEmployee()).toEqual({ sub: "s", email: "e@example.com" });
  });
});
