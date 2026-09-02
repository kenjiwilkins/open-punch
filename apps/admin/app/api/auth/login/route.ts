import { NextResponse } from "next/server";
import { getAuthConfig } from "../../../../src/lib/auth/config";
import { generatePkce, randomState } from "../../../../src/lib/auth/pkce";
import { setLoginState } from "../../../../src/lib/auth/session";
import { authorizeUrl } from "../../../../src/lib/auth/urls";

// Hosted UI へリダイレクトしてログインを開始する。
export async function GET(request: Request) {
  const cfg = getAuthConfig();
  const { verifier, challenge } = generatePkce();
  const state = randomState();
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/";

  await setLoginState({ state, verifier, returnTo });

  return NextResponse.redirect(authorizeUrl(cfg, { state, codeChallenge: challenge }));
}
