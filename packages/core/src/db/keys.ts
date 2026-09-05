// DynamoDB シングルテーブルのキー組み立て（docs/03-data-model.md）。
// キーの文字列生成をここに集約し、resolver / repository から直に文字列連結しない。

export const PK = {
  location: (locationId: string): string => `LOCATION#${locationId}`,
  worker: (workerId: string): string => `WORKER#${workerId}`,
  employee: (sub: string): string => `EMPLOYEE#${sub}`,
} as const;

export const SK = {
  profile: "PROFILE",
  punchPrefix: "PUNCH#",
  punch: (occurredAt: string, id: string): string => `PUNCH#${occurredAt}#${id}`,
  auditPrefix: "AUDIT#",
  audit: (ts: string, id: string): string => `AUDIT#${ts}#${id}`,
} as const;

// GSI1: 有効な Worker の拠点別一覧（スパース。active な Worker のみキーを持つ）。
// あわせて、全 Location の一覧にも GSI1 を使う（固定パーティション "LOCATIONS"）。
// Worker とは GSI1PK が異なる（LOCATION#xxx vs LOCATIONS）ため衝突しない。Scan を避けられる。
export const GSI1 = {
  pk: (locationId: string): string => `LOCATION#${locationId}`,
  sk: (nameKana: string, workerId: string): string => `${nameKana}#WORKER#${workerId}`,
  locationsPk: "LOCATIONS",
  locationSk: (name: string, locationId: string): string => `${name}#${locationId}`,
} as const;

// GSI2: 拠点＋営業日別の打刻一覧。
export const GSI2 = {
  pk: (locationId: string, businessDate: string): string => `LOCATION#${locationId}#${businessDate}`,
  sk: (occurredAt: string, workerId: string): string => `${occurredAt}#WORKER#${workerId}`,
} as const;
