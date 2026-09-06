import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Location, PunchEvent, Worker } from "../domain/types";
import { GSI1, GSI2, PK, SK } from "./keys";

export interface RepoContext {
  doc: DynamoDBDocumentClient;
  tableName: string;
}

type Item = Record<string, unknown>;

// --- marshalling -----------------------------------------------------------

function toLocationItem(loc: Location): Item {
  return {
    PK: PK.location(loc.locationId),
    SK: SK.profile,
    entityType: "LOCATION",
    // GSI1 の固定パーティションで全 Location を名前順に一覧できる。
    GSI1PK: GSI1.locationsPk,
    GSI1SK: GSI1.locationSk(loc.name, loc.locationId),
    ...loc,
  };
}

function fromLocationItem(item: Item): Location {
  return {
    locationId: item.locationId as string,
    name: item.name as string,
    timeZone: item.timeZone as string,
    businessDayCutoffHour: item.businessDayCutoffHour as number,
    country: item.country as string | undefined,
    active: item.active as boolean,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

function toWorkerItem(w: Worker): Item {
  const base: Item = {
    PK: PK.worker(w.workerId),
    SK: SK.profile,
    entityType: "WORKER",
    ...w,
  };
  // GSI1 はスパース: active な Worker のみキーを持つ（＝一覧に出る）。
  if (w.active) {
    base.GSI1PK = GSI1.pk(w.locationId);
    base.GSI1SK = GSI1.sk(w.nameKana, w.workerId);
  }
  return base;
}

function fromWorkerItem(item: Item): Worker {
  return {
    workerId: item.workerId as string,
    locationId: item.locationId as string,
    name: item.name as string,
    displayName: item.displayName as string,
    nameKana: item.nameKana as string,
    active: item.active as boolean,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

function toPunchItem(p: PunchEvent): Item {
  return {
    PK: PK.worker(p.workerId),
    SK: SK.punch(p.occurredAt, p.id),
    entityType: "PUNCH",
    GSI2PK: GSI2.pk(p.locationId, p.businessDate),
    GSI2SK: GSI2.sk(p.occurredAt, p.workerId),
    ...p,
  };
}

function fromPunchItem(item: Item): PunchEvent {
  return {
    id: item.id as string,
    workerId: item.workerId as string,
    locationId: item.locationId as string,
    type: item.type as PunchEvent["type"],
    occurredAt: item.occurredAt as string,
    timeZone: item.timeZone as string,
    businessDate: item.businessDate as string,
    source: item.source as "KIOSK",
    deviceId: item.deviceId as string | undefined,
    corrected: item.corrected as boolean,
    correctedBy: item.correctedBy as string | undefined,
    note: item.note as string | undefined,
    createdAt: item.createdAt as string,
  };
}

// --- repositories ----------------------------------------------------------

function makeLocationRepo({ doc, tableName }: RepoContext) {
  return {
    async get(locationId: string): Promise<Location | undefined> {
      const res = await doc.send(
        new GetCommand({ TableName: tableName, Key: { PK: PK.location(locationId), SK: SK.profile } }),
      );
      return res.Item ? fromLocationItem(res.Item) : undefined;
    },
    async put(loc: Location): Promise<Location> {
      await doc.send(new PutCommand({ TableName: tableName, Item: toLocationItem(loc) }));
      return loc;
    },
    /** 全 Location を名前順に返す（GSI1 の固定パーティション "LOCATIONS"）。 */
    async list(): Promise<Location[]> {
      const res = await doc.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: { ":pk": GSI1.locationsPk },
          ScanIndexForward: true,
        }),
      );
      return (res.Items ?? []).map(fromLocationItem);
    },
  };
}

function makeWorkerRepo({ doc, tableName }: RepoContext) {
  return {
    async get(workerId: string): Promise<Worker | undefined> {
      const res = await doc.send(
        new GetCommand({ TableName: tableName, Key: { PK: PK.worker(workerId), SK: SK.profile } }),
      );
      return res.Item ? fromWorkerItem(res.Item) : undefined;
    },
    async put(worker: Worker): Promise<Worker> {
      await doc.send(new PutCommand({ TableName: tableName, Item: toWorkerItem(worker) }));
      return worker;
    },
    /** その拠点の有効なアルバイトを nameKana 昇順で返す（GSI1, スパース）。 */
    async listActiveByLocation(locationId: string): Promise<Worker[]> {
      const res = await doc.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: { ":pk": GSI1.pk(locationId) },
          ScanIndexForward: true,
        }),
      );
      return (res.Items ?? []).map(fromWorkerItem);
    },
  };
}

function makePunchRepo({ doc, tableName }: RepoContext) {
  return {
    async create(punch: PunchEvent): Promise<PunchEvent> {
      await doc.send(new PutCommand({ TableName: tableName, Item: toPunchItem(punch) }));
      return punch;
    },
    /** ある Worker の直近の打刻を新しい順に返す（状態算出・連打デデュープ用）。 */
    async recentByWorker(workerId: string, limit = 1): Promise<PunchEvent[]> {
      const res = await doc.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: { ":pk": PK.worker(workerId), ":sk": SK.punchPrefix },
          ScanIndexForward: false,
          Limit: limit,
        }),
      );
      return (res.Items ?? []).map(fromPunchItem);
    },
    /** 拠点の指定営業日の全打刻（GSI2, 時刻昇順）。 */
    async listByLocationDate(locationId: string, businessDate: string): Promise<PunchEvent[]> {
      const res = await doc.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "GSI2",
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: { ":pk": GSI2.pk(locationId, businessDate) },
          ScanIndexForward: true,
        }),
      );
      return (res.Items ?? []).map(fromPunchItem);
    },
  };
}

export interface Repositories {
  locations: ReturnType<typeof makeLocationRepo>;
  workers: ReturnType<typeof makeWorkerRepo>;
  punches: ReturnType<typeof makePunchRepo>;
}

export function createRepositories(ctx: RepoContext): Repositories {
  return {
    locations: makeLocationRepo(ctx),
    workers: makeWorkerRepo(ctx),
    punches: makePunchRepo(ctx),
  };
}
