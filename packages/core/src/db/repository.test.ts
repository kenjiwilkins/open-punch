import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";
import type { Location, PunchEvent, Worker } from "../domain/types";
import { PunchType } from "../domain/types";
import { createRepositories } from "./repository";

const ddbMock = mockClient(DynamoDBDocumentClient);
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-northeast-1" }));
const repos = createRepositories({ doc, tableName: "OpenPunch" });

const worker: Worker = {
  workerId: "W1",
  locationId: "L1",
  name: "山田 太郎",
  displayName: "山田",
  nameKana: "やまだたろう",
  active: true,
  createdAt: "2026-08-25T00:00:00Z",
  updatedAt: "2026-08-25T00:00:00Z",
};

const punch: PunchEvent = {
  id: "01K",
  workerId: "W1",
  locationId: "L1",
  type: PunchType.CLOCK_IN,
  occurredAt: "2026-08-25T00:01:00Z",
  timeZone: "Asia/Tokyo",
  businessDate: "2026-08-25",
  source: "KIOSK",
  corrected: false,
  createdAt: "2026-08-25T00:01:00Z",
};

const location: Location = {
  locationId: "L1",
  name: "渋谷店",
  timeZone: "Asia/Tokyo",
  businessDayCutoffHour: 0,
  active: true,
  createdAt: "2026-08-25T00:00:00Z",
  updatedAt: "2026-08-25T00:00:00Z",
};

beforeEach(() => ddbMock.reset());

describe("locations", () => {
  it("put は LOCATION#/PROFILE キーと GSI1(LOCATIONS) を持つ", async () => {
    ddbMock.on(PutCommand).resolves({});
    await repos.locations.put(location);
    const item = ddbMock.commandCalls(PutCommand)[0]!.args[0].input.Item!;
    expect(item.PK).toBe("LOCATION#L1");
    expect(item.SK).toBe("PROFILE");
    expect(item.timeZone).toBe("Asia/Tokyo");
    expect(item.businessDayCutoffHour).toBe(0);
    expect(item.GSI1PK).toBe("LOCATIONS");
    expect(item.GSI1SK).toBe("渋谷店#L1");
  });

  it("list は GSI1 の LOCATIONS パーティションを Query する", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...location, PK: "LOCATION#L1", SK: "PROFILE", entityType: "LOCATION" }],
    });
    const list = await repos.locations.list();
    const input = ddbMock.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(input.IndexName).toBe("GSI1");
    expect(input.ExpressionAttributeValues![":pk"]).toBe("LOCATIONS");
    expect(list).toHaveLength(1);
    expect(list[0]!.locationId).toBe("L1");
    expect((list[0] as unknown as Record<string, unknown>).PK).toBeUndefined();
  });

  it("get はドメイン型に整形して返す（キー属性を含まない）", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { ...location, PK: "LOCATION#L1", SK: "PROFILE", entityType: "LOCATION" },
    });
    const got = await repos.locations.get("L1");
    expect(got?.locationId).toBe("L1");
    expect(got?.timeZone).toBe("Asia/Tokyo");
    expect((got as unknown as Record<string, unknown>).PK).toBeUndefined();
  });

  it("get は見つからなければ undefined", async () => {
    ddbMock.on(GetCommand).resolves({});
    expect(await repos.locations.get("nope")).toBeUndefined();
  });
});

describe("workers", () => {
  it("active な Worker は GSI1 キー付きで書かれる（スパース）", async () => {
    ddbMock.on(PutCommand).resolves({});
    await repos.workers.put(worker);
    const item = ddbMock.commandCalls(PutCommand)[0]!.args[0].input.Item!;
    expect(item.PK).toBe("WORKER#W1");
    expect(item.SK).toBe("PROFILE");
    expect(item.GSI1PK).toBe("LOCATION#L1");
    expect(item.GSI1SK).toBe("やまだたろう#WORKER#W1");
  });

  it("inactive な Worker は GSI1 キーを持たない（一覧に出ない）", async () => {
    ddbMock.on(PutCommand).resolves({});
    await repos.workers.put({ ...worker, active: false });
    const item = ddbMock.commandCalls(PutCommand)[0]!.args[0].input.Item!;
    expect(item.GSI1PK).toBeUndefined();
    expect(item.GSI1SK).toBeUndefined();
  });

  it("listActiveByLocation は GSI1 を拠点キーで Query する", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...worker, PK: "WORKER#W1", SK: "PROFILE", entityType: "WORKER" }],
    });
    const list = await repos.workers.listActiveByLocation("L1");
    const input = ddbMock.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(input.IndexName).toBe("GSI1");
    expect(input.ExpressionAttributeValues![":pk"]).toBe("LOCATION#L1");
    expect(list).toHaveLength(1);
    expect(list[0]!.workerId).toBe("W1");
    // ドメイン型に整形され、キー属性は含まれない
    expect((list[0] as unknown as Record<string, unknown>).PK).toBeUndefined();
  });

  it("get は見つからなければ undefined", async () => {
    ddbMock.on(GetCommand).resolves({});
    expect(await repos.workers.get("nope")).toBeUndefined();
  });
});

describe("punches", () => {
  it("create は GSI2 キー付きで書かれる", async () => {
    ddbMock.on(PutCommand).resolves({});
    await repos.punches.create(punch);
    const item = ddbMock.commandCalls(PutCommand)[0]!.args[0].input.Item!;
    expect(item.PK).toBe("WORKER#W1");
    expect(item.SK).toBe("PUNCH#2026-08-25T00:01:00Z#01K");
    expect(item.GSI2PK).toBe("LOCATION#L1#2026-08-25");
    expect(item.GSI2SK).toBe("2026-08-25T00:01:00Z#WORKER#W1");
  });

  it("recentByWorker は新しい順・PUNCH# 前方一致で Query する", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...punch, PK: "WORKER#W1", SK: "PUNCH#2026-08-25T00:01:00Z#01K" }],
    });
    const recent = await repos.punches.recentByWorker("W1", 1);
    const input = ddbMock.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(input.ScanIndexForward).toBe(false);
    expect(input.Limit).toBe(1);
    expect(input.ExpressionAttributeValues![":sk"]).toBe("PUNCH#");
    expect(recent[0]!.businessDate).toBe("2026-08-25");
  });

  it("listByLocationDate は GSI2 を拠点＋営業日キーで Query する", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    await repos.punches.listByLocationDate("L1", "2026-08-25");
    const input = ddbMock.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(input.IndexName).toBe("GSI2");
    expect(input.ExpressionAttributeValues![":pk"]).toBe("LOCATION#L1#2026-08-25");
  });
});
