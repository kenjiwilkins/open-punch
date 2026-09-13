import { graphql } from "../gql";

// admin の社員向けオペレーション（cognito 認証）。

export const LocationsQuery = graphql(`
  query Locations {
    locations {
      id
      name
      timeZone
    }
  }
`);

export const AdminLocationsQuery = graphql(`
  query AdminLocations {
    locations {
      id
      name
      timeZone
      businessDayCutoffHour
      country
      active
    }
  }
`);

export const WorkersByLocationQuery = graphql(`
  query WorkersByLocation($locationId: String!) {
    workersByLocation(locationId: $locationId) {
      id
      name
      displayName
      nameKana
      active
    }
  }
`);

export const CreateWorkerMutation = graphql(`
  mutation CreateWorker($input: WorkerCreateInput!) {
    createWorker(input: $input) {
      id
    }
  }
`);

export const UpdateWorkerMutation = graphql(`
  mutation UpdateWorker($workerId: String!, $input: WorkerUpdateInput!) {
    updateWorker(workerId: $workerId, input: $input) {
      id
    }
  }
`);

export const DeactivateWorkerMutation = graphql(`
  mutation DeactivateWorker($workerId: String!) {
    deactivateWorker(workerId: $workerId) {
      id
      active
    }
  }
`);

export const CreateLocationMutation = graphql(`
  mutation CreateLocation($input: LocationCreateInput!) {
    createLocation(input: $input) {
      id
    }
  }
`);

export const UpdateLocationMutation = graphql(`
  mutation UpdateLocation($locationId: String!, $input: LocationUpdateInput!) {
    updateLocation(locationId: $locationId, input: $input) {
      id
    }
  }
`);

export const PunchesByDateQuery = graphql(`
  query PunchesByDate($locationId: String!, $businessDate: String) {
    punchesByDate(locationId: $locationId, businessDate: $businessDate) {
      id
      workerId
      type
      occurredAt
      timeZone
      worker {
        displayName
      }
    }
  }
`);

export const CorrectPunchMutation = graphql(`
  mutation CorrectPunch(
    $workerId: String!
    $id: String!
    $occurredAt: String!
    $input: CorrectPunchInput!
  ) {
    correctPunch(workerId: $workerId, id: $id, occurredAt: $occurredAt, input: $input) {
      id
    }
  }
`);

export const CreateManualPunchMutation = graphql(`
  mutation CreateManualPunch($input: ManualPunchInput!) {
    createManualPunch(input: $input) {
      id
    }
  }
`);
