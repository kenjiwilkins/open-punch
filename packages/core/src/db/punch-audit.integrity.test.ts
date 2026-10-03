// 補正・手動打刻の監査整合性（鉄則8・docs/07 回帰チェックリスト #3）。
// aws-sdk-client-mock で DynamoDB の TransactWriteItems の意味論を再現する:
//  - 全か無か（失敗したら何も書かれない）
//  - 同一アイテムを1トランザクション内で2度操作できない（ValidationException）
// 呼び出しの形だけでなく「結果としてテーブルがどうなるか」を検証する。
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";
import { PunchType, type PunchAudit, type PunchEvent } from "../domain/types";
import { createRepositories } from "./repository";

const ddbMock = mockClient(DynamoDBDocumentClient);
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-northeast-1" }));
const repos = createRepositories({ doc, tableName: "OpenPunch" });

type Row = Record<string, unknown>;
type Key = { PK: string; SK: string };

const original: PunchEvent = {
  id: "01P",
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

function audit(overrides: Partial<PunchAudit> = {}): PunchAudit {
  return {
    id: "01A1",
    workerId: "W1",
    action: "CORRECT",
    targetPunchId: "01P",
    before: { occurredAt: "2026-08-25T00:01:00Z", type: PunchType.CLOCK_IN },
    after: { occurredAt: "2026-08-25T00:05:00Z", type: PunchType.CLOCK_IN },
    performedBy: "employee-sub",
    note: "打刻漏れのため補正",
    createdAt: "2026-08-25T10:00:00Z",
    ...overrides,
  };
}

/** DynamoDB のトランザクション意味論を再現するインメモリテーブル。 */
function installFakeTable() {
  const table = new Map<string, Row>();
  const ops: string[] = []; // どの種類の書き込みが発行されたか（Transact 以外が混ざれば非原子的）
  const state = { failNextTransaction: false };
  const id = (k: Key) => `${k.PK}|${k.SK}`;

  ddbMock.on(PutCommand).callsFake((input) => {
    ops.push("Put");
    table.set(id(input.Item as Key), input.Item as Row);
    return {};
  });
  ddbMock.on(DeleteCommand).callsFake((input) => {
    ops.push("Delete");
    table.delete(id(input.Key as Key));
    return {};
  });
  ddbMock.on(TransactWriteCommand).callsFake(async (input) => {
    ops.push("Transact");
    const items = input.TransactItems as {
      Put?: { Item: Row };
      Delete?: { Key: Key };
    }[];
    const keys = items.map((i) => id((i.Put?.Item ?? i.Delete!.Key) as Key));
    if (new Set(keys).size !== keys.length) {
      throw new Error("ValidationException: Transaction request cannot include multiple operations on one item");
    }
    if (state.failNextTransaction) {
      state.failNextTransaction = false;
      throw new Error("TransactionCanceledException");
    }
    for (const i of items) {
      if (i.Put) table.set(id(i.Put.Item as Key), i.Put.Item);
      if (i.Delete) table.delete(id(i.Delete.Key));
    }
    return {};
  });

  const snapshot = () => JSON.stringify([...table.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const audits = () => [...table.values()].filter((r) => r.entityType === "PUNCH_AUDIT");
  const punches = () => [...table.values()].filter((r) => r.entityType === "PUNCH");
  return { table, ops, state, snapshot, audits, punches };
}

let fake: ReturnType<typeof installFakeTable>;

beforeEach(async () => {
  ddbMock.reset();
  fake = installFakeTable();
  await repos.punches.create(original); // 既存の打刻（シード）
  fake.ops.length = 0;
});

describe("correctInTransaction（補正）", () => {
  it("occurredAt を変える補正: 旧キーが消え新キーに補正済みイベント、監査が同時に入る。Transact 以外の書き込みは発行されない", async () => {
    const after: PunchEvent = {
      ...original,
      occurredAt: "2026-08-25T00:05:00Z",
      corrected: true,
      correctedBy: "employee-sub",
      note: "打刻漏れのため補正",
    };
    await repos.punches.correctInTransaction({ before: original, after, audit: audit() });

    expect(fake.ops).toEqual(["Transact"]);
    expect(fake.punches()).toHaveLength(1);
    expect(fake.punches()[0]).toMatchObject({
      SK: "PUNCH#2026-08-25T00:05:00Z#01P",
      corrected: true,
      correctedBy: "employee-sub",
    });
    expect(fake.table.has("WORKER#W1|PUNCH#2026-08-25T00:01:00Z#01P")).toBe(false);
    expect(fake.audits()).toHaveLength(1);
  });

  it("type だけの補正（SK 不変）: 同一キーを2度操作せず（DynamoDB の制約）、上書き＋監査で成功する", async () => {
    const after: PunchEvent = { ...original, type: PunchType.CLOCK_OUT, corrected: true, correctedBy: "employee-sub" };
    await expect(
      repos.punches.correctInTransaction({
        before: original,
        after,
        audit: audit({ after: { occurredAt: original.occurredAt, type: PunchType.CLOCK_OUT } }),
      }),
    ).resolves.toEqual(after);

    expect(fake.punches()).toHaveLength(1);
    expect(fake.punches()[0]).toMatchObject({ type: "CLOCK_OUT", corrected: true });
    expect(fake.audits()).toHaveLength(1);
  });

  it("トランザクション失敗時はロールバック: 元イベントは不変、監査も新イベントも書かれない（片方だけ書かれる状態にならない）", async () => {
    const before = fake.snapshot();
    fake.state.failNextTransaction = true;
    const after: PunchEvent = { ...original, occurredAt: "2026-08-25T00:05:00Z", corrected: true };

    await expect(
      repos.punches.correctInTransaction({ before: original, after, audit: audit() }),
    ).rejects.toThrow("TransactionCanceledException");

    expect(fake.snapshot()).toBe(before);
    expect(fake.audits()).toHaveLength(0);
    expect(fake.ops).toEqual(["Transact"]); // フォールバックの単発書き込みもしない
  });

  it("監査は append-only: 同じ打刻を2回補正すると監査が2件になり、1件目は変更されない", async () => {
    const first: PunchEvent = { ...original, occurredAt: "2026-08-25T00:05:00Z", corrected: true, correctedBy: "e1" };
    await repos.punches.correctInTransaction({ before: original, after: first, audit: audit({ id: "01A1" }) });
    const firstAuditSnapshot = JSON.stringify(fake.audits()[0]);

    const second: PunchEvent = { ...first, occurredAt: "2026-08-25T00:10:00Z", correctedBy: "e2" };
    await repos.punches.correctInTransaction({
      before: first,
      after: second,
      audit: audit({
        id: "01A2",
        before: { occurredAt: first.occurredAt, type: PunchType.CLOCK_IN },
        after: { occurredAt: second.occurredAt, type: PunchType.CLOCK_IN },
        performedBy: "e2",
        createdAt: "2026-08-25T11:00:00Z",
      }),
    });

    expect(fake.audits()).toHaveLength(2);
    expect(fake.audits().map((a) => a.SK)).toEqual([
      "AUDIT#2026-08-25T10:00:00Z#01A1",
      "AUDIT#2026-08-25T11:00:00Z#01A2",
    ]);
    expect(JSON.stringify(fake.audits()[0])).toBe(firstAuditSnapshot);
    expect(fake.punches()).toHaveLength(1);
  });

  it("監査レコードは対象アルバイトと同じパーティション（PK=WORKER#id）に before/after/performedBy/note/createdAt 付きで入る", async () => {
    const after: PunchEvent = { ...original, occurredAt: "2026-08-25T00:05:00Z", corrected: true };
    await repos.punches.correctInTransaction({ before: original, after, audit: audit() });

    expect(fake.audits()[0]).toMatchObject({
      PK: "WORKER#W1",
      SK: "AUDIT#2026-08-25T10:00:00Z#01A1",
      entityType: "PUNCH_AUDIT",
      action: "CORRECT",
      targetPunchId: "01P",
      before: { occurredAt: "2026-08-25T00:01:00Z", type: "CLOCK_IN" },
      after: { occurredAt: "2026-08-25T00:05:00Z", type: "CLOCK_IN" },
      performedBy: "employee-sub",
      note: "打刻漏れのため補正",
      createdAt: "2026-08-25T10:00:00Z",
    });
  });
});

describe("createManualInTransaction（手動追加）", () => {
  const manual: PunchEvent = {
    ...original,
    id: "01NEW",
    occurredAt: "2026-08-25T09:00:00Z",
    source: "MANUAL",
    note: "打刻漏れのため追加",
  };
  const manualAudit: PunchAudit = {
    id: "01A3",
    workerId: "W1",
    action: "MANUAL_ADD",
    targetPunchId: "01NEW",
    after: { occurredAt: manual.occurredAt, type: manual.type },
    performedBy: "employee-sub",
    note: "打刻漏れのため追加",
    createdAt: "2026-08-25T10:00:00Z",
  };

  it("新規イベントと監査（before なし）が同時に入り、既存の打刻は残る", async () => {
    await repos.punches.createManualInTransaction({ punch: manual, audit: manualAudit });

    expect(fake.ops).toEqual(["Transact"]);
    expect(fake.punches()).toHaveLength(2);
    expect(fake.audits()).toHaveLength(1);
    expect(fake.audits()[0]).toMatchObject({ action: "MANUAL_ADD", targetPunchId: "01NEW" });
    expect(fake.audits()[0]!.before).toBeUndefined();
  });

  it("トランザクション失敗時は新規イベントも監査も書かれない", async () => {
    const before = fake.snapshot();
    fake.state.failNextTransaction = true;

    await expect(
      repos.punches.createManualInTransaction({ punch: manual, audit: manualAudit }),
    ).rejects.toThrow("TransactionCanceledException");

    expect(fake.snapshot()).toBe(before);
    expect(fake.punches()).toHaveLength(1);
    expect(fake.audits()).toHaveLength(0);
  });
});
