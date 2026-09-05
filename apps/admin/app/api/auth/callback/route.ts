import { NextResponse } from "next/server";
import { type AuthConfig } from "../../../../src/lib/auth/urls";
import { getAuthConfig } from "../../../../src/lib/auth/config";
import { setSession, takeLoginState } from "../../../../src/lib/auth/session";
import { exchangeCodeForTokens } from "../../../../src/lib/auth/token-exchange";
import { createIdTokenVerifier } from "../../../../src/lib/auth/verify";

function loginError(cfg: AuthConfig, reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${reason}`, cfg.adminUrl));
}

// Hosted UI からのコールバック。code を交換し、IdToken を検証してセッションを張る。
export async function GET(request: Request) {
  const cfg = getAuthConfig();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const login = await takeLoginState();

  // state（CSRF 対策）を検証
  if (!code || !state || !login || login.state !== state) {
    return loginError(cfg, "invalid_state");
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(cfg, { code, codeVerifier: login.verifier });
  } catch {
    return loginError(cfg, "token_exchange");
  }

  try {
    await createIdTokenVerifier(cfg.userPoolId, cfg.clientId)(tokens.id_token);
  } catch {
    return loginError(cfg, "verify");
  }

  await setSession(tokens.id_token, tokens.expires_in ?? 3600);
  return NextResponse.redirect(new URL(login.returnTo || "/", cfg.adminUrl));
}
