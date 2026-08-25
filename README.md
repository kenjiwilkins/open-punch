# open-punch

タブレット常設のキオスク型タイムカードアプリ。アルバイトは自分の名前を選んで打刻し、社員は認証付きの管理画面で勤怠データを閲覧・補正する。

## 2つのアプリ

| アプリ | 利用者 | 認証 | 役割 |
| --- | --- | --- | --- |
| **kiosk** | アルバイト | なし（API キー + デバイス制限） | 名前選択 → 出勤/退勤/休憩を打刻 |
| **admin** | 社員 | Cognito | アルバイト管理、打刻閲覧、補正、集計 |

## 技術スタック

- **フロント**: Next.js（App Router） + shadcn/ui
- **バックエンド**: GraphQL（Lambda + [Pothos](https://pothos-graphql.dev/) + [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)、コードファースト）
- **DB**: DynamoDB（シングルテーブル設計）
- **認証**: Amazon Cognito（社員のみ）/ API キー（キオスク）
- **インフラ**: [SST v3](https://sst.dev/)（Pulumi ベース）
- **パッケージ管理**: pnpm workspace モノレポ

## ドキュメント

計画・設計ドキュメントは [`docs/`](./docs) に置く。読む順番:

1. [01-overview.md](./docs/01-overview.md) — プロダクト概要とアクター
2. [02-architecture.md](./docs/02-architecture.md) — システム構成・モノレポ・認証
3. [03-data-model.md](./docs/03-data-model.md) — DynamoDB データモデル
4. [04-graphql-schema.md](./docs/04-graphql-schema.md) — GraphQL スキーマ案
5. [05-roadmap.md](./docs/05-roadmap.md) — MVP マイルストーン
6. [06-libraries.md](./docs/06-libraries.md) — 主要ライブラリ解説
7. [07-testing.md](./docs/07-testing.md) — テスト戦略（Unit / UI、E2E なし）

> 🟡 は「一緒に詰めたい未決事項」。ドキュメント内でも同じマークを使っている。

## 保守用コマンド（`.claude/commands/`）

依存ライブラリを安全に上げ続けるための Claude 用スラッシュコマンド:

- `/check-library-updates` — 更新可否と既知の脆弱性をスキャンして報告（読み取り専用）
- `/update-library <pkg>` — 破壊的変更を確認し、テストで検証してから更新
- `/investigate-vulnerability <id/pkg>` — 報告された脆弱性の影響を調査（修正はしない）

## ステータス

📄 設計フェーズ。まだコードは書いていない。まずドキュメントを固めてから実装に入る。
