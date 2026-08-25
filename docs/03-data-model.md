# 03. データモデル（DynamoDB シングルテーブル）

主要な設計判断は合意済み（末尾「確定事項」）。細部は実装しながら調整する。

## 設計方針

- **シングルテーブル設計**。テーブル名 `OpenPunch`。
- キー: `PK`（パーティションキー）/ `SK`（ソートキー）。
- GSI を2本:
  - **GSI1**（キオスクの名前一覧用・スパースインデックス）: `GSI1PK` / `GSI1SK`
  - **GSI2**（管理画面の日付別打刻用）: `GSI2PK` / `GSI2SK`
- **打刻はイベントとして記録**（イベントソーシング寄り）。「勤務中/休憩中/退勤済」という状態は、最新イベントから**算出**する。状態カラムを持って更新するより、打刻の履歴が壊れにくい。

## エンティティ

### Worker（アルバイト）

| 属性 | 例 | 説明 |
| --- | --- | --- |
| `PK` | `WORKER#01J...`（ULID） | |
| `SK` | `PROFILE` | |
| `GSI1PK` | `WORKER`（active な時のみ設定） | スパース: 有効なアルバイトだけ一覧に出る |
| `GSI1SK` | `かな:やまだ#WORKER#01J...` | 表示順（読み仮名ソート）＋一意性 |
| `workerId` | `01J...` | |
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
| `GSI2PK` | `DATE#2026-08-25` | 業務日（JST基準） |
| `GSI2SK` | `WORKER#01J...#2026-08-25T09:01:33Z` | 日内で人・時刻順 |
| `type` | `CLOCK_IN` | 打刻種別（下記） |
| `occurredAt` | ISO8601（サーバー時刻） | **真実の打刻時刻** |
| `businessDate` | `2026-08-25` | JST の業務日。日跨ぎ勤務の集計キー |
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
| 1 | kiosk | 有効なアルバイト一覧（かな順） | GSI1: `GSI1PK = WORKER` を Query |
| 2 | kiosk | あるアルバイトの現在状態 | 主テーブル: `PK = WORKER#id`, `SK begins_with PUNCH#<今日>` の最新を見て算出 |
| 3 | kiosk | 打刻する | `PutItem`（PunchEvent）※サーバー時刻を採用 |
| 4 | admin | 今日の全員の打刻 | GSI2: `GSI2PK = DATE#<today>` を Query |
| 5 | admin | 個人の期間別打刻 | 主テーブル: `PK = WORKER#id`, `SK between PUNCH#<from> and PUNCH#<to>` |
| 6 | admin | アルバイト CRUD | `PK = WORKER#id` |
| 7 | admin | 自分（社員）の情報取得 | `PK = EMPLOYEE#<sub>` |

この7つが主要パターン。GSI2 があれば「日付でその日の全打刻」を Scan せずに取れる。

## 状態の算出ロジック（案）

あるアルバイトの「今日の状態」は、当日の打刻を時刻順に畳み込んで決める:

```
初期: NOT_CLOCKED_IN（未出勤）
CLOCK_IN   → WORKING（勤務中）
CLOCK_OUT  → CLOCKED_OUT（退勤済）
```

- kiosk はこの状態を見て、出せるボタンを出し分ける（未出勤／退勤済なら「出勤」、勤務中なら「退勤」）。
- 一度 `CLOCKED_OUT` になった後にまた `CLOCK_IN` できる（＝休憩・中抜け・再出勤）。当日の状態は「最新イベント」で決まる。

## 業務日（businessDate）の算出 — 締め時刻を後から差し込める設計

- **MVP は暦日固定**（JST 0:00 区切り）。`businessDate = occurredAt を JST に変換した YYYY-MM-DD`。
- ただし将来「AM5時締め」等の**締め時刻を設定できる拡張性を残す**（合意済みのビジョン）。そのために:
  - `businessDate` の算出は **1つの純関数に閉じ込める**: `computeBusinessDate(occurredAt, cutoffHour = 0): string`。MVP は `cutoffHour = 0`。
  - `cutoffHour` は将来、環境/店舗単位の設定値（例: DynamoDB の `CONFIG#...` レコードや SST の設定）から与えられるようにする。
  - `businessDate` は**打刻時に確定させてイベントに保存**する（後から締め時刻を変えても過去データは打刻時の値を保持。方針変更時は移行ジョブで再計算する想定）。
  - この関数は [07-testing.md](./07-testing.md) の Unit テスト対象（cutoff=0 と cutoff=5 の両方をテスト）。

## 打刻の連打対策 — サーバ側で重複を無視（確定）

- `punch` mutation のサーバ側で、**同一 worker・同一 `type` の打刻が直近 N 秒以内にある場合は重複とみなして無視**する（既存イベントを返す）。
- `N` は設定値（デフォルト **60 秒** で提案）。誤タップ・二度押しをデータ側で確実に弾く。
- 直前の打刻は「当日の最新イベント」を見れば分かるので追加の読み取りは最小。
- UI 側でも打刻直後に数秒のクールダウン表示を出す（二重の防御）。
- 実装は idempotency とも整合させる（[04-graphql-schema.md](./04-graphql-schema.md) 参照）。

## 確定事項（まとめ）

- ✅ **休憩打刻なし**。MVP は `CLOCK_IN` / `CLOCK_OUT` の2種。休憩は「一旦退勤」で運用。
- ✅ **補正は監査履歴を残す**。元イベントは書き換えず PunchAudit を append（上記）。
- ✅ **単一店舗確定**。`GSI1PK = WORKER`（定数）でよい。店舗概念は入れない。
- ✅ **シフト管理なし**。Shift エンティティは作らない。
- ✅ **業務日は暦日固定（MVP）**。ただし締め時刻を差し込める純関数設計にする。
- ✅ **連打はサーバ側で直近 N 秒（既定60秒）の同一打刻を無視**。
- ✅ **ID 形式は ULID**（時刻ソート可能・衝突しにくい）。
- ✅ **社員 role は MVP 全員 ADMIN**（フィールドは保持、権限分岐なし）。
