# 04. GraphQL スキーマ案

Pothos（コードファースト）で組む前提の**スキーマ草案**。ここでは分かりやすさのため SDL で書く。実装は Pothos の builder で型安全に定義する。

## 型定義

```graphql
enum PunchType {
  CLOCK_IN
  CLOCK_OUT
  # 休憩は「一旦退勤」で運用するため MVP は上記2種のみ。将来ここに BREAK_* を足せる。
}

enum WorkerStatus {
  NOT_CLOCKED_IN
  WORKING
  CLOCKED_OUT
}

enum EmployeeRole {
  ADMIN
  MANAGER
}

type Worker {
  id: ID!
  name: String!
  displayName: String!
  nameKana: String
  active: Boolean!
  createdAt: String!
}

type Employee {
  sub: ID!
  email: String!
  name: String!
  role: EmployeeRole!
}

type PunchEvent {
  id: ID!
  workerId: ID!
  type: PunchType!
  occurredAt: String!      # サーバー時刻（真実）
  businessDate: String!    # JST 業務日
  corrected: Boolean!
  note: String
}

# あるアルバイトの当日サマリ（kiosk がボタン出し分けに使う）
type WorkerDayStatus {
  workerId: ID!
  status: WorkerStatus!
  lastPunchAt: String
  punchesToday: [PunchEvent!]!
}
```

## オペレーションと認可

**認可モード**は resolver の context で判定する（[02-architecture.md](./02-architecture.md) 参照）。表の「認可」列がそのオペレーションに要求される認証モード。

### Query

| オペレーション | 認可 | 説明 |
| --- | --- | --- |
| `workers: [Worker!]!` | 🔑 apiKey | 有効なアルバイト一覧（かな順）。kiosk の名前選択に使用 |
| `workerStatus(workerId: ID!): WorkerDayStatus!` | 🔑 apiKey | 当日状態。kiosk のボタン出し分け |
| `me: Employee!` | 🔒 cognito | ログイン中の社員自身 |
| `punchesByDate(date: String!): [PunchEvent!]!` | 🔒 cognito | 指定日の全打刻（管理画面） |
| `workerPunches(workerId: ID!, from: String!, to: String!): [PunchEvent!]!` | 🔒 cognito | 個人の期間別打刻 |
| `allWorkers(includeInactive: Boolean): [Worker!]!` | 🔒 cognito | 退職者含む管理用一覧 |

### Mutation

| オペレーション | 認可 | 説明 |
| --- | --- | --- |
| `punch(workerId: ID!, type: PunchType!): PunchEvent!` | 🔑 apiKey | 打刻。**時刻はサーバーが決める**（引数で時刻は受けない） |
| `createWorker(input: CreateWorkerInput!): Worker!` | 🔒 cognito | アルバイト追加 |
| `updateWorker(id: ID!, input: UpdateWorkerInput!): Worker!` | 🔒 cognito | アルバイト編集 |
| `deactivateWorker(id: ID!): Worker!` | 🔒 cognito | 退職処理（active=false） |
| `correctPunch(id: ID!, input: CorrectPunchInput!): PunchEvent!` | 🔒 cognito | 打刻の補正 |
| `createManualPunch(input: ManualPunchInput!): PunchEvent!` | 🔒 cognito | 打刻漏れの手動追加 |

```graphql
input CreateWorkerInput { name: String!, displayName: String, nameKana: String }
input UpdateWorkerInput { name: String, displayName: String, nameKana: String, active: Boolean }
input CorrectPunchInput { occurredAt: String, type: PunchType, note: String }
input ManualPunchInput { workerId: ID!, type: PunchType!, occurredAt: String!, note: String }
```

## 重要な設計ポイント

- **`punch` は時刻を引数に取らない**。キオスク端末の時計を信用せず、Lambda のサーバー時刻を `occurredAt` にする。手動での時刻指定は社員専用の `createManualPunch` / `correctPunch` に隔離する。
- **キオスクの公開範囲を最小化**。apiKey で叩けるのは `workers` / `workerStatus` / `punch` の3つだけ。個人の過去履歴一括取得や社員データは cognito 必須。
- **エラー方針**: `extensions.code` で最低限3系統を返す — `FORBIDDEN`（認可違反）/ `NOT_FOUND`（対象なし）/ `BAD_USER_INPUT`（zod 検証失敗）。細かいコードは実装時に足す。
- **`punch` の連打対策（確定）**: サーバ側で同一 worker・同一 `type` の直近 N 秒（既定60秒）を重複とみなし無視し、既存イベントを返す（[03-data-model.md](./03-data-model.md) 参照）。クライアントは追加で `idempotencyKey`（任意）を送れるようにし、あれば同一キーの再送を吸収する。

## 確定 / 先送り

- ✅ **連打対策**はサーバ側の時間窓デデュープで確定（上記）。`idempotencyKey` は任意の補助。
- **購読（Subscription）**: MVP は**不要**。管理画面は必要ならポーリングで更新。リアルタイム要件が出たら Yoga + SSE を検討。
- **ページネーション**: `punchesByDate` は1日分なので**当面不要**。期間検索が伸びたら cursor ベースを導入。
