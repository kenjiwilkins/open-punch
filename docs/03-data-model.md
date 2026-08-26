# 03. データモデル（DynamoDB シングルテーブル）

主要な設計判断は合意済み（末尾「確定事項」）。細部は実装しながら調整する。

## 設計方針

- **シングルテーブル設計**。テーブル名 `OpenPunch`。
- キー: `PK`（パーティションキー）/ `SK`（ソートキー）。
- GSI を2本:
  - **GSI1**（キオスクの名前一覧用・スパースインデックス）: `GSI1PK` / `GSI1SK`
  - **GSI2**（管理画面の日付別打刻用）: `GSI2PK` / `GSI2SK`
- **打刻はイベントとして記録**（イベントソーシング寄り）。「勤務中/休憩中/退勤済」という状態は、最新イベントから**算出**する。状態カラムを持って更新するより、打刻の履歴が壊れにくい。

## タイムゾーンの扱い（多拠点・多国対応）

このアプリは**日本とオーストラリアで使われる**。**タイムゾーンは拠点（Location）単位**で持つ。

- `occurredAt`（打刻の瞬間）は **UTC で保存**する（絶対時刻・TZ非依存）。
- `businessDate`（営業日）は、その打刻が起きた **Location の IANA タイムゾーン**（`Asia/Tokyo` / `Australia/Sydney` など）で算出する。豪州は **DST・30分刻み・国内複数TZ**があるため、固定オフセット（例: UTC+10）は使わない。
- 詳細は後述「業務日（businessDate）の算出」。

## エンティティ

### Location（拠点）

| 属性 | 例 | 説明 |
| --- | --- | --- |
| `PK` | `LOCATION#01H...` | |
| `SK` | `PROFILE` | |
| `locationId` | `01H...` | |
| `name` | `渋谷店` / `Sydney CBD` | |
| `timeZone` | `Asia/Tokyo` / `Australia/Sydney` | **IANA タイムゾーン名**。businessDate 算出の基準 |
| `businessDayCutoffHour` | `0` | 営業日の締め時刻（時, 0-23）。MVP は 0（暦日） |
| `country` | `JP` / `AU` | 任意。表示・フィルタ用 |
| `active` | `true` | |
| `createdAt` / `updatedAt` | ISO8601 | |

- kiosk 端末は1つの Location に紐づく（どの店の iPad か）。MVP は kiosk アプリの設定で `locationId` を持たせる。将来は API キーを Location 単位にして端末とひも付ける。

### Worker（アルバイト）

| 属性 | 例 | 説明 |
| --- | --- | --- |
| `PK` | `WORKER#01J...`（ULID） | |
| `SK` | `PROFILE` | |
| `GSI1PK` | `LOCATION#01H...`（active な時のみ設定） | スパース: その拠点の有効なアルバイトだけ一覧に出る |
| `GSI1SK` | `やまだたろう#WORKER#01J...` | 表示順（読み仮名ソート）＋一意性 |
| `workerId` | `01J...` | |
| `locationId` | `01H...` | 所属拠点。businessDate はこの拠点の TZ で算出 |
| `name` | `山田 太郎` | |
| `displayName` | `山田`（一覧に出す名前） | 同姓対策に本名と表示名を分ける（確定） |
| `nameKana` | `やまだたろう` | ソート・検索用 |
| `active` | `true` | 退職者は `false`（＝GSI1 キーを外す） |
| `createdAt` / `updatedAt` | ISO8601 | |

### Employee（社員）

| 属性 | 例 | 説明 |
| --- | --- | --- |
| `PK` | `EMPLOYEE#<cognitoSub>` | Cognito の sub に紐づく |
| `SK` | `PROFILE` | |
| `sub` | Cognito sub | |
| `email` | `a@example.com` | |
| `name` | `佐藤 花子` | |
| `role` | `ADMIN` | MVP は全員 `ADMIN`。フィールドは持つが権限分岐はしない（将来 `MANAGER` 等を追加する余地） |
| `createdAt` | ISO8601 | |

### PunchEvent（打刻イベント）

| 属性 | 例 | 説明 |
| --- | --- | --- |
| `PK` | `WORKER#01J...` | 打刻したアルバイト |
| `SK` | `PUNCH#2026-08-25T09:01:33Z#01K...` | 時刻順ソート（ISO ＋ ULID で一意化） |
| `GSI2PK` | `LOCATION#01H...#2026-08-25` | 拠点＋業務日（その拠点の TZ 基準） |
| `GSI2SK` | `2026-08-25T09:01:33Z#WORKER#01J...` | 日内で時刻・人順 |
| `type` | `CLOCK_IN` | 打刻種別（下記） |
| `occurredAt` | ISO8601 **UTC**（`...Z`） | **真実の打刻時刻**（サーバーが決定・UTC保存） |
| `locationId` | `01H...` | 打刻拠点 |
| `timeZone` | `Asia/Tokyo` | 打刻時の拠点TZのスナップショット（後から拠点TZを変えても過去を再現できる） |
| `businessDate` | `2026-08-25` | 拠点TZ基準の業務日。集計キー |
| `source` | `KIOSK` | 打刻経路 |
| `deviceId` | `ipad-front-01` | 将来デバイス制限を入れる場合に使用（MVP では任意） |
| `corrected` | `false` | 補正されたか |
| `correctedBy` | `<employeeSub>` | 補正した社員 |
| `note` | `打刻漏れを補正` | 補正メモ |
| `createdAt` | ISO8601 | レコード作成時刻 |

### PunchAudit（打刻補正の監査履歴）

打刻を補正/手動追加したとき、**元イベントは書き換えず**、監査レコードを別途残す（合意済み）。「いつ・誰が・何を・なぜ変えたか」を後から必ず追える状態にする。

| 属性 | 例 | 説明 |
| --- | --- | --- |
| `PK` | `WORKER#01J...` | 対象アルバイト |
| `SK` | `AUDIT#2026-08-25T18:20:00Z#01K...` | 監査ログの時系列 |
| `action` | `CORRECT` / `MANUAL_ADD` / `DELETE` | 補正種別 |
| `targetPunchId` | `01K...` | 対象の PunchEvent（手動追加は新規 ID） |
| `before` | `{ occurredAt, type }` | 変更前スナップショット（補正時） |
| `after` | `{ occurredAt, type }` | 変更後スナップショット |
| `performedBy` | `<employeeSub>` | 実施した社員 |
| `note` | `打刻漏れのため9:00で追加` | 理由（必須にする） |
| `createdAt` | ISO8601 | |

- 補正フロー: ① 対象 PunchEvent を更新（`corrected=true`, `correctedBy`, 新しい値）② PunchAudit を追加。この2つを **TransactWriteItems** で原子的に書く。
- 監査ログは削除・更新しない（append-only）。

**打刻種別 `type`**（MVP は2種のみ）:
- `CLOCK_IN`（出勤）
- `CLOCK_OUT`（退勤）

> **休憩は打刻種別を持たない**（合意済み）。休憩に入るときは一旦 `CLOCK_OUT`、戻ったら `CLOCK_IN` する運用。イベントモデルなので1日に複数回の出勤/退勤ペアが自然に記録される。将来 `BREAK_START`/`BREAK_END` を足したくなっても enum を拡張するだけで済むよう、`type` は文字列 enum として持つ。

## アクセスパターン

| # | 誰が | やりたいこと | 実装 |
| --- | --- | --- | --- |
| 1 | kiosk | その拠点の有効なアルバイト一覧（かな順） | GSI1: `GSI1PK = LOCATION#<locationId>` を Query |
| 2 | kiosk | あるアルバイトの現在状態 | 主テーブル: `PK = WORKER#id`, `SK begins_with PUNCH#` の直近を取得し、拠点TZの当日 businessDate と突き合わせて算出 |
| 3 | kiosk | 打刻する | `PutItem`（PunchEvent）※サーバー時刻(UTC)を採用 |
| 4 | admin | 拠点の指定営業日の全打刻 | GSI2: `GSI2PK = LOCATION#<locationId>#<businessDate>` を Query |
| 5 | admin | 個人の期間別打刻 | 主テーブル: `PK = WORKER#id`, `SK between PUNCH#<from> and PUNCH#<to>` |
| 6 | admin | アルバイト CRUD / 拠点一覧 | `PK = WORKER#id` / `PK = LOCATION#...` |
| 7 | admin | 自分（社員）の情報取得 | `PK = EMPLOYEE#<sub>` |

主要パターンはこの7つ。admin は**拠点（Location）でスコープ**して見る（横断集計は現時点で不要）。GSI2 が拠点＋営業日なので Scan せずにその店のその日の全打刻を取れる。

## 状態の算出ロジック（案）

あるアルバイトの「今日の状態」は、当日の打刻を時刻順に畳み込んで決める:

```
初期: NOT_CLOCKED_IN（未出勤）
CLOCK_IN   → WORKING（勤務中）
CLOCK_OUT  → CLOCKED_OUT（退勤済）
```

- kiosk はこの状態を見て、出せるボタンを出し分ける（未出勤／退勤済なら「出勤」、勤務中なら「退勤」）。
- 一度 `CLOCKED_OUT` になった後にまた `CLOCK_IN` できる（＝休憩・中抜け・再出勤）。当日の状態は「最新イベント」で決まる。

## 業務日（businessDate）の算出 — 拠点TZ基準・締め時刻対応

- `occurredAt` は **UTC で保存**（絶対時刻）。`businessDate` は **拠点（Location）の IANA タイムゾーン**で算出する。
- **固定オフセット（引き算）方式は使わない**。豪州の DST・30分刻みで壊れるため。代わりに:
  - `Intl.DateTimeFormat`（Node標準・追加依存なし・フルICUでDST対応）で、その UTC 時刻を拠点TZの**現地の壁時計（年・月・日・時）**に変換する。
  - `businessDayCutoffHour`（既定0）未満の時刻なら**暦日を1日戻す**（instant 演算ではなくカレンダー演算なので DST 境界でも安全）。
- 算出は **1つの純関数に閉じ込める**: `computeBusinessDate(occurredAt, timeZone, cutoffHour = 0): string`。
  - `timeZone` は打刻拠点の `Location.timeZone`、`cutoffHour` は `Location.businessDayCutoffHour`。
  - `businessDate` と `timeZone` は**打刻時に確定させてイベントに保存**する（後から拠点TZや締め時刻を変えても過去は打刻時の値を保持。方針変更時は移行ジョブで再計算）。
- この関数は [07-testing.md](./07-testing.md) の Unit テスト対象。最低限テストする TZ:
  - `Asia/Tokyo`（DST無・UTC+9）
  - `Australia/Sydney`（DST有・UTC+10/+11 の夏冬両方）
  - `Australia/Perth`（DST無・UTC+8）、`Australia/Adelaide`（30分刻み）
  - `cutoffHour > 0`（締め時刻）と不正TZ・不正日付の例外。

## 打刻の連打対策 — サーバ側で重複を無視（確定）

- `punch` mutation のサーバ側で、**同一 worker・同一 `type` の打刻が直近 N 秒以内にある場合は重複とみなして無視**する（既存イベントを返す）。
- `N` は設定値（デフォルト **60 秒** で提案）。誤タップ・二度押しをデータ側で確実に弾く。
- 直前の打刻は「当日の最新イベント」を見れば分かるので追加の読み取りは最小。
- UI 側でも打刻直後に数秒のクールダウン表示を出す（二重の防御）。
- 実装は idempotency とも整合させる（[04-graphql-schema.md](./04-graphql-schema.md) 参照）。

## 確定事項（まとめ）

- ✅ **休憩打刻なし**。MVP は `CLOCK_IN` / `CLOCK_OUT` の2種。休憩は「一旦退勤」で運用。
- ✅ **補正は監査履歴を残す**。元イベントは書き換えず PunchAudit を append（上記）。
- ✅ **多拠点（Location）対応**。日豪で使うため拠点概念を持つ。`GSI1PK = LOCATION#<id>`（拠点別の有効ワーカー一覧）。~~単一店舗~~は撤回。
- ✅ **タイムゾーンは拠点単位の IANA名**。`occurredAt` は UTC 保存、`businessDate` は拠点TZで算出（DST・30分刻み対応）。
- ✅ **admin は拠点スコープ**で見る（横断集計は現時点で不要）。
- ✅ **シフト管理なし**。Shift エンティティは作らない。
- ✅ **業務日は暦日（cutoffHour=0）がMVP既定**。ただし拠点ごとに締め時刻を設定できる（`Location.businessDayCutoffHour`）。
- ✅ **連打はサーバ側で直近 N 秒（既定60秒）の同一打刻を無視**。
- ✅ **ID 形式は ULID**（時刻ソート可能・衝突しにくい）。
- ✅ **社員 role は MVP 全員 ADMIN**（フィールドは保持、権限分岐なし）。
