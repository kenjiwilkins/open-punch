import type { Location, PunchEvent, Repositories, Worker } from "@open-punch/core";
import { describe, expect, it } from "vitest";
import { createYogaHandler } from "./yoga";

const ISO = "2026-08-25T00:00:00.000Z";
const NOW = new Date("2026-08-25T00:30:00Z"); // JST 09:30 → businessDate 2026-08-25

const location: Location = {
  locationId: "L1",
  name: "渋谷店",
  timeZone: "Asia/Tokyo",
  businessDayCutoffHour: 0,
  active: true,
  createdAt: ISO,
  updatedAt: ISO,
};

const worker: Worker = {
  workerId: "W1",
  locationId: "L1",
  name: "山田 太郎",
  displayName: "山田",
  nameKana: "やまだたろう",
  active: true,
  createdAt: ISO,
  updatedAt: ISO,
};

function makeRepos(
  opts: { recent?: PunchEvent[]; workers?: Worker[]; locations?: Location[]; byDate?: PunchEvent[] } = {},
) {
  const created: PunchEvent[] = [];
  const byDateCalls: { locationId: string; businessDate: string }[] = [];
  const workers = opts.workers ?? [worker];
  const locations = opts.locations ?? [location];
  const repos = {
    workers: {
      get: async (id: string) => workers.find((w) => w.workerId === id),
      listActiveByLocation: async (locId: string) =>
        workers.filter((w) => w.active && w.locationId === locId),
    },
    locations: {
      get: async (id: string) => locations.find((l) => l.locationId === id),
      list: async () => locations,
    },
    punches: {
      recentByWorker: async (_id: string, limit = 1) => (opts.recent ?? []).slice(0, limit),
      create: async (p: PunchEvent) => {
        created.push(p);
        return p;
      },
      listByLocationDate: async (locationId: string, businessDate: string) => {
        byDateCalls.push({ locationId, businessDate });
        return opts.byDate ?? [];
      },
    },
  } as unknown as Repositories;
  return { repos, created, byDateCalls };
}

function makeYoga(opts: Parameters<typeof makeRepos>[0] = {}, now: Date = NOW) {
  const { repos, created, byDateCalls } = makeRepos(opts);
  const yoga = createYogaHandler({
    repos,
    expectedApiKey: "k",
    verifyJwt: async () => ({ sub: "s", email: "e@example.com" }),
    now: () => now,
  });
  return { yoga, created, byDateCalls };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function post(yoga: ReturnType<typeof makeYoga>["yoga"], query: string, apiKey = false): Promise<any> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers["x-api-key"] = "k";
  const res = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function postCognito(yoga: ReturnType<typeof makeYoga>["yoga"], query: string): Promise<any> {
  const res = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer good.token" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

function punch(over: Partial<PunchEvent>): PunchEvent {
  return {
    id: "OLD",
    workerId: "W1",
    locationId: "L1",
    type: "CLOCK_IN",
    occurredAt: "2026-08-25T00:29:30Z",
    timeZone: "Asia/Tokyo",
    businessDate: "2026-08-25",
    source: "KIOSK",
    corrected: false,
    createdAt: "2026-08-25T00:29:30Z",
    ...over,
  };
}

describe("認可（キオスク公開オペレーション）", () => {
  it("apiKey なしの workers は FORBIDDEN", async () => {
    const { yoga } = makeYoga();
    const r = await post(yoga, `{ workers(locationId:"L1"){ id } }`);
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });

  it("apiKey なしの punch は FORBIDDEN（書き込まない）", async () => {
    const { yoga, created } = makeYoga();
    const r = await post(yoga, `mutation { punch(workerId:"W1", type:CLOCK_IN){ id } }`);
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(created).toHaveLength(0);
  });

  it("apiKey ありの workers はその拠点の有効ワーカーを返す", async () => {
    const { yoga } = makeYoga();
    const r = await post(yoga, `{ workers(locationId:"L1"){ id displayName } }`, true);
    expect(r.data.workers).toEqual([{ id: "W1", displayName: "山田" }]);
  });

  it("cognito モードでも kiosk 操作(workers)は FORBIDDEN（apiKey 専用）", async () => {
    const { yoga } = makeYoga();
    const res = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer good.token" },
      body: JSON.stringify({ query: `{ workers(locationId:"L1"){ id } }` }),
    });
    const r = await res.json();
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });
});

describe("NOT_FOUND", () => {
  it("存在しない worker への punch は NOT_FOUND（書き込まない）", async () => {
    const { yoga, created } = makeYoga({ workers: [] });
    const r = await post(yoga, `mutation { punch(workerId:"ZZ", type:CLOCK_IN){ id } }`, true);
    expect(r.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    expect(created).toHaveLength(0);
  });

  it("存在しない worker の workerStatus は NOT_FOUND", async () => {
    const { yoga } = makeYoga({ workers: [] });
    const r = await post(yoga, `{ workerStatus(workerId:"ZZ"){ status } }`, true);
    expect(r.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
  });
});

describe("punch（サーバー時刻・businessDate）", () => {
  it("サーバー時刻(UTC)を採用し、拠点TZで businessDate を確定する", async () => {
    const { yoga, created } = makeYoga();
    const r = await post(
      yoga,
      `mutation { punch(workerId:"W1", type:CLOCK_IN){ type occurredAt timeZone businessDate } }`,
      true,
    );
    expect(r.data.punch.occurredAt).toBe("2026-08-25T00:30:00.000Z");
    expect(r.data.punch.businessDate).toBe("2026-08-25");
    expect(r.data.punch.timeZone).toBe("Asia/Tokyo");
    expect(created).toHaveLength(1);
    expect(created[0]?.source).toBe("KIOSK");
  });
});

describe("連打デデュープ", () => {
  it("同一 type・60秒以内は無視して既存を返す（書き込まない）", async () => {
    const { yoga, created } = makeYoga({
      recent: [punch({ id: "OLD", type: "CLOCK_IN", occurredAt: "2026-08-25T00:29:30Z" })],
    });
    const r = await post(yoga, `mutation { punch(workerId:"W1", type:CLOCK_IN){ id } }`, true);
    expect(r.data.punch.id).toBe("OLD");
    expect(created).toHaveLength(0);
  });

  it("別 type なら60秒以内でも記録する", async () => {
    const { yoga, created } = makeYoga({
      recent: [punch({ id: "OLD", type: "CLOCK_IN", occurredAt: "2026-08-25T00:29:30Z" })],
    });
    const r = await post(yoga, `mutation { punch(workerId:"W1", type:CLOCK_OUT){ id type } }`, true);
    expect(r.data.punch.type).toBe("CLOCK_OUT");
    expect(created).toHaveLength(1);
  });

  it("同一 type でも60秒より前なら記録する", async () => {
    const { yoga, created } = makeYoga({
      recent: [punch({ id: "OLD", type: "CLOCK_IN", occurredAt: "2026-08-25T00:28:00Z" })],
    });
    await post(yoga, `mutation { punch(workerId:"W1", type:CLOCK_IN){ id } }`, true);
    expect(created).toHaveLength(1);
  });
});

describe("workerStatus", () => {
  it("当日の打刻から状態を算出する", async () => {
    const { yoga } = makeYoga({
      recent: [punch({ id: "P1", type: "CLOCK_IN", businessDate: "2026-08-25" })],
    });
    const r = await post(
      yoga,
      `{ workerStatus(workerId:"W1"){ status lastPunchAt punchesToday { type } } }`,
      true,
    );
    expect(r.data.workerStatus.status).toBe("WORKING");
    expect(r.data.workerStatus.punchesToday).toEqual([{ type: "CLOCK_IN" }]);
  });

  it("別営業日の打刻は当日に含めない（未出勤）", async () => {
    const { yoga } = makeYoga({
      recent: [punch({ id: "P0", type: "CLOCK_IN", businessDate: "2026-08-24" })],
    });
    const r = await post(yoga, `{ workerStatus(workerId:"W1"){ status } }`, true);
    expect(r.data.workerStatus.status).toBe("NOT_CLOCKED_IN");
  });
});

describe("admin operations（cognito 必須）", () => {
  it("locations は apiKey では FORBIDDEN", async () => {
    const { yoga } = makeYoga();
    const r = await post(yoga, `{ locations { id name } }`, true);
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });

  it("locations は cognito で拠点一覧を返す", async () => {
    const { yoga } = makeYoga();
    const r = await postCognito(yoga, `{ locations { id name timeZone } }`);
    expect(r.data.locations).toEqual([{ id: "L1", name: "渋谷店", timeZone: "Asia/Tokyo" }]);
  });

  it("punchesByDate は未認証(none)では FORBIDDEN", async () => {
    const { yoga } = makeYoga();
    const r = await post(yoga, `{ punchesByDate(locationId:"L1"){ id } }`);
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });

  it("punchesByDate は businessDate 省略時に拠点TZの当日で引く", async () => {
    const p = punch({ id: "P1", type: "CLOCK_IN", businessDate: "2026-08-25" });
    const { yoga, byDateCalls } = makeYoga({ byDate: [p] });
    const r = await postCognito(
      yoga,
      `{ punchesByDate(locationId:"L1"){ id type occurredAt worker { displayName } } }`,
    );
    expect(byDateCalls).toEqual([{ locationId: "L1", businessDate: "2026-08-25" }]);
    expect(r.data.punchesByDate).toEqual([
      { id: "P1", type: "CLOCK_IN", occurredAt: p.occurredAt, worker: { displayName: "山田" } },
    ]);
  });

  it("punchesByDate は businessDate 明示ならそれで引く", async () => {
    const { yoga, byDateCalls } = makeYoga({ byDate: [] });
    await postCognito(yoga, `{ punchesByDate(locationId:"L1", businessDate:"2026-08-20"){ id } }`);
    expect(byDateCalls).toEqual([{ locationId: "L1", businessDate: "2026-08-20" }]);
  });
});
