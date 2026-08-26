import SchemaBuilder from "@pothos/core";
import { GraphQLError } from "graphql";
import type { Repositories } from "@open-punch/core";

/** Cognito で認証された社員（JWT から取り出す）。 */
export interface AuthEmployee {
  sub: string;
  email: string;
}

/** 認証モード。docs/02-architecture.md の2モード + 未認証。 */
export type AuthMode = "apiKey" | "cognito" | "none";

export interface GraphQLContext {
  authMode: AuthMode;
  employee?: AuthEmployee;
  repos: Repositories;
  /** サーバー時刻。打刻時刻はここから取る（テストで差し替え可能）。 */
  now: () => Date;
}

export const builder = new SchemaBuilder<{ Context: GraphQLContext }>({});

// --- 認可ヘルパ（docs/04-graphql-schema.md のオペレーション表を強制） -----------

/** 社員（Cognito）を要求する。満たさなければ FORBIDDEN。 */
export function requireEmployee(ctx: GraphQLContext): AuthEmployee {
  if (ctx.authMode !== "cognito" || !ctx.employee) {
    throw new GraphQLError("この操作には社員（Cognito）認証が必要です", {
      extensions: { code: "FORBIDDEN" },
    });
  }
  return ctx.employee;
}

/** キオスク（API キー）を要求する。公開オペレーション（workers/workerStatus/punch）専用。 */
export function requireKiosk(ctx: GraphQLContext): void {
  if (ctx.authMode !== "apiKey") {
    throw new GraphQLError("この操作にはキオスク API キーが必要です", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}
