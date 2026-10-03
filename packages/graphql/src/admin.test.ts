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
  opts: {
    workers?: Worker[];
    locations?: Location[];
    punches?: PunchEvent[];
    /** true なら補正・手動追加のトランザクションが失敗する（ロールバック＝何も書かれない想定）。 */
    failTransaction?: boolean;
  } = {},
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
      // 実際の occurredAt 範囲での絞り込みは repository.test.ts でカバー済み。ここでは
      // resolver 側の businessDate 厳密フィルタ・認可・バリデーションを検証する。
      listByWorkerRange: async (workerId: string) => punches.filter((p) => p.workerId === workerId),
      get: async (workerId: string, occurredAt: string, id: string) =>
        punches.find((p) => p.workerId === workerId && p.occurredAt === occurredAt && p.id === id),
      correctInTransaction: async (params: { before: PunchEvent; after: PunchEvent; audit: PunchAudit }) => {
        if (opts.failTransaction) throw new Error("TransactionCanceledException");
        corrections.push(params);
        return params.after;
      },
      createManualInTransaction: async (params: { punch: PunchEvent; audit: PunchAudit }) => {
        if (opts.failTransaction) throw new Error("TransactionCanceledException");
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

const WORKER_PUNCHES = `query($workerId: String!, $from: String!, $to: String!){
  workerPunches(workerId:$workerId, from:$from, to:$to){ id occurredAt businessDate type }
}`;

describe("workerPunches（#21: 期間指定の個人別打刻）", () => {
  const punches: PunchEvent[] = [
    { ...punch, id: "P1", occurredAt: "2026-08-24T23:00:00Z", businessDate: "2026-08-24" }, // 範囲外
    { ...punch, id: "P2", occurredAt: "2026-08-25T00:01:00Z", businessDate: "2026-08-25" },
    { ...punch, id: "P3", occurredAt: "2026-08-26T00:01:00Z", businessDate: "2026-08-26" },
    { ...punch, id: "P4", occurredAt: "2026-08-27T00:01:00Z", businessDate: "2026-08-27" }, // 範囲外
  ];

  it("cognito で from〜to の businessDate に厳密一致するものだけ返す", async () => {
    const { yoga } = makeYoga({ punches });
    const r = await call(yoga, "cognito", WORKER_PUNCHES, {
      workerId: "W1",
      from: "2026-08-25",
      to: "2026-08-26",
    });
    expect(r.errors).toBeUndefined();
    expect(r.data.workerPunches.map((p: { id: string }) => p.id)).toEqual(["P2", "P3"]);
  });

  it("apiKey では FORBIDDEN", async () => {
    const { yoga } = makeYoga({ punches });
    const r = await call(yoga, "apiKey", WORKER_PUNCHES, {
      workerId: "W1",
      from: "2026-08-25",
      to: "2026-08-26",
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });

  it("from が to より後だと BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga({ punches });
    const r = await call(yoga, "cognito", WORKER_PUNCHES, {
      workerId: "W1",
      from: "2026-08-26",
      to: "2026-08-25",
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("日付形式が不正だと BAD_USER_INPUT", async () => {
    const { yoga } = makeYoga({ punches });
    const r = await call(yoga, "cognito", WORKER_PUNCHES, {
      workerId: "W1",
      from: "2026/08/25",
      to: "2026-08-26",
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
  });
});

describe("PunchAudit の記録内容・整合性（#22・鉄則8）", () => {
  const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const correctVars = (input: Record<string, unknown>) => ({
    workerId: "W1",
    id: "01P",
    occurredAt: "2026-08-25T00:01:00Z",
    input,
  });

  it("補正: 監査に id(ULID)/workerId/targetPunchId/before/after/performedBy/note/createdAt が揃い、note は trim される", async () => {
    const { yoga, corrections } = makeYoga();
    await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ occurredAt: "2026-08-25T00:05:00Z", note: "  打刻漏れのため補正  " }));

    const a = corrections[0]!.audit;
    expect(a.id).toMatch(ULID);
    expect(a).toMatchObject({
      workerId: "W1",
      action: "CORRECT",
      targetPunchId: "01P",
      before: { occurredAt: "2026-08-25T00:01:00Z", type: "CLOCK_IN" },
      after: { occurredAt: "2026-08-25T00:05:00Z", type: "CLOCK_IN" },
      performedBy: "s",
      note: "打刻漏れのため補正",
      createdAt: NOW.toISOString(),
    });
    // 補正後イベントにも実施者と理由が残る
    expect(corrections[0]!.after).toMatchObject({ corrected: true, correctedBy: "s", note: "打刻漏れのため補正" });
  });

  it("補正: type だけ変える場合 occurredAt・businessDate は維持され、監査の before/after は type だけが違う", async () => {
    const { yoga, corrections } = makeYoga();
    await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ type: "CLOCK_OUT", note: "押し間違い" }));

    const { before, after, audit } = corrections[0]!;
    expect(after.occurredAt).toBe(before.occurredAt);
    expect(after.businessDate).toBe(before.businessDate);
    expect(audit.before).toEqual({ occurredAt: before.occurredAt, type: "CLOCK_IN" });
    expect(audit.after).toEqual({ occurredAt: before.occurredAt, type: "CLOCK_OUT" });
  });

  it("補正: 日付が変わる補正は拠点TZで businessDate を再算出する（元の値を引きずらない）", async () => {
    const { yoga, corrections } = makeYoga();
    // 2026-08-25T15:30Z = 08-26 00:30 JST
    await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ occurredAt: "2026-08-25T15:30:00Z", note: "日付誤り" }));
    expect(corrections[0]!.after.businessDate).toBe("2026-08-26");
  });

  it("補正: 拠点の締め時刻(cutoff=5)を考慮して businessDate を再算出する", async () => {
    const { yoga, corrections } = makeYoga({ locations: [{ ...location, businessDayCutoffHour: 5 }] });
    // 2026-08-26T19:00Z = 08-27 04:00 JST（締め前なので 08-26 扱い）。元の businessDate(08-25) とも
    // 暦日(08-27)とも異なる値になるので、締め時刻を無視した実装・再算出しない実装のどちらも検出できる。
    await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ occurredAt: "2026-08-26T19:00:00Z", note: "夜勤の退勤" }));
    expect(corrections[0]!.after.businessDate).toBe("2026-08-26");
  });

  it("補正: 元イベントは書き換えない（before は元の値のまま。id/workerId/locationId/source/createdAt も保持）", async () => {
    const frozen = Object.freeze({ ...punch });
    const { yoga, corrections } = makeYoga({ punches: [frozen] });
    const r = await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ occurredAt: "2026-08-25T00:05:00Z", note: "x" }));

    expect(r.errors).toBeUndefined(); // frozen を書き換えようとすれば strict mode で例外になる
    expect(corrections[0]!.before).toEqual(punch);
    expect(corrections[0]!.after).toMatchObject({
      id: punch.id,
      workerId: punch.workerId,
      locationId: punch.locationId,
      source: punch.source,
      createdAt: punch.createdAt,
      timeZone: punch.timeZone,
    });
  });

  it("補正: トランザクションが失敗したらエラーを返し、何も書かれたことにならない（成功レスポンスを返さない）", async () => {
    const { yoga, corrections } = makeYoga({ failTransaction: true });
    const r = await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ occurredAt: "2026-08-25T00:05:00Z", note: "x" }));
    expect(r.errors).toBeDefined();
    expect(r.data).toBeNull();
    expect(corrections).toHaveLength(0);
  });

  it("補正: 不正な occurredAt は BAD_USER_INPUT で、トランザクションに到達しない", async () => {
    const { yoga, corrections } = makeYoga();
    const r = await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ occurredAt: "not-a-date", note: "x" }));
    expect(r.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(corrections).toHaveLength(0);
  });

  it("補正: 拠点が見つからない打刻は NOT_FOUND で、何も書かない", async () => {
    const { yoga, corrections } = makeYoga({ locations: [] });
    const r = await call(yoga, "cognito", CORRECT_PUNCH, correctVars({ note: "x" }));
    expect(r.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    expect(corrections).toHaveLength(0);
  });

  it("手動追加: 監査の after/performedBy/note/createdAt が正しく、targetPunchId は新規イベントの ID、before は無い", async () => {
    const { yoga, manualPunches } = makeYoga();
    await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_OUT", occurredAt: "2026-08-25T08:00:00Z", note: " 退勤の打刻漏れ " },
    });

    const { punch: p, audit: a } = manualPunches[0]!;
    expect(p.id).toMatch(ULID);
    expect(a.id).toMatch(ULID);
    expect(a.id).not.toBe(p.id);
    expect(a).toMatchObject({
      workerId: "W1",
      action: "MANUAL_ADD",
      targetPunchId: p.id,
      after: { occurredAt: "2026-08-25T08:00:00Z", type: "CLOCK_OUT" },
      performedBy: "s",
      note: "退勤の打刻漏れ",
      createdAt: NOW.toISOString(),
    });
    expect(a.before).toBeUndefined();
    expect(p).toMatchObject({ source: "MANUAL", corrected: false, note: "退勤の打刻漏れ", createdAt: NOW.toISOString() });
  });

  it("手動追加: サーバー時刻(createdAt)と指定時刻(occurredAt)は別物。businessDate は拠点TZで算出される", async () => {
    const { yoga, manualPunches } = makeYoga();
    await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-20T15:30:00Z", note: "過去分の追加" },
    });
    expect(manualPunches[0]!.punch.occurredAt).toBe("2026-08-20T15:30:00Z");
    expect(manualPunches[0]!.punch.createdAt).toBe(NOW.toISOString());
    expect(manualPunches[0]!.punch.businessDate).toBe("2026-08-21"); // 00:30 JST
    expect(manualPunches[0]!.punch.timeZone).toBe("Asia/Tokyo");
  });

  it("手動追加: トランザクション失敗時はエラーを返し何も書かれない", async () => {
    const { yoga, manualPunches } = makeYoga({ failTransaction: true });
    const r = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "x" },
    });
    expect(r.errors).toBeDefined();
    expect(r.data).toBeNull();
    expect(manualPunches).toHaveLength(0);
  });

  it("手動追加: 空白だけの note・不正な occurredAt は BAD_USER_INPUT で何も書かない", async () => {
    const { yoga, manualPunches } = makeYoga();
    const blankNote = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "   " },
    });
    const badDate = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "yesterday", note: "x" },
    });
    expect(blankNote.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(badDate.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(manualPunches).toHaveLength(0);
  });

  it("手動追加: 所属拠点が見つからないワーカーは NOT_FOUND で何も書かない", async () => {
    const { yoga, manualPunches } = makeYoga({ locations: [] });
    const r = await call(yoga, "cognito", CREATE_MANUAL_PUNCH, {
      input: { workerId: "W1", type: "CLOCK_IN", occurredAt: "2026-08-25T00:00:00Z", note: "x" },
    });
    expect(r.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    expect(manualPunches).toHaveLength(0);
  });
});
