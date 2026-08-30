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
    "\n  query Workers($locationId: String!) {\n    workers(locationId: $locationId) {\n      id\n      displayName\n      nameKana\n    }\n  }\n": typeof types.WorkersDocument,
    "\n  query WorkerStatus($workerId: String!) {\n    workerStatus(workerId: $workerId) {\n      workerId\n      status\n      lastPunchAt\n    }\n  }\n": typeof types.WorkerStatusDocument,
    "\n  mutation Punch($workerId: String!, $type: PunchType!) {\n    punch(workerId: $workerId, type: $type) {\n      id\n      type\n      occurredAt\n      businessDate\n    }\n  }\n": typeof types.PunchDocument,
};
const documents: Documents = {
    "\n  query Workers($locationId: String!) {\n    workers(locationId: $locationId) {\n      id\n      displayName\n      nameKana\n    }\n  }\n": types.WorkersDocument,
    "\n  query WorkerStatus($workerId: String!) {\n    workerStatus(workerId: $workerId) {\n      workerId\n      status\n      lastPunchAt\n    }\n  }\n": types.WorkerStatusDocument,
    "\n  mutation Punch($workerId: String!, $type: PunchType!) {\n    punch(workerId: $workerId, type: $type) {\n      id\n      type\n      occurredAt\n      businessDate\n    }\n  }\n": types.PunchDocument,
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
export function graphql(source: "\n  query Workers($locationId: String!) {\n    workers(locationId: $locationId) {\n      id\n      displayName\n      nameKana\n    }\n  }\n"): (typeof documents)["\n  query Workers($locationId: String!) {\n    workers(locationId: $locationId) {\n      id\n      displayName\n      nameKana\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query WorkerStatus($workerId: String!) {\n    workerStatus(workerId: $workerId) {\n      workerId\n      status\n      lastPunchAt\n    }\n  }\n"): (typeof documents)["\n  query WorkerStatus($workerId: String!) {\n    workerStatus(workerId: $workerId) {\n      workerId\n      status\n      lastPunchAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Punch($workerId: String!, $type: PunchType!) {\n    punch(workerId: $workerId, type: $type) {\n      id\n      type\n      occurredAt\n      businessDate\n    }\n  }\n"): (typeof documents)["\n  mutation Punch($workerId: String!, $type: PunchType!) {\n    punch(workerId: $workerId, type: $type) {\n      id\n      type\n      occurredAt\n      businessDate\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;