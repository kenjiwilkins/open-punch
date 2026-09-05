import { describe, expect, it } from "vitest";
import { type AuthConfig, authorizeUrl, logoutUrl, tokenEndpoint } from "./urls";

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

describe("auth urls", () => {
  it("authorizeUrl は認可コード + PKCE パラメータを持つ", () => {
    const u = new URL(authorizeUrl(cfg, { state: "st", codeChallenge: "ch" }));
    expect(u.origin + u.pathname).toBe(`${cfg.domain}/oauth2/authorize`);
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("client_id")).toBe("client123");
    expect(u.searchParams.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.get("code_challenge")).toBe("ch");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("logoutUrl は client_id と logout_uri を持つ", () => {
    const u = new URL(logoutUrl(cfg));
    expect(u.origin + u.pathname).toBe(`${cfg.domain}/logout`);
    expect(u.searchParams.get("client_id")).toBe("client123");
    expect(u.searchParams.get("logout_uri")).toBe(cfg.logoutRedirectUri);
  });

  it("tokenEndpoint", () => {
    expect(tokenEndpoint(cfg)).toBe(`${cfg.domain}/oauth2/token`);
  });
});
