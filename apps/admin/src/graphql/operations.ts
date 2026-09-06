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

export const PunchesByDateQuery = graphql(`
  query PunchesByDate($locationId: String!, $businessDate: String) {
    punchesByDate(locationId: $locationId, businessDate: $businessDate) {
      id
      type
      occurredAt
      timeZone
      worker {
        displayName
      }
    }
  }
`);
