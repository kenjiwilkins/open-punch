import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import type { Repositories } from "@open-punch/core";
import type { AuthEmployee, GraphQLContext } from "./builder";

export interface ContextDeps {
  repos: Repositories;
  /** キオスク API キーの期待値（ステージごとの Secret）。 */
  expectedApiKey: string;
  /** Cognito JWT を検証して社員を返す。無効なら reject する。 */
  verifyJwt: (token: string) => Promise<AuthEmployee>;
  /** サーバー時刻（テスト差し替え用）。 */
  now?: () => Date;
}

/**
 * リクエストヘッダから認証モードを判定して GraphQLContext を作る。
 * - `x-api-key` が Secret と一致 → apiKey（キオスク）
 * - `Authorization: Bearer <IdToken>` が検証成功 → cognito（社員）
 * - どちらも無ければ none（各 resolver で FORBIDDEN）
 * ヘッダは信用できない入力なので、キー比較は定数時間で行う。
 */
export async function buildContext(
  headers: Record<string, string | undefined>,
  deps: ContextDeps,
): Promise<GraphQLContext> {
  const now = deps.now ?? (() => new Date());
  const lower = lowerKeys(headers);

  const apiKey = lower["x-api-key"];
  if (apiKey && timingSafeEqualStr(apiKey, deps.expectedApiKey)) {
    return { authMode: "apiKey", repos: deps.repos, now };
  }

  const authorization = lower["authorization"];
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice("bearer ".length).trim();
    try {
      const employee = await deps.verifyJwt(token);
      return { authMode: "cognito", employee, repos: deps.repos, now };
    } catch {
      // 検証失敗は未認証扱い（各 resolver 側で拒否する）。
    }
  }

  return { authMode: "none", repos: deps.repos, now };
}

function lowerKeys(
  headers: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(headers)) {
    out[key.toLowerCase()] = headers[key];
  }
  return out;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return nodeTimingSafeEqual(ab, bb);
}
