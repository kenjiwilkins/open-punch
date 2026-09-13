import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";
import type { Location, PunchAudit, PunchEvent, Worker } from "../domain/types";
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

  it("get は PK/SK(occurredAt+id) で1件取得する", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...punch, PK: "WORKER#W1", SK: "PUNCH#2026-08-25T00:01:00Z#01K" } });
    const got = await repos.punches.get("W1", "2026-08-25T00:01:00Z", "01K");
    const input = ddbMock.commandCalls(GetCommand)[0]!.args[0].input;
    expect(input.Key).toEqual({ PK: "WORKER#W1", SK: "PUNCH#2026-08-25T00:01:00Z#01K" });
    expect(got?.id).toBe("01K");
  });

  const audit: PunchAudit = {
    id: "01AUDIT",
    workerId: "W1",
    action: "CORRECT",
    targetPunchId: "01K",
    before: { occurredAt: "2026-08-25T00:01:00Z", type: PunchType.CLOCK_IN },
    after: { occurredAt: "2026-08-25T00:05:00Z", type: PunchType.CLOCK_IN },
    performedBy: "employee-sub",
    note: "打刻漏れのため補正",
    createdAt: "2026-08-25T10:00:00Z",
  };

  it("correctInTransaction: occurredAt 変更時は Delete(旧)+Put(新)+Put(audit) の3件を1トランザクションで書く", async () => {
    ddbMock.on(TransactWriteCommand).resolves({});
    const after: PunchEvent = { ...punch, occurredAt: "2026-08-25T00:05:00Z", corrected: true, correctedBy: "employee-sub" };
    await repos.punches.correctInTransaction({ before: punch, after, audit });

    expect(ddbMock.commandCalls(TransactWriteCommand)).toHaveLength(1);
    const items = ddbMock.commandCalls(TransactWriteCommand)[0]!.args[0].input.TransactItems!;
    expect(items).toHaveLength(3);
    expect(items[0]!.Delete!.Key).toEqual({ PK: "WORKER#W1", SK: "PUNCH#2026-08-25T00:01:00Z#01K" });
    expect(items[1]!.Put!.Item!.SK).toBe("PUNCH#2026-08-25T00:05:00Z#01K");
    expect(items[1]!.Put!.Item!.corrected).toBe(true);
    expect(items[2]!.Put!.Item!.PK).toBe("WORKER#W1");
    expect(items[2]!.Put!.Item!.SK).toBe("AUDIT#2026-08-25T10:00:00Z#01AUDIT");
    expect(items[2]!.Put!.Item!.action).toBe("CORRECT");
    expect(items[2]!.Put!.Item!.before).toEqual(audit.before);
    expect(items[2]!.Put!.Item!.after).toEqual(audit.after);
  });

  it("correctInTransaction: occurredAt 不変（type のみ補正）時は同一キーへの Delete を含めず Put(新)+Put(audit) の2件にする", async () => {
    ddbMock.on(TransactWriteCommand).resolves({});
    const after: PunchEvent = { ...punch, type: PunchType.CLOCK_OUT, corrected: true, correctedBy: "employee-sub" };
    const sameKeyAudit: PunchAudit = {
      ...audit,
      after: { occurredAt: punch.occurredAt, type: PunchType.CLOCK_OUT },
    };
    await repos.punches.correctInTransaction({ before: punch, after, audit: sameKeyAudit });

    const items = ddbMock.commandCalls(TransactWriteCommand)[0]!.args[0].input.TransactItems!;
    expect(items).toHaveLength(2);
    expect(items[0]!.Put!.Item!.SK).toBe("PUNCH#2026-08-25T00:01:00Z#01K");
    expect(items[0]!.Put!.Item!.type).toBe("CLOCK_OUT");
    expect(items[1]!.Put!.Item!.action).toBe("CORRECT");
  });

  it("createManualInTransaction: 新規 PunchEvent + PunchAudit(MANUAL_ADD) の2件を1トランザクションで書く", async () => {
    ddbMock.on(TransactWriteCommand).resolves({});
    const manualPunch: PunchEvent = { ...punch, id: "01NEW", source: "MANUAL", note: "打刻漏れ追加" };
    const manualAudit: PunchAudit = {
      id: "01AUDIT2",
      workerId: "W1",
      action: "MANUAL_ADD",
      targetPunchId: "01NEW",
      after: { occurredAt: manualPunch.occurredAt, type: manualPunch.type },
      performedBy: "employee-sub",
      note: "打刻漏れ追加",
      createdAt: "2026-08-25T10:00:00Z",
    };
    await repos.punches.createManualInTransaction({ punch: manualPunch, audit: manualAudit });

    const items = ddbMock.commandCalls(TransactWriteCommand)[0]!.args[0].input.TransactItems!;
    expect(items).toHaveLength(2);
    expect(items[0]!.Put!.Item!.id).toBe("01NEW");
    expect(items[0]!.Put!.Item!.source).toBe("MANUAL");
    expect(items[1]!.Put!.Item!.action).toBe("MANUAL_ADD");
    expect(items[1]!.Put!.Item!.before).toBeUndefined();
  });
});
