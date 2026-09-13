import "server-only";
import { GraphQLClient } from "graphql-request";
import type {
  CorrectPunchInput,
  LocationCreateInput,
  LocationUpdateInput,
  ManualPunchInput,
  WorkerCreateInput,
  WorkerUpdateInput,
} from "../gql/graphql";
import {
  AdminLocationsQuery,
  CorrectPunchMutation,
  CreateLocationMutation,
  CreateManualPunchMutation,
  CreateWorkerMutation,
  DeactivateWorkerMutation,
  LocationsQuery,
  PunchesByDateQuery,
  UpdateLocationMutation,
  UpdateWorkerMutation,
  WorkersByLocationQuery,
} from "../graphql/operations";
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

// --- CRUD ---------------------------------------------------------------------

export async function fetchAdminLocations() {
  const client = await createAdminGraphQLClient();
  return (await client.request(AdminLocationsQuery)).locations ?? [];
}

export async function fetchWorkersByLocation(locationId: string) {
  const client = await createAdminGraphQLClient();
  return (await client.request(WorkersByLocationQuery, { locationId })).workersByLocation ?? [];
}

export async function createWorker(input: WorkerCreateInput) {
  const client = await createAdminGraphQLClient();
  return (await client.request(CreateWorkerMutation, { input })).createWorker;
}

export async function updateWorker(workerId: string, input: WorkerUpdateInput) {
  const client = await createAdminGraphQLClient();
  return (await client.request(UpdateWorkerMutation, { workerId, input })).updateWorker;
}

export async function deactivateWorker(workerId: string) {
  const client = await createAdminGraphQLClient();
  return (await client.request(DeactivateWorkerMutation, { workerId })).deactivateWorker;
}

export async function createLocation(input: LocationCreateInput) {
  const client = await createAdminGraphQLClient();
  return (await client.request(CreateLocationMutation, { input })).createLocation;
}

export async function updateLocation(locationId: string, input: LocationUpdateInput) {
  const client = await createAdminGraphQLClient();
  return (await client.request(UpdateLocationMutation, { locationId, input })).updateLocation;
}

export async function correctPunch(
  workerId: string,
  id: string,
  occurredAt: string,
  input: CorrectPunchInput,
) {
  const client = await createAdminGraphQLClient();
  return (await client.request(CorrectPunchMutation, { workerId, id, occurredAt, input }))
    .correctPunch;
}

export async function createManualPunch(input: ManualPunchInput) {
  const client = await createAdminGraphQLClient();
  return (await client.request(CreateManualPunchMutation, { input })).createManualPunch;
}
