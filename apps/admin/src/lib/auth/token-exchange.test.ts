import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeCodeForTokens } from "./token-exchange";
import type { AuthConfig } from "./urls";

const cfg: AuthConfig = {
  domain: "https://d.auth.ap-northeast-1.amazoncognito.com",
  clientId: "client123",
  userPoolId: "pool",
  region: "ap-northeast-1",
  adminUrl: "https://admin.example",
  redirectUri: "https://admin.example/api/auth/callback",
  logoutRedirectUri: "https://admin.example",
  scopes: ["openid", "email", "profile"],
};

afterEach(() => vi.restoreAllMocks());

describe("exchangeCodeForTokens", () => {
  it("成功で tokens を返し、PKCE の body を送る", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id_token: "idt", expires_in: 3600 }), { status: 200 }),
      );

    const tokens = await exchangeCodeForTokens(cfg, { code: "the-code", codeVerifier: "the-verifier" });
    expect(tokens.id_token).toBe("idt");

    const [urlArg, init] = fetchMock.mock.calls[0]!;
    expect(urlArg).toBe(`${cfg.domain}/oauth2/token`);
    const body = (init as RequestInit).body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe("client123");
    expect(body.get("code")).toBe("the-code");
    expect(body.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(body.get("code_verifier")).toBe("the-verifier");
  });

  it("HTTP エラーは throw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad", { status: 400 }));
    await expect(
      exchangeCodeForTokens(cfg, { code: "c", codeVerifier: "v" }),
    ).rejects.toThrow();
  });

  it("id_token 欠如は throw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "a" }), { status: 200 }),
    );
    await expect(
      exchangeCodeForTokens(cfg, { code: "c", codeVerifier: "v" }),
    ).rejects.toThrow();
  });
});
