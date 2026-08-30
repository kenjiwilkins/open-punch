import { graphql } from "../gql";

// キオスクの公開3オペレーション。codegen がこの graphql(...) を解析して
// TypedDocumentNode + 型を生成する。

export const WorkersQuery = graphql(`
  query Workers($locationId: String!) {
    workers(locationId: $locationId) {
      id
      displayName
      nameKana
    }
  }
`);

export const WorkerStatusQuery = graphql(`
  query WorkerStatus($workerId: String!) {
    workerStatus(workerId: $workerId) {
      workerId
      status
      lastPunchAt
    }
  }
`);

export const PunchMutation = graphql(`
  mutation Punch($workerId: String!, $type: PunchType!) {
    punch(workerId: $workerId, type: $type) {
      id
      type
      occurredAt
      businessDate
    }
  }
`);
