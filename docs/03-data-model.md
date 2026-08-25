# 03. データモデル（DynamoDB シングルテーブル）🟡 要レビュー

このドキュメントが**一緒に一番詰めたい部分**。設計案を置くので、違和感があれば遠慮なく潰してほしい。

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
| `displayName` | `山田`（一覧に出す名前） | 🟡 同姓対策に表示名を分ける |
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
| `role` | `ADMIN` / `MANAGER` | 🟡 権限を分けるか？ MVP は全員 ADMIN でも可 |
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
| `deviceId` | `ipad-front-01` | 🟡 デバイス制限を入れる場合に使用 |
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

## 確定事項（このセッションで合意）

- ✅ **休憩打刻なし**。MVP は `CLOCK_IN` / `CLOCK_OUT` の2種。休憩は「一旦退勤」で運用。
- ✅ **補正は監査履歴を残す**。元イベントは書き換えず PunchAudit を append（上記）。
- ✅ **単一店舗確定**。`GSI1PK = WORKER`（定数）でよい。店舗概念は入れない。

## 🟡 残りの未決事項

1. **業務日の締め時刻**: 深夜勤務がある場合、`businessDate` を「AM5時区切り」等にするか。MVP は暦日（0:00区切り）で提案。
2. **打刻の重複・連打対策**: 同じ人が数秒で二度タップした時。案: 直近 N 秒の同一 `type` は無視 or 確認ダイアログ。
3. **ID 形式**: ULID を提案（時刻ソート可能・衝突しにくい）。UUID 希望なら変更可。
