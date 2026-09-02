// Cognito Hosted UI / OAuth2 エンドポイントの URL 組み立て（純粋関数・server 非依存）。

export interface AuthConfig {
  /** Hosted UI ドメイン（例: https://xxx.auth.ap-northeast-1.amazoncognito.com）。末尾スラッシュ無し。 */
  domain: string;
  clientId: string;
  userPoolId: string;
  region: string;
  /** admin のベース URL（末尾スラッシュ無し）。 */
  adminUrl: string;
  /** OAuth コールバック URL（Cognito に登録する値と一致させる）。 */
  redirectUri: string;
  /** ログアウト後の戻り先。 */
  logoutRedirectUri: string;
  scopes: string[];
}

export function authorizeUrl(
  cfg: AuthConfig,
  params: { state: string; codeChallenge: string },
): string {
  const url = new URL(`${cfg.domain}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("scope", cfg.scopes.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function tokenEndpoint(cfg: AuthConfig): string {
  return `${cfg.domain}/oauth2/token`;
}

export function logoutUrl(cfg: AuthConfig): string {
  const url = new URL(`${cfg.domain}/logout`);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("logout_uri", cfg.logoutRedirectUri);
  return url.toString();
}
