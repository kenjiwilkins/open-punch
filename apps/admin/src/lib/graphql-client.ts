import "server-only";
import { GraphQLClient } from "graphql-request";
import { getSessionToken } from "./auth/session";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing env: ${name}`);
  return value;
}

/**
 * IdToken を Authorization: Bearer に載せた GraphQL クライアント（サーバー専用）。
 * オペレーションは #17 以降で codegen して利用する。
 */
export async function createAdminGraphQLClient(idToken?: string): Promise<GraphQLClient> {
  const url = requireEnv("GRAPHQL_URL");
  const token = idToken ?? (await getSessionToken());
  if (!token) throw new Error("未認証: セッションがありません");
  return new GraphQLClient(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
