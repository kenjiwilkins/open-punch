import type { Location, PunchAudit, PunchEvent, Repositories, Worker } from "@open-punch/core";
import { describe, expect, it } from "vitest";
import { createYogaHandler } from "./yoga";

const NOW = new Date("2026-08-25T00:30:00Z");
const ISO = "2026-08-20T00:00:00.000Z";

const location: Location = {
  locationId: "L1",
  name: "渋谷店",
  timeZone: "Asia/Tokyo",
  businessDayCutoffHour: 0,
  country: "JP",
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

const punch: PunchEvent = {
  id: "01P",
  workerId: "W1",
  locationId: "L1",
  type: "CLOCK_IN",
  occurredAt: "2026-08-25T00:01:00Z",
  timeZone: "Asia/Tokyo",
  businessDate: "2026-08-25",
  source: "KIOSK",
  corrected: false,
  createdAt: "2026-08-25T00:01:00Z",
};

function makeRepos(
  opts: { workers?: Worker[]; locations?: Location[]; punches?: PunchEvent[] } = {},
) {
  const workerPuts: Worker[] = [];
  const locationPuts: Location[] = [];
  const corrections: { before: PunchEvent; after: PunchEvent; audit: PunchAudit }[] = [];
  const manualPunches: { punch: PunchEvent; audit: PunchAudit }[] = [];
  const workers = opts.workers ?? [worker];
  const locations = opts.locations ?? [location];
  const punches = opts.punches ?? [punch];
  const repos = {
    workers: {
      get: async (id: string) => workers.find((w) => w.workerId === id),
      put: async (w: Worker) => {
        workerPuts.push(w);
        return w;
      },
      listActiveByLocation: async (locId: string) =>
        workers.filter((w) => w.active && w.locationId === locId),
    },
    locations: {
      get: async (id: string) => locations.find((l) => l.locationId === id),
      put: async (l: Location) => {
        locationPuts.push(l);
        return l;
      },
      list: async () => locations,
    },
    punches: {
      get: async (workerId: string, occurredAt: string, id: string) =>
        punches.find((p) => p.workerId === workerId && p.occurredAt === occurredAt && p.id === id),
      correctInTransaction: async (params: { before: PunchEvent; after: PunchEvent; audit: PunchAudit }) => {
        corrections.push(params);
        return params.after;
      },
      createManualInTransaction: async (params: { punch: PunchEvent; audit: PunchAudit }) => {
        manualPunches.push(params);
        return params.punch;
      },
    },
  } as unknown as Repositories;
  return { repos, workerPuts, locationPuts, corrections, manualPunches };
}

function makeYoga(opts: Parameters<typeof makeRepos>[0] = {}) {
  const { repos, workerPuts, locationPuts, corrections, manualPunches } = makeRepos(opts);
  const yoga = createYogaHandler({
    repos,
    expectedApiKey: "k",
    verifyJwt: async () => ({ sub: "s", email: "e@example.com" }),
    now: () => NOW,
  });
  return { yoga, workerPuts, locationPuts, corrections, manualPunches };
}

type Vars = Record<string, unknown>;
async function call(
  yoga: ReturnType<typeof makeYoga>["yoga"],
  auth: "cognito" | "apiKey",
  query: string,
  variables?: Vars,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth === "cognito") headers.authorization = "Bearer good.token";
  else headers["x-api-key"] = "k";
  const res = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const CREATE_WORKER = `mutation($input: WorkerCreateInput!){ createWorker(input:$input){ id name displayName active } }`;
const UPDATE_WORKER = `mutation($id: String!, $input: WorkerUpdateInput!){ updateWorker(workerId:$id, input:$input){ id displayName active } }`;
const DEACTIVATE_WORKER = `mutation($id: String!){ deactivateWorker(workerId:$id){ id active } }`;
const CREATE_LOCATION = `mutation($input: LocationCreateInput!){ createLocation(input:$input){ id name timeZone businessDayCutoffHour active } }`;
const UPDATE_LOCATION = `mutation($id: String!, $input: LocationUpdateInput!){ updateLocation(locationId:$id, input:$input){ id name } }`;

describe("Worker CRUD", () => {
  it("createWorker は cognito で作成し active=true / 時刻を設定", async () => {
    const { yoga, workerPuts } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_WORKER, {
      input: { locationId: "L1", name: "鈴木 花子", displayName: "鈴木", nameKana: "すずきはなこ" },
    });
    expect(r.data.createWorker.active).toBe(true);
    expect(r.data.createWorker.displayName).toBe("鈴木");
    expect(workerPuts).toHaveLength(1);
    expect(workerPuts[0]?.active).toBe(true);
    expect(workerPuts[0]?.createdAt).toBe(NOW.toISOString());
    expect(workerPuts[0]?.workerId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // ULID
  });

  it("createWorker は apiKey では FORBIDDEN", async () => {
    const { yoga, workerPuts } = makeYoga();
    const r = await call(yoga, "apiKey", CREATE_WORKER, {
      input: { locationId: "L1", name: "x", displayName: "x", nameKana: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(workerPuts).toHaveLength(0);
  });

  it("createWorker は空名で BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_WORKER, {
      input: { locationId: "L1", name: "  ", displayName: "x", nameKana: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("createWorker は存在しない locationId で BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_WORKER, {
      input: { locationId: "NOPE", name: "a", displayName: "a", nameKana: "a" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("updateWorker は部分更新（displayName のみ）で他を保持", async () => {
    const { yoga, workerPuts } = makeYoga();
    const r = await call(yoga, "cognito", UPDATE_WORKER, {
      id: "W1",
      input: { displayName: "山田T" },
    });
    expect(r.data.updateWorker.displayName).toBe("山田T");
    expect(workerPuts[0]?.name).toBe("山田 太郎"); // 既存を保持
    expect(workerPuts[0]?.updatedAt).toBe(NOW.toISOString());
  });

  it("updateWorker は存在しないと NOT_FOUND", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", UPDATE_WORKER, { id: "ZZ", input: { displayName: "x" } });
    expect(r.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
  });

  it("deactivateWorker は active=false で put する", async () => {
    const { yoga, workerPuts } = makeYoga();
    const r = await call(yoga, "cognito", DEACTIVATE_WORKER, { id: "W1" });
    expect(r.data.deactivateWorker.active).toBe(false);
    expect(workerPuts[0]?.active).toBe(false);
  });

  it("workersByLocation は cognito で有効ワーカー、apiKey は FORBIDDEN", async () => {
    const { yoga } = makeYoga();
    const q = `{ workersByLocation(locationId:"L1"){ id } }`;
    expect((await call(yoga, "cognito", q)).data.workersByLocation).toHaveLength(1);
    expect((await call(yoga, "apiKey", q)).errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });
});

describe("Location CRUD", () => {
  it("createLocation は cutoff 既定0・active=true で作成", async () => {
    const { yoga, locationPuts } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_LOCATION, {
      input: { name: "Adelaide", timeZone: "Australia/Adelaide" },
    });
    expect(r.data.createLocation.businessDayCutoffHour).toBe(0);
    expect(r.data.createLocation.active).toBe(true);
    expect(locationPuts[0]?.timeZone).toBe("Australia/Adelaide");
  });

  it("createLocation は不正な timeZone で BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_LOCATION, {
      input: { name: "x", timeZone: "Not/AZone" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("createLocation は cutoffHour 範囲外(24)で BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_LOCATION, {
      input: { name: "x", timeZone: "Asia/Tokyo", businessDayCutoffHour: 24 },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("updateLocation は部分更新で既存の country を消さない", async () => {
    const { yoga, locationPuts } = makeYoga();
    await call(yoga, "cognito", UPDATE_LOCATION, { id: "L1", input: { name: "渋谷本店" } });
    expect(locationPuts[0]?.name).toBe("渋谷本店");
    expect(locationPuts[0]?.country).toBe("JP"); // 既存を保持
  });
});

const CORRECT_PUNCH = `mutation($workerId: String!, $id: String!, $occurredAt: String!, $input: CorrectPunchInput!){
  correctPunch(workerId:$workerId, id:$id, occurredAt:$occurredAt, input:$input){
    id occurredAt type corrected businessDate note
  }
}`;
const CREATE_MANUAL_PUNCH = `mutation($input: ManualPunchInput!){
  createManualPunch(input:$input){ id workerId type occurredAt businessDate corrected note }
}`;

describe("correctPunch / createManualPunch（鉄則8: PunchAudit を TransactWriteItems で原子的に）", () => {
  it("correctPunch は cognito で occurredAt/type を補正し、PunchAudit(before/after) を同一トランザクションで残す", async () => {
    const { yoga, corrections } = makeYoga();
    const r = await call(yoga, "cognito", CORRECT_PUNCH, {
      workerId: "W1",
      id: "01P",
      occurredAt: "2026-08-25T00:01:00Z",
      input: { occurredAt: "2026-08-25T00:05:00Z", type: "CLOCK_IN", note: "打刻漏れのため補正" },
    });
    expect(r.errors).toBeUndefined();
    expect(r.data.correctPunch.occurredAt).toBe("2026-08-25T00:05:00Z");
    expect(r.data.correctPunch.corrected).toBe(true);
    expect(r.data.correctPunch.note).toBe("打刻漏れのため補正");

    expect(corrections).toHaveLength(1);
    expect(corrections[0]!.before.occurredAt).toBe("2026-08-25T00:01:00Z"); // 元イベントは不変
    expect(corrections[0]!.after.occurredAt).toBe("2026-08-25T00:05:00Z");
    expect(corrections[0]!.audit.action).toBe("CORRECT");
    expect(corrections[0]!.audit.before).toEqual({ occurredAt: "2026-08-25T00:01:00Z", type: "CLOCK_IN" });
    expect(corrections[0]!.audit.after).toEqual({ occurredAt: "2026-08-25T00:05:00Z", type: "CLOCK_IN" });
    expect(corrections[0]!.audit.performedBy).toBe("s");
    expect(corrections[0]!.audit.note).toBe("打刻漏れのため補正");
  });

  it("correctPunch は apiKey では FORBIDDEN", async () => {
    const { yoga, corrections } = makeYoga();
    const r = await call(yoga, "apiKey", CORRECT_PUNCH, {
      workerId: "W1",
      id: "01P",
      occurredAt: "2026-08-25T00:01:00Z",
      input: { note: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(corrections).toHaveLength(0);
  });

  it("correctPunch は note なしでは BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CORRECT_PUNCH, {
      workerId: "W1",
      id: "01P",
      occurredAt: "2026-08-25T00:01:00Z",
      input: { note: "  " },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("correctPunch は対象が見つからないと NOT_FOUND", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CORRECT_PUNCH, {
      workerId: "W1",
      id: "NOPE",
      occurredAt: "2026-08-25T00:01:00Z",
      input: { note: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
  });

  it("createManualPunch は cognito で新規 PunchEvent(source=MANUAL) を作り、PunchAudit(MANUAL_ADD) を同一トランザクションで残す", async () => {
    const { yoga, manualPunches } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "打刻漏れのため追加" },
    });
    expect(r.errors).toBeUndefined();
    expect(r.data.createManualPunch.workerId).toBe("W1");
    expect(r.data.createManualPunch.corrected).toBe(false);
    expect(r.data.createManualPunch.businessDate).toBe("2026-08-25");

    expect(manualPunches).toHaveLength(1);
    expect(manualPunches[0]!.punch.source).toBe("MANUAL");
    expect(manualPunches[0]!.audit.action).toBe("MANUAL_ADD");
    expect(manualPunches[0]!.audit.before).toBeUndefined();
    expect(manualPunches[0]!.audit.performedBy).toBe("s");
  });

  it("createManualPunch は apiKey では FORBIDDEN", async () => {
    const { yoga, manualPunches } = makeYoga();
    const r = await call(yoga, "apiKey", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    expect(manualPunches).toHaveLength(0);
  });

  it("createManualPunch は note なしでは BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("createManualPunch は存在しない workerId で BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga();
    const r = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "NOPE", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });
});
