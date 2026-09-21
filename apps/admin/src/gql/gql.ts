/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Locations {\n    locations {\n      id\n      name\n      timeZone\n    }\n  }\n": typeof types.LocationsDocument,
    "\n  query AdminLocations {\n    locations {\n      id\n      name\n      timeZone\n      businessDayCutoffHour\n      country\n      active\n    }\n  }\n": typeof types.AdminLocationsDocument,
    "\n  query WorkersByLocation($locationId: String!) {\n    workersByLocation(locationId: $locationId) {\n      id\n      name\n      displayName\n      nameKana\n      active\n    }\n  }\n": typeof types.WorkersByLocationDocument,
    "\n  mutation CreateWorker($input: WorkerCreateInput!) {\n    createWorker(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateWorkerDocument,
    "\n  mutation UpdateWorker($workerId: String!, $input: WorkerUpdateInput!) {\n    updateWorker(workerId: $workerId, input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateWorkerDocument,
    "\n  mutation DeactivateWorker($workerId: String!) {\n    deactivateWorker(workerId: $workerId) {\n      id\n      active\n    }\n  }\n": typeof types.DeactivateWorkerDocument,
    "\n  mutation CreateLocation($input: LocationCreateInput!) {\n    createLocation(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateLocationDocument,
    "\n  mutation UpdateLocation($locationId: String!, $input: LocationUpdateInput!) {\n    updateLocation(locationId: $locationId, input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateLocationDocument,
    "\n  query PunchesByDate($locationId: String!, $businessDate: String) {\n    punchesByDate(locationId: $locationId, businessDate: $businessDate) {\n      id\n      workerId\n      type\n      occurredAt\n      timeZone\n      worker {\n        displayName\n      }\n    }\n  }\n": typeof types.PunchesByDateDocument,
    "\n  mutation CorrectPunch(\n    $workerId: String!\n    $id: String!\n    $occurredAt: String!\n    $input: CorrectPunchInput!\n  ) {\n    correctPunch(workerId: $workerId, id: $id, occurredAt: $occurredAt, input: $input) {\n      id\n    }\n  }\n": typeof types.CorrectPunchDocument,
    "\n  mutation CreateManualPunch($input: ManualPunchInput!) {\n    createManualPunch(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateManualPunchDocument,
};
const documents: Documents = {
    "\n  query Locations {\n    locations {\n      id\n      name\n      timeZone\n    }\n  }\n": types.LocationsDocument,
    "\n  query AdminLocations {\n    locations {\n      id\n      name\n      timeZone\n      businessDayCutoffHour\n      country\n      active\n    }\n  }\n": types.AdminLocationsDocument,
    "\n  query WorkersByLocation($locationId: String!) {\n    workersByLocation(locationId: $locationId) {\n      id\n      name\n      displayName\n      nameKana\n      active\n    }\n  }\n": types.WorkersByLocationDocument,
    "\n  mutation CreateWorker($input: WorkerCreateInput!) {\n    createWorker(input: $input) {\n      id\n    }\n  }\n": types.CreateWorkerDocument,
    "\n  mutation UpdateWorker($workerId: String!, $input: WorkerUpdateInput!) {\n    updateWorker(workerId: $workerId, input: $input) {\n      id\n    }\n  }\n": types.UpdateWorkerDocument,
    "\n  mutation DeactivateWorker($workerId: String!) {\n    deactivateWorker(workerId: $workerId) {\n      id\n      active\n    }\n  }\n": types.DeactivateWorkerDocument,
    "\n  mutation CreateLocation($input: LocationCreateInput!) {\n    createLocation(input: $input) {\n      id\n    }\n  }\n": types.CreateLocationDocument,
    "\n  mutation UpdateLocation($locationId: String!, $input: LocationUpdateInput!) {\n    updateLocation(locationId: $locationId, input: $input) {\n      id\n    }\n  }\n": types.UpdateLocationDocument,
    "\n  query PunchesByDate($locationId: String!, $businessDate: String) {\n    punchesByDate(locationId: $locationId, businessDate: $businessDate) {\n      id\n      workerId\n      type\n      occurredAt\n      timeZone\n      worker {\n        displayName\n      }\n    }\n  }\n": types.PunchesByDateDocument,
    "\n  mutation CorrectPunch(\n    $workerId: String!\n    $id: String!\n    $occurredAt: String!\n    $input: CorrectPunchInput!\n  ) {\n    correctPunch(workerId: $workerId, id: $id, occurredAt: $occurredAt, input: $input) {\n      id\n    }\n  }\n": types.CorrectPunchDocument,
    "\n  mutation CreateManualPunch($input: ManualPunchInput!) {\n    createManualPunch(input: $input) {\n      id\n    }\n  }\n": types.CreateManualPunchDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Locations {\n    locations {\n      id\n      name\n      timeZone\n    }\n  }\n"): (typeof documents)["\n  query Locations {\n    locations {\n      id\n      name\n      timeZone\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminLocations {\n    locations {\n      id\n      name\n      timeZone\n      businessDayCutoffHour\n      country\n      active\n    }\n  }\n"): (typeof documents)["\n  query AdminLocations {\n    locations {\n      id\n      name\n      timeZone\n      businessDayCutoffHour\n      country\n      active\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query WorkersByLocation($locationId: String!) {\n    workersByLocation(locationId: $locationId) {\n      id\n      name\n      displayName\n      nameKana\n      active\n    }\n  }\n"): (typeof documents)["\n  query WorkersByLocation($locationId: String!) {\n    workersByLocation(locationId: $locationId) {\n      id\n      name\n      displayName\n      nameKana\n      active\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorker($input: WorkerCreateInput!) {\n    createWorker(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorker($input: WorkerCreateInput!) {\n    createWorker(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateWorker($workerId: String!, $input: WorkerUpdateInput!) {\n    updateWorker(workerId: $workerId, input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateWorker($workerId: String!, $input: WorkerUpdateInput!) {\n    updateWorker(workerId: $workerId, input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeactivateWorker($workerId: String!) {\n    deactivateWorker(workerId: $workerId) {\n      id\n      active\n    }\n  }\n"): (typeof documents)["\n  mutation DeactivateWorker($workerId: String!) {\n    deactivateWorker(workerId: $workerId) {\n      id\n      active\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateLocation($input: LocationCreateInput!) {\n    createLocation(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateLocation($input: LocationCreateInput!) {\n    createLocation(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateLocation($locationId: String!, $input: LocationUpdateInput!) {\n    updateLocation(locationId: $locationId, input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateLocation($locationId: String!, $input: LocationUpdateInput!) {\n    updateLocation(locationId: $locationId, input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PunchesByDate($locationId: String!, $businessDate: String) {\n    punchesByDate(locationId: $locationId, businessDate: $businessDate) {\n      id\n      workerId\n      type\n      occurredAt\n      timeZone\n      worker {\n        displayName\n      }\n    }\n  }\n"): (typeof documents)["\n  query PunchesByDate($locationId: String!, $businessDate: String) {\n    punchesByDate(locationId: $locationId, businessDate: $businessDate) {\n      id\n      workerId\n      type\n      occurredAt\n      timeZone\n      worker {\n        displayName\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CorrectPunch(\n    $workerId: String!\n    $id: String!\n    $occurredAt: String!\n    $input: CorrectPunchInput!\n  ) {\n    correctPunch(workerId: $workerId, id: $id, occurredAt: $occurredAt, input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CorrectPunch(\n    $workerId: String!\n    $id: String!\n    $occurredAt: String!\n    $input: CorrectPunchInput!\n  ) {\n    correctPunch(workerId: $workerId, id: $id, occurredAt: $occurredAt, input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateManualPunch($input: ManualPunchInput!) {\n    createManualPunch(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateManualPunch($input: ManualPunchInput!) {\n    createManualPunch(input: $input) {\n      id\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;