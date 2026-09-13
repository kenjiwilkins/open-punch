/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CorrectPunchInput = {
  note: Scalars['String']['input'];
  occurredAt?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<PunchType>;
};

export type Employee = {
  __typename?: 'Employee';
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  role: EmployeeRole;
  sub: Scalars['ID']['output'];
};

export enum EmployeeRole {
  Admin = 'ADMIN'
}

export type Location = {
  __typename?: 'Location';
  active: Scalars['Boolean']['output'];
  businessDayCutoffHour: Scalars['Int']['output'];
  country?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
};

export type LocationCreateInput = {
  businessDayCutoffHour?: InputMaybe<Scalars['Int']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  timeZone: Scalars['String']['input'];
};

export type LocationUpdateInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  businessDayCutoffHour?: InputMaybe<Scalars['Int']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  timeZone?: InputMaybe<Scalars['String']['input']>;
};

export type ManualPunchInput = {
  note: Scalars['String']['input'];
  occurredAt: Scalars['String']['input'];
  type: PunchType;
  workerId: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  correctPunch: PunchEvent;
  createLocation: Location;
  createManualPunch: PunchEvent;
  createWorker: Worker;
  deactivateWorker: Worker;
  punch: PunchEvent;
  updateLocation: Location;
  updateWorker: Worker;
};


export type MutationCorrectPunchArgs = {
  id: Scalars['String']['input'];
  input: CorrectPunchInput;
  occurredAt: Scalars['String']['input'];
  workerId: Scalars['String']['input'];
};


export type MutationCreateLocationArgs = {
  input: LocationCreateInput;
};


export type MutationCreateManualPunchArgs = {
  input: ManualPunchInput;
};


export type MutationCreateWorkerArgs = {
  input: WorkerCreateInput;
};


export type MutationDeactivateWorkerArgs = {
  workerId: Scalars['String']['input'];
};


export type MutationPunchArgs = {
  type: PunchType;
  workerId: Scalars['String']['input'];
};


export type MutationUpdateLocationArgs = {
  input: LocationUpdateInput;
  locationId: Scalars['String']['input'];
};


export type MutationUpdateWorkerArgs = {
  input: WorkerUpdateInput;
  workerId: Scalars['String']['input'];
};

export type PunchEvent = {
  __typename?: 'PunchEvent';
  businessDate: Scalars['String']['output'];
  corrected: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locationId: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  occurredAt: Scalars['String']['output'];
  timeZone: Scalars['String']['output'];
  type: PunchType;
  worker?: Maybe<Worker>;
  workerId: Scalars['String']['output'];
};

export enum PunchType {
  ClockIn = 'CLOCK_IN',
  ClockOut = 'CLOCK_OUT'
}

export type Query = {
  __typename?: 'Query';
  health: Scalars['String']['output'];
  locations: Array<Location>;
  punchesByDate: Array<PunchEvent>;
  workerStatus: WorkerDayStatus;
  workers: Array<Worker>;
  workersByLocation: Array<Worker>;
};


export type QueryPunchesByDateArgs = {
  businessDate?: InputMaybe<Scalars['String']['input']>;
  locationId: Scalars['String']['input'];
};


export type QueryWorkerStatusArgs = {
  workerId: Scalars['String']['input'];
};


export type QueryWorkersArgs = {
  locationId: Scalars['String']['input'];
};


export type QueryWorkersByLocationArgs = {
  locationId: Scalars['String']['input'];
};

export type Worker = {
  __typename?: 'Worker';
  active: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  nameKana: Scalars['String']['output'];
};

export type WorkerCreateInput = {
  displayName: Scalars['String']['input'];
  locationId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  nameKana: Scalars['String']['input'];
};

export type WorkerDayStatus = {
  __typename?: 'WorkerDayStatus';
  lastPunchAt?: Maybe<Scalars['String']['output']>;
  punchesToday: Array<PunchEvent>;
  status: WorkerStatus;
  workerId: Scalars['ID']['output'];
};

export enum WorkerStatus {
  ClockedOut = 'CLOCKED_OUT',
  NotClockedIn = 'NOT_CLOCKED_IN',
  Working = 'WORKING'
}

export type WorkerUpdateInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nameKana?: InputMaybe<Scalars['String']['input']>;
};

export type WorkersQueryVariables = Exact<{
  locationId: Scalars['String']['input'];
}>;


export type WorkersQuery = { __typename?: 'Query', workers: Array<{ __typename?: 'Worker', id: string, displayName: string, nameKana: string }> };

export type WorkerStatusQueryVariables = Exact<{
  workerId: Scalars['String']['input'];
}>;


export type WorkerStatusQuery = { __typename?: 'Query', workerStatus: { __typename?: 'WorkerDayStatus', workerId: string, status: WorkerStatus, lastPunchAt?: string | null } };

export type PunchMutationVariables = Exact<{
  workerId: Scalars['String']['input'];
  type: PunchType;
}>;


export type PunchMutation = { __typename?: 'Mutation', punch: { __typename?: 'PunchEvent', id: string, type: PunchType, occurredAt: string, businessDate: string } };


export const WorkersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Workers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"nameKana"}}]}}]}}]} as unknown as DocumentNode<WorkersQuery, WorkersQueryVariables>;
export const WorkerStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkerStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workerStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workerId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"lastPunchAt"}}]}}]}}]} as unknown as DocumentNode<WorkerStatusQuery, WorkerStatusQueryVariables>;
export const PunchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Punch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PunchType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"punch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"businessDate"}}]}}]}}]} as unknown as DocumentNode<PunchMutation, PunchMutationVariables>;