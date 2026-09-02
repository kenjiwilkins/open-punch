import { type AuthConfig, tokenEndpoint } from "./urls";

export interface TokenResponse {
  id_token: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

/**
 * 認可コードを Cognito の token エンドポイントで交換する（PKCE）。
 * fetch を使うだけなので、テストでは global fetch をモックする。
 */
export async function exchangeCodeForTokens(
  cfg: AuthConfig,
  params: { code: string; codeVerifier: string },
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    code: params.code,
    redirect_uri: cfg.redirectUri,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(tokenEndpoint(cfg), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status}`);
  }

  const json = (await res.json()) as Partial<TokenResponse>;
  if (!json.id_token) {
    throw new Error("token response に id_token がありません");
  }
  return json as TokenResponse;
}
