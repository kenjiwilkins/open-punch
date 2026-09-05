import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestMock, getSessionTokenMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  getSessionTokenMock: vi.fn(),
}));

vi.mock("graphql-request", () => ({
  GraphQLClient: class {
    request = requestMock;
    constructor(
      public url: string,
      public requestConfig: unknown,
    ) {}
  },
}));
vi.mock("./auth/session", () => ({ getSessionToken: getSessionTokenMock }));

import { LocationsQuery, PunchesByDateQuery } from "../graphql/operations";
import { fetchLocations, fetchPunchesByDate } from "./graphql-client";

beforeEach(() => {
  vi.stubEnv("GRAPHQL_URL", "https://api.example/graphql");
  getSessionTokenMock.mockResolvedValue("idtok");
  requestMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("admin データ関数（GraphQL モック）", () => {
  it("fetchLocations は Locations クエリを投げる", async () => {
    requestMock.mockResolvedValue({
      locations: [{ id: "L1", name: "渋谷", timeZone: "Asia/Tokyo" }],
    });
    const list = await fetchLocations();
    expect(requestMock).toHaveBeenCalledWith(LocationsQuery);
    expect(list).toHaveLength(1);
  });

  it("fetchPunchesByDate は locationId / businessDate を渡す", async () => {
    requestMock.mockResolvedValue({ punchesByDate: [] });
    await fetchPunchesByDate("L1", "2026-08-25");
    expect(requestMock).toHaveBeenCalledWith(PunchesByDateQuery, {
      locationId: "L1",
      businessDate: "2026-08-25",
    });
  });

  it("businessDate 省略時は null（サーバーが当日算出）", async () => {
    requestMock.mockResolvedValue({ punchesByDate: [] });
    await fetchPunchesByDate("L1");
    expect(requestMock).toHaveBeenCalledWith(PunchesByDateQuery, {
      locationId: "L1",
      businessDate: null,
    });
  });
});
