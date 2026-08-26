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
- **インフラ**: [SST（Ion / v4系）](https://sst.dev/)（Pulumi ベース）
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

## 開発（ローカル）

```bash
pnpm install
pnpm typecheck        # 全パッケージの型チェック
pnpm test             # Unit テスト（vitest）
pnpm dev              # SST（Ion）でローカル開発 — AWS 認証情報が必要
```

ステージ分離: `pnpm sst deploy --stage beta` / `pnpm sst deploy --stage production`。

## Secrets: KioskApiKey の設定（デプロイ前に必須）

キオスクが GraphQL の公開オペレーションを叩くための API キー。`sst.Secret` なので
**ステージごとに値を設定してからでないとデプロイできない**（未設定だと
`SecretMissingError: Set a value for KioskApiKey ...` で止まる）。

値はランダム生成でよい（キオスクが `x-api-key` として送る共有シークレット）。
セキュリティ上、鍵の値は各自の手元で生成・設定すること:

```bash
pnpm sst secret set KioskApiKey "$(openssl rand -hex 32)" --stage beta
```

- **ステージごとに必要**。`production` や、`sst dev` を使う `dev` ステージも同様に設定する:
  ```bash
  pnpm sst secret set KioskApiKey "$(openssl rand -hex 32)" --stage production
  ```
- 設定済みか確認: `pnpm sst secret list --stage beta`
- **ステージをまたいで鍵は共有しない**（beta の鍵で production は叩けない）。
- この値は M2 でキオスクアプリの設定にも渡す（`x-api-key` 送信用）。

## ステータス

🚧 **M0 完了**（土台）: pnpm モノレポ + SST（Ion）雛形、DynamoDB / Cognito / Secret を定義、
`computeBusinessDate`（拠点TZ・DST対応）を実装しテスト済み。次は M1（GraphQL の背骨）。
進捗は [docs/05-roadmap.md](./docs/05-roadmap.md)。

> ※ AWS への実デプロイはまだ行っていない。`sst dev` / `deploy` はローカルの AWS 認証情報で各自実行する。
