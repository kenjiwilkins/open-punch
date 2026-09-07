import type { Location, Worker } from "@open-punch/core";
import { createGraphQLError } from "graphql-yoga";
import { ulid } from "ulid";
import { z } from "zod";
import { builder, requireEmployee } from "./builder";
import { LocationRef, WorkerRef } from "./types";

// 社員（admin）向けの CRUD。すべて cognito 認証必須。

// --- バリデーション -----------------------------------------------------------

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function badInput(message: string): Error {
  return createGraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function notFound(what: string): Error {
  return createGraphQLError(`${what} not found`, { extensions: { code: "NOT_FOUND" } });
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badInput(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return result.data;
}

/** undefined のキーを落として既存値を消さないようにする（部分更新用）。 */
function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const nonEmpty = z.string().trim().min(1);
const timeZone = z.string().refine(isValidTimeZone, "有効な IANA タイムゾーン名ではありません");
const cutoffHour = z.number().int().min(0).max(23);

const workerCreateSchema = z.object({
  locationId: nonEmpty,
  name: nonEmpty,
  displayName: nonEmpty,
  nameKana: nonEmpty,
});
const workerUpdateSchema = z.object({
  name: nonEmpty.optional(),
  displayName: nonEmpty.optional(),
  nameKana: nonEmpty.optional(),
  active: z.boolean().optional(),
});
const locationCreateSchema = z.object({
  name: nonEmpty,
  timeZone,
  businessDayCutoffHour: cutoffHour.optional(),
  country: nonEmpty.optional(),
});
const locationUpdateSchema = z.object({
  name: nonEmpty.optional(),
  timeZone: timeZone.optional(),
  businessDayCutoffHour: cutoffHour.optional(),
  country: nonEmpty.optional(),
  active: z.boolean().optional(),
});

// --- input types --------------------------------------------------------------

const WorkerCreateInput = builder.inputType("WorkerCreateInput", {
  fields: (t) => ({
    locationId: t.string({ required: true }),
    name: t.string({ required: true }),
    displayName: t.string({ required: true }),
    nameKana: t.string({ required: true }),
  }),
});

const WorkerUpdateInput = builder.inputType("WorkerUpdateInput", {
  fields: (t) => ({
    name: t.string({ required: false }),
    displayName: t.string({ required: false }),
    nameKana: t.string({ required: false }),
    active: t.boolean({ required: false }),
  }),
});

const LocationCreateInput = builder.inputType("LocationCreateInput", {
  fields: (t) => ({
    name: t.string({ required: true }),
    timeZone: t.string({ required: true }),
    businessDayCutoffHour: t.int({ required: false }),
    country: t.string({ required: false }),
  }),
});

const LocationUpdateInput = builder.inputType("LocationUpdateInput", {
  fields: (t) => ({
    name: t.string({ required: false }),
    timeZone: t.string({ required: false }),
    businessDayCutoffHour: t.int({ required: false }),
    country: t.string({ required: false }),
    active: t.boolean({ required: false }),
  }),
});

// --- queries ------------------------------------------------------------------

builder.queryFields((t) => ({
  /** 拠点の有効なワーカー一覧（admin 管理用・cognito）。 */
  workersByLocation: t.field({
    type: [WorkerRef],
    args: { locationId: t.arg.string({ required: true }) },
    resolve: async (_parent, args, ctx) => {
      requireEmployee(ctx);
      return ctx.repos.workers.listActiveByLocation(args.locationId);
    },
  }),
}));

// --- mutations ----------------------------------------------------------------

builder.mutationFields((t) => ({
  createWorker: t.field({
    type: WorkerRef,
    args: { input: t.arg({ type: WorkerCreateInput, required: true }) },
    resolve: async (_parent, args, ctx) => {
      requireEmployee(ctx);
      const input = parseOrThrow(workerCreateSchema, {
        locationId: args.input.locationId,
        name: args.input.name,
        displayName: args.input.displayName,
        nameKana: args.input.nameKana,
      });
      const location = await ctx.repos.locations.get(input.locationId);
      if (!location) throw badInput("locationId が存在しません");
      const now = ctx.now().toISOString();
      const worker: Worker = {
        workerId: ulid(),
        locationId: input.locationId,
        name: input.name,
        displayName: input.displayName,
        nameKana: input.nameKana,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      return ctx.repos.workers.put(worker);
    },
  }),

  updateWorker: t.field({
    type: WorkerRef,
    args: {
      workerId: t.arg.string({ required: true }),
      input: t.arg({ type: WorkerUpdateInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireEmployee(ctx);
      const patch = parseOrThrow(workerUpdateSchema, {
        name: args.input.name ?? undefined,
        displayName: args.input.displayName ?? undefined,
        nameKana: args.input.nameKana ?? undefined,
        active: args.input.active ?? undefined,
      });
      const existing = await ctx.repos.workers.get(args.workerId);
      if (!existing) throw notFound("worker");
      return ctx.repos.workers.put({
        ...existing,
        ...definedOnly(patch),
        updatedAt: ctx.now().toISOString(),
      });
    },
  }),

  /** 退職処理: active=false（GSI1 キーが外れ、キオスク一覧から消える）。 */
  deactivateWorker: t.field({
    type: WorkerRef,
    args: { workerId: t.arg.string({ required: true }) },
    resolve: async (_parent, args, ctx) => {
      requireEmployee(ctx);
      const existing = await ctx.repos.workers.get(args.workerId);
      if (!existing) throw notFound("worker");
      return ctx.repos.workers.put({
        ...existing,
        active: false,
        updatedAt: ctx.now().toISOString(),
      });
    },
  }),

  createLocation: t.field({
    type: LocationRef,
    args: { input: t.arg({ type: LocationCreateInput, required: true }) },
    resolve: async (_parent, args, ctx) => {
      requireEmployee(ctx);
      const input = parseOrThrow(locationCreateSchema, {
        name: args.input.name,
        timeZone: args.input.timeZone,
        businessDayCutoffHour: args.input.businessDayCutoffHour ?? undefined,
        country: args.input.country ?? undefined,
      });
      const now = ctx.now().toISOString();
      const location: Location = {
        locationId: ulid(),
        name: input.name,
        timeZone: input.timeZone,
        businessDayCutoffHour: input.businessDayCutoffHour ?? 0,
        country: input.country,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      return ctx.repos.locations.put(location);
    },
  }),

  updateLocation: t.field({
    type: LocationRef,
    args: {
      locationId: t.arg.string({ required: true }),
      input: t.arg({ type: LocationUpdateInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireEmployee(ctx);
      const patch = parseOrThrow(locationUpdateSchema, {
        name: args.input.name ?? undefined,
        timeZone: args.input.timeZone ?? undefined,
        businessDayCutoffHour: args.input.businessDayCutoffHour ?? undefined,
        country: args.input.country ?? undefined,
        active: args.input.active ?? undefined,
      });
      const existing = await ctx.repos.locations.get(args.locationId);
      if (!existing) throw notFound("location");
      return ctx.repos.locations.put({
        ...existing,
        ...definedOnly(patch),
        updatedAt: ctx.now().toISOString(),
      });
    },
  }),
}));
