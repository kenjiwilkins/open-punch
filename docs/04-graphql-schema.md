# 04. GraphQL スキーマ案 🟡 要レビュー

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
- **エラー方針**: 認可違反は `FORBIDDEN`、対象なしは `NOT_FOUND` の拡張エラーコードを返す。🟡 エラーコード体系は実装時に確定。

## 🟡 未決事項

1. `punch` の**冪等性**: クライアント生成の `idempotencyKey` を受けて連打を吸収するか（[03](./03-data-model.md) の連打対策と合わせて決める）。
2. **購読（Subscription）**: 管理画面で打刻をリアルタイム表示したいか。要るなら Yoga + SSE か AppSync 再検討。MVP は不要（ポーリング）で提案。
3. **ページネーション**: `punchesByDate` は1日分なので当面不要。期間検索が伸びたら cursor 導入。
