import type { Employee, Location, PunchEvent, Worker, WorkerStatus } from "@open-punch/core";
import { builder } from "./builder";

// --- enums -----------------------------------------------------------------

export const PunchTypeEnum = builder.enumType("PunchType", {
  values: ["CLOCK_IN", "CLOCK_OUT"] as const,
});

export const WorkerStatusEnum = builder.enumType("WorkerStatus", {
  values: ["NOT_CLOCKED_IN", "WORKING", "CLOCKED_OUT"] as const,
});

export const EmployeeRoleEnum = builder.enumType("EmployeeRole", {
  values: ["ADMIN"] as const,
});

// --- object types ----------------------------------------------------------

export const LocationRef = builder.objectRef<Location>("Location").implement({
  fields: (t) => ({
    id: t.exposeID("locationId"),
    name: t.exposeString("name"),
    timeZone: t.exposeString("timeZone"),
    businessDayCutoffHour: t.exposeInt("businessDayCutoffHour"),
    country: t.exposeString("country", { nullable: true }),
    active: t.exposeBoolean("active"),
  }),
});

export const WorkerRef = builder.objectRef<Worker>("Worker").implement({
  fields: (t) => ({
    id: t.exposeID("workerId"),
    locationId: t.exposeString("locationId"),
    name: t.exposeString("name"),
    displayName: t.exposeString("displayName"),
    nameKana: t.exposeString("nameKana"),
    active: t.exposeBoolean("active"),
    createdAt: t.exposeString("createdAt"),
  }),
});

export const PunchEventRef = builder.objectRef<PunchEvent>("PunchEvent").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    workerId: t.exposeString("workerId"),
    locationId: t.exposeString("locationId"),
    type: t.field({ type: PunchTypeEnum, resolve: (p) => p.type }),
    occurredAt: t.exposeString("occurredAt"),
    timeZone: t.exposeString("timeZone"),
    businessDate: t.exposeString("businessDate"),
    corrected: t.exposeBoolean("corrected"),
    note: t.exposeString("note", { nullable: true }),
    // 一覧でワーカー名を出すための関連。admin の当日一覧で使う。
    worker: t.field({
      type: WorkerRef,
      nullable: true,
      resolve: (punch, _args, ctx) => ctx.repos.workers.get(punch.workerId),
    }),
  }),
});

export const EmployeeRef = builder.objectRef<Employee>("Employee").implement({
  fields: (t) => ({
    sub: t.exposeID("sub"),
    email: t.exposeString("email"),
    name: t.exposeString("name"),
    role: t.field({ type: EmployeeRoleEnum, resolve: (e) => e.role }),
  }),
});

/** あるアルバイトの当日サマリ（kiosk のボタン出し分け用）。 */
export interface WorkerDayStatus {
  workerId: string;
  status: WorkerStatus;
  lastPunchAt?: string;
  punchesToday: PunchEvent[];
}

export const WorkerDayStatusRef = builder
  .objectRef<WorkerDayStatus>("WorkerDayStatus")
  .implement({
    fields: (t) => ({
      workerId: t.exposeID("workerId"),
      status: t.field({ type: WorkerStatusEnum, resolve: (s) => s.status }),
      lastPunchAt: t.exposeString("lastPunchAt", { nullable: true }),
      punchesToday: t.field({
        type: [PunchEventRef],
        resolve: (s) => s.punchesToday,
      }),
    }),
  });
