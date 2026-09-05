import "server-only";
import { GraphQLClient } from "graphql-request";
import { LocationsQuery, PunchesByDateQuery } from "../graphql/operations";
import { getSessionToken } from "./auth/session";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing env: ${name}`);
  return value;
}

/**
 * IdToken を Authorization: Bearer に載せた GraphQL クライアント（サーバー専用）。
 */
export async function createAdminGraphQLClient(idToken?: string): Promise<GraphQLClient> {
  const url = requireEnv("GRAPHQL_URL");
  const token = idToken ?? (await getSessionToken());
  if (!token) throw new Error("未認証: セッションがありません");
  return new GraphQLClient(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchLocations() {
  const client = await createAdminGraphQLClient();
  const data = await client.request(LocationsQuery);
  return data.locations ?? [];
}

export async function fetchPunchesByDate(locationId: string, businessDate?: string) {
  const client = await createAdminGraphQLClient();
  const data = await client.request(PunchesByDateQuery, {
    locationId,
    businessDate: businessDate ?? null,
  });
  return data.punchesByDate ?? [];
}
