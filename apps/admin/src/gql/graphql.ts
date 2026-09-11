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

export type Employee = {
  __typename?: 'Employee';
  email?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  role?: Maybe<EmployeeRole>;
  sub?: Maybe<Scalars['ID']['output']>;
};

export enum EmployeeRole {
  Admin = 'ADMIN'
}

export type Location = {
  __typename?: 'Location';
  active?: Maybe<Scalars['Boolean']['output']>;
  businessDayCutoffHour?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  timeZone?: Maybe<Scalars['String']['output']>;
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

export type Mutation = {
  __typename?: 'Mutation';
  createLocation?: Maybe<Location>;
  createWorker?: Maybe<Worker>;
  deactivateWorker?: Maybe<Worker>;
  punch?: Maybe<PunchEvent>;
  updateLocation?: Maybe<Location>;
  updateWorker?: Maybe<Worker>;
};


export type MutationCreateLocationArgs = {
  input: LocationCreateInput;
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
  businessDate?: Maybe<Scalars['String']['output']>;
  corrected?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  occurredAt?: Maybe<Scalars['String']['output']>;
  timeZone?: Maybe<Scalars['String']['output']>;
  type?: Maybe<PunchType>;
  worker?: Maybe<Worker>;
  workerId?: Maybe<Scalars['String']['output']>;
};

export enum PunchType {
  ClockIn = 'CLOCK_IN',
  ClockOut = 'CLOCK_OUT'
}

export type Query = {
  __typename?: 'Query';
  health?: Maybe<Scalars['String']['output']>;
  locations?: Maybe<Array<Location>>;
  punchesByDate?: Maybe<Array<PunchEvent>>;
  workerStatus?: Maybe<WorkerDayStatus>;
  workers?: Maybe<Array<Worker>>;
  workersByLocation?: Maybe<Array<Worker>>;
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
  active?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  nameKana?: Maybe<Scalars['String']['output']>;
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
  punchesToday?: Maybe<Array<PunchEvent>>;
  status?: Maybe<WorkerStatus>;
  workerId?: Maybe<Scalars['ID']['output']>;
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

export type LocationsQueryVariables = Exact<{ [key: string]: never; }>;


export type LocationsQuery = { __typename?: 'Query', locations?: Array<{ __typename?: 'Location', id?: string | null, name?: string | null, timeZone?: string | null }> | null };

export type AdminLocationsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminLocationsQuery = { __typename?: 'Query', locations?: Array<{ __typename?: 'Location', id?: string | null, name?: string | null, timeZone?: string | null, businessDayCutoffHour?: number | null, country?: string | null, active?: boolean | null }> | null };

export type WorkersByLocationQueryVariables = Exact<{
  locationId: Scalars['String']['input'];
}>;


export type WorkersByLocationQuery = { __typename?: 'Query', workersByLocation?: Array<{ __typename?: 'Worker', id?: string | null, name?: string | null, displayName?: string | null, nameKana?: string | null, active?: boolean | null }> | null };

export type CreateWorkerMutationVariables = Exact<{
  input: WorkerCreateInput;
}>;


export type CreateWorkerMutation = { __typename?: 'Mutation', createWorker?: { __typename?: 'Worker', id?: string | null } | null };

export type UpdateWorkerMutationVariables = Exact<{
  workerId: Scalars['String']['input'];
  input: WorkerUpdateInput;
}>;


export type UpdateWorkerMutation = { __typename?: 'Mutation', updateWorker?: { __typename?: 'Worker', id?: string | null } | null };

export type DeactivateWorkerMutationVariables = Exact<{
  workerId: Scalars['String']['input'];
}>;


export type DeactivateWorkerMutation = { __typename?: 'Mutation', deactivateWorker?: { __typename?: 'Worker', id?: string | null, active?: boolean | null } | null };

export type CreateLocationMutationVariables = Exact<{
  input: LocationCreateInput;
}>;


export type CreateLocationMutation = { __typename?: 'Mutation', createLocation?: { __typename?: 'Location', id?: string | null } | null };

export type UpdateLocationMutationVariables = Exact<{
  locationId: Scalars['String']['input'];
  input: LocationUpdateInput;
}>;


export type UpdateLocationMutation = { __typename?: 'Mutation', updateLocation?: { __typename?: 'Location', id?: string | null } | null };

export type PunchesByDateQueryVariables = Exact<{
  locationId: Scalars['String']['input'];
  businessDate?: InputMaybe<Scalars['String']['input']>;
}>;


export type PunchesByDateQuery = { __typename?: 'Query', punchesByDate?: Array<{ __typename?: 'PunchEvent', id?: string | null, type?: PunchType | null, occurredAt?: string | null, timeZone?: string | null, worker?: { __typename?: 'Worker', displayName?: string | null } | null }> | null };


export const LocationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}}]} as unknown as DocumentNode<LocationsQuery, LocationsQueryVariables>;
export const AdminLocationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminLocations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"businessDayCutoffHour"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}}]} as unknown as DocumentNode<AdminLocationsQuery, AdminLocationsQueryVariables>;
export const WorkersByLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkersByLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workersByLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"nameKana"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}}]} as unknown as DocumentNode<WorkersByLocationQuery, WorkersByLocationQueryVariables>;
export const CreateWorkerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorker"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkerCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorker"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateWorkerMutation, CreateWorkerMutationVariables>;
export const UpdateWorkerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorker"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WorkerUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorker"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateWorkerMutation, UpdateWorkerMutationVariables>;
export const DeactivateWorkerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeactivateWorker"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deactivateWorker"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}}]} as unknown as DocumentNode<DeactivateWorkerMutation, DeactivateWorkerMutationVariables>;
export const CreateLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LocationCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateLocationMutation, CreateLocationMutationVariables>;
export const UpdateLocationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLocation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LocationUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLocation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateLocationMutation, UpdateLocationMutationVariables>;
export const PunchesByDateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PunchesByDate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"businessDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"punchesByDate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"locationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"businessDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"businessDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"worker"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]} as unknown as DocumentNode<PunchesByDateQuery, PunchesByDateQueryVariables>;