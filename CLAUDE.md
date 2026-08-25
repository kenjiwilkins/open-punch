# CLAUDE.md

このリポジトリで作業する AI エージェント（および人間）向けのガイド。詳細な設計は [`docs/`](./docs) を正典とする。

## プロジェクト概要

キオスク型タイムカードアプリ。2アプリ構成:
- **kiosk**（`apps/kiosk`）: アルバイトが名前をタップして打刻。**認証なし**、API キーで保護。
- **admin**（`apps/admin`）: 社員が Cognito 認証で勤怠を管理。

## 技術スタック（逸脱しないこと）

- Next.js（App Router）+ shadcn/ui
- GraphQL: Lambda + Pothos（コードファースト）+ GraphQL Yoga
- DynamoDB シングルテーブル設計（テーブル名 `OpenPunch`、GSI1/GSI2）
- Cognito（社員のみ）/ API キー（キオスク）
- SST v3（Pulumi ベース）でインフラ定義
- **pnpm** workspace モノレポ（npm/yarn を使わない）

## 想定ディレクトリ構成

```
apps/kiosk, apps/admin            # Next.js アプリ
packages/graphql                  # Pothos スキーマ + resolvers + Yoga handler
packages/core                     # DynamoDB アクセス + ドメインロジック + 共有型
packages/ui                       # shadcn 共有コンポーネント
packages/config                   # 共有 tsconfig/eslint
infra/, sst.config.ts             # SST v3
```

## 鉄則（設計上の不変条件）

1. **打刻時刻はサーバーで決める**。`punch` mutation は時刻を引数に取らない。クライアントの時計を信用しない。
2. **キオスクの公開オペレーションは3つだけ**: `workers` / `workerStatus` / `punch`。それ以外は Cognito 必須。
3. **打刻はイベントとして記録**。状態は打刻履歴から算出し、状態カラムを直接書き換えない。
4. **アルバイトは Cognito を持たない**。DynamoDB レコードのみ。社員だけ Cognito ユーザー。
5. タイムゾーンは JST（Asia/Tokyo）。`businessDate` は JST 基準。
6. **打刻種別は `CLOCK_IN` / `CLOCK_OUT` の2種のみ**。休憩は「一旦退勤 → 戻ったら出勤」で表現する（`BREAK_*` は作らない）。
7. **単一店舗確定**。店舗（Store）概念は入れない。
8. **補正は元イベントを書き換えず PunchAudit を append**。対象更新と監査記録は TransactWriteItems で原子的に。
9. **テストは依存を安全に上げ続けるための命綱**。ドメインロジック・認可分岐を Unit テストで、主要操作を UI テストで守る（E2E はやらない）。[docs/07-testing.md](./docs/07-testing.md) の回帰チェックリストは常に緑に保つ。依存更新は `.claude/commands/` のコマンドで回す。
10. **シフト管理はやらない**。Shift エンティティを作らない。勤怠に集中。
11. **社員ログインは Cognito Hosted UI**。認証 UI を自前実装しない。
12. **連打はサーバ側で無視**。同一 worker・同一 `type` の直近 N 秒（既定60秒）は重複として弾く。
13. **業務日は暦日固定（MVP）だが `computeBusinessDate(occurredAt, cutoffHour=0)` の純関数に閉じ込める**。将来の締め時刻設定に備える。`businessDate` は打刻時に確定保存。
14. **ID は ULID**。社員 role は MVP 全員 `ADMIN`（権限分岐なし）。
15. **GraphQL は Function URL で公開（MVP）**。beta/production は同一アカウントの SST ステージで分離。

## コマンド（雛形作成後に整備）

```bash
pnpm install
pnpm sst dev        # インフラ + ローカル開発
pnpm --filter kiosk dev
pnpm --filter admin dev
```

> まだ雛形は未作成（設計フェーズ）。M0 で上記が動くようにする。[docs/05-roadmap.md](./docs/05-roadmap.md) 参照。

## 作業スタイル

- 🟡 マークの付いた未決事項は**勝手に確定させず**、オーナー（Kenji）に確認する。
- ドキュメントと実装が食い違ったら、まずドキュメントを直してから実装する。
