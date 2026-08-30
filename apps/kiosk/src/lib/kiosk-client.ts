import "server-only";
import { GraphQLClient } from "graphql-request";
import { PunchMutation, WorkerStatusQuery, WorkersQuery } from "../graphql/operations";
import type { PunchType } from "../gql/graphql";
import { type KioskConfig, getKioskConfig } from "./config";

// x-api-key を注入した graphql-request クライアントを作る。サーバー専用。
export function createKioskClient(config: KioskConfig = getKioskConfig()): GraphQLClient {
  return new GraphQLClient(config.graphqlUrl, {
    headers: { "x-api-key": config.apiKey },
  });
}

// 拠点は kiosk 設定（KIOSK_LOCATION_ID）から解決する。呼び出し側は locationId を渡さない。
export async function fetchWorkers() {
  const config = getKioskConfig();
  const client = createKioskClient(config);
  const data = await client.request(WorkersQuery, { locationId: config.locationId });
  return data.workers ?? [];
}

export async function fetchWorkerStatus(workerId: string) {
  const data = await createKioskClient().request(WorkerStatusQuery, { workerId });
  return data.workerStatus;
}

export async function punch(workerId: string, type: PunchType) {
  const data = await createKioskClient().request(PunchMutation, { workerId, type });
  return data.punch;
}
