import { computeBusinessDate, computeWorkerStatus, type PunchEvent } from "@open-punch/core";
import { createGraphQLError } from "graphql-yoga";
import { ulid } from "ulid";
import { builder, requireKiosk } from "./builder";
import { PunchEventRef, PunchTypeEnum, WorkerDayStatusRef, WorkerRef } from "./types";

// 連打デデュープの時間窓（既定60秒。docs/03-data-model.md）。
const DEDUP_WINDOW_MS = 60_000;

function notFound(what: string): Error {
  return createGraphQLError(`${what} not found`, { extensions: { code: "NOT_FOUND" } });
}

// --- Query（キオスクの公開オペレーション） ------------------------------------

builder.queryType({
  fields: (t) => ({
    health: t.string({ resolve: () => "ok" }),

    /** その拠点の有効なアルバイト一覧（かな順）。 */
    workers: t.field({
      type: [WorkerRef],
      args: { locationId: t.arg.string({ required: true }) },
      resolve: async (_parent, args, ctx) => {
        requireKiosk(ctx);
        return ctx.repos.workers.listActiveByLocation(args.locationId);
      },
    }),

    /** あるアルバイトの当日状態（kiosk のボタン出し分け用）。 */
    workerStatus: t.field({
      type: WorkerDayStatusRef,
      args: { workerId: t.arg.string({ required: true }) },
      resolve: async (_parent, args, ctx) => {
        requireKiosk(ctx);
        const worker = await ctx.repos.workers.get(args.workerId);
        if (!worker) throw notFound("worker");
        const location = await ctx.repos.locations.get(worker.locationId);
        if (!location) throw notFound("location");

        const today = computeBusinessDate(
          ctx.now(),
          location.timeZone,
          location.businessDayCutoffHour,
        );
        const recent = await ctx.repos.punches.recentByWorker(args.workerId, 50);
        const punchesToday = recent
          .filter((p) => p.businessDate === today)
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

        return {
          workerId: args.workerId,
          status: computeWorkerStatus(punchesToday),
          lastPunchAt: punchesToday.at(-1)?.occurredAt,
          punchesToday,
        };
      },
    }),
  }),
});

// --- Mutation（打刻） ---------------------------------------------------------

builder.mutationType({
  fields: (t) => ({
    /**
     * 打刻する。時刻はサーバーが決める（引数に取らない・UTC 保存）。
     * 直近 N 秒の同一 type は連打とみなし無視して既存イベントを返す。
     */
    punch: t.field({
      type: PunchEventRef,
      args: {
        workerId: t.arg.string({ required: true }),
        type: t.arg({ type: PunchTypeEnum, required: true }),
      },
      resolve: async (_parent, args, ctx) => {
        requireKiosk(ctx);
        const worker = await ctx.repos.workers.get(args.workerId);
        if (!worker || !worker.active) throw notFound("worker");
        const location = await ctx.repos.locations.get(worker.locationId);
        if (!location) throw notFound("location");

        const now = ctx.now();
        const occurredAt = now.toISOString();

        const [last] = await ctx.repos.punches.recentByWorker(args.workerId, 1);
        if (
          last &&
          last.type === args.type &&
          now.getTime() - Date.parse(last.occurredAt) < DEDUP_WINDOW_MS
        ) {
          return last;
        }

        const event: PunchEvent = {
          id: ulid(),
          workerId: worker.workerId,
          locationId: worker.locationId,
          type: args.type,
          occurredAt,
          timeZone: location.timeZone,
          businessDate: computeBusinessDate(
            now,
            location.timeZone,
            location.businessDayCutoffHour,
          ),
          source: "KIOSK",
          corrected: false,
          createdAt: occurredAt,
        };
        return ctx.repos.punches.create(event);
      },
    }),
  }),
});
