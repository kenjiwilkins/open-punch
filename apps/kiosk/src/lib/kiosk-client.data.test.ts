import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// graphql-request をモックし、実ネットワーク無しでクエリ変数を検証する。
const requestMock = vi.hoisted(() => vi.fn());
vi.mock("graphql-request", () => ({
  GraphQLClient: class {
    url: string;
    requestConfig: unknown;
    request = requestMock;
    constructor(url: string, cfg: unknown) {
      this.url = url;
      this.requestConfig = cfg;
    }
  },
}));

import { PunchType } from "../gql/graphql";
import { PunchMutation, WorkerStatusQuery, WorkersQuery } from "../graphql/operations";
import { fetchWorkerStatus, fetchWorkers, punch } from "./kiosk-client";

beforeEach(() => {
  vi.stubEnv("GRAPHQL_URL", "https://api.example/graphql");
  vi.stubEnv("KIOSK_API_KEY", "secret");
  vi.stubEnv("KIOSK_LOCATION_ID", "L1");
  requestMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("kiosk client データ関数（GraphQL モック）", () => {
  it("fetchWorkers は設定の locationId でスコープする", async () => {
    requestMock.mockResolvedValue({
      workers: [{ id: "W1", displayName: "山田", nameKana: "やまだ" }],
    });
    const workers = await fetchWorkers();
    expect(requestMock).toHaveBeenCalledWith(WorkersQuery, { locationId: "L1" });
    expect(workers).toHaveLength(1);
  });

  it("fetchWorkerStatus は workerId で状態を引く", async () => {
    requestMock.mockResolvedValue({
      workerStatus: { workerId: "W1", status: "WORKING", lastPunchAt: null },
    });
    const status = await fetchWorkerStatus("W1");
    expect(requestMock).toHaveBeenCalledWith(WorkerStatusQuery, { workerId: "W1" });
    expect(status?.status).toBe("WORKING");
  });

  it("punch は workerId と type のみ送る（クライアント時刻を含めない）", async () => {
    requestMock.mockResolvedValue({
      punch: { id: "P1", type: "CLOCK_IN", occurredAt: "x", businessDate: "y" },
    });
    await punch("W1", PunchType.ClockIn);
    expect(requestMock).toHaveBeenCalledWith(PunchMutation, {
      workerId: "W1",
      type: PunchType.ClockIn,
    });
    const variables = requestMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(variables).sort()).toEqual(["type", "workerId"]);
  });
});
