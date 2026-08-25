# 02. アーキテクチャ

## 全体構成

```
┌─────────────┐         ┌─────────────┐
│   kiosk     │         │   admin     │
│  Next.js    │         │  Next.js    │
│ (API key)   │         │ (Cognito)   │
└──────┬──────┘         └──────┬──────┘
       │  GraphQL              │  GraphQL
       │  x-api-key ヘッダ     │  Authorization: Bearer <JWT>
       └───────────┬──────────┘
                   ▼
        ┌────────────────────┐
        │  GraphQL (Yoga)    │   Lambda（Function URL or API Gateway）
        │  Pothos schema     │   - 認証モードを context で判定
        │  resolvers         │   - apiKey / cognito でオペレーション認可
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │   DynamoDB          │   シングルテーブル（GSI x2）
        │   OpenPunch table   │
        └────────────────────┘

        Cognito User Pool ── 社員の認証（admin のみ）
```

## モノレポ構成

```
open-punch/
├─ apps/
│  ├─ kiosk/            # Next.js — アルバイト用キオスク（認証なし）
│  └─ admin/            # Next.js — 社員用管理画面（Cognito）
├─ packages/
│  ├─ graphql/          # Pothos スキーマ + resolvers + Yoga handler（Lambda エントリ）
│  ├─ core/             # ドメインロジック + DynamoDB アクセス（シングルテーブル）+ 共有型
│  ├─ ui/               # shadcn/ui ベースの共有コンポーネント
│  └─ config/           # tsconfig / eslint / prettier 共有設定
├─ infra/               # SST v3 コンポーネント定義（分割して置く）
├─ sst.config.ts        # SST エントリポイント
├─ pnpm-workspace.yaml
└─ package.json
```

- **スキーマと型を `packages/graphql` / `packages/core` に集約**し、kiosk・admin の両方から型安全に使う。これがモノレポを選んだ最大の理由。
- フロントの GraphQL クライアントは [graphql-request](https://github.com/graffle-js/graffle) + [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) で型生成する（確定）。キャッシュ層が要る要件が出たら urql を再検討。

## 認証・認可

GraphQL は **1つのエンドポイント**で、2つの認証モードを resolver 側で判定する。

### キオスク（アルバイト操作）— API キー
- kiosk アプリはリクエストに `x-api-key: <APIキー>` を付与する。
- API キーは **SST Secret** として管理し、ビルド時に kiosk へ注入する。
- Yoga の context 生成時にキーを検証し、`authMode = 'apiKey'` をセット。
- 公開オペレーション（`workers`, `workerStatus`, `punch`）のみ許可する。
- 🟡 **将来のデバイス制限**: 端末登録トークン（初回に管理画面で端末を登録して発行）や、CloudFront + WAF による IP 許可リストを段階的に追加できる設計にしておく。MVP では API キーのみ。

### 社員操作 — Cognito JWT
- **ログイン UI は Cognito Hosted UI を使う（確定）**。パスワード入力・MFA・パスワードリセット等のセンシティブな認証 UI を AWS 側に寄せ、自前で保守しない（過去の脆弱性対応の反省に沿う）。admin はログイン後 Hosted UI からリダイレクトで戻り、トークンを受け取る。
- admin は取得した `IdToken` を GraphQL リクエストの `Authorization: Bearer <IdToken>` に付与する。
- Lambda 側で [`aws-jwt-verify`](https://github.com/awslabs/aws-jwt-verify) を使って JWT を検証し、`authMode = 'cognito'`、`employee = { sub, email, ... }` を context にセット。
- 社員向けオペレーション（`me`, `punchesByDate`, `createWorker`, `correctPunch` など）は `authMode === 'cognito'` を要求する。
- 🟡 Hosted UI の見た目カスタマイズ（ロゴ・配色）はやるか。MVP はデフォルト外観で可。

### 認可の実装方針
- 各 resolver の先頭で context の `authMode` をチェックするヘルパ（例 `requireEmployee(ctx)` / `requireApiKey(ctx)`）を通す。
- 認可ルールは [04-graphql-schema.md](./04-graphql-schema.md) のオペレーション表に明記する。

## SST v3 で作るリソース

| リソース | SST コンポーネント | 用途 |
| --- | --- | --- |
| DynamoDB テーブル | `sst.aws.Dynamo` | 打刻・ユーザーデータ（シングルテーブル） |
| Cognito User Pool | `sst.aws.CognitoUserPool` + client | 社員認証 |
| GraphQL 関数 | `sst.aws.Function`（url 有効）※ | Yoga ハンドラ |
| kiosk アプリ | `sst.aws.Nextjs` | アルバイト用フロント |
| admin アプリ | `sst.aws.Nextjs` | 社員用フロント |
| API キー等の秘密 | `sst.Secret` | キオスク API キー |

> ※ **MVP は GraphQL を Function URL で公開する（確定）**。レート制限・WAF 連携が要るフェーズになったら `sst.aws.ApiGatewayV2` の背後に移す。キオスクが公開エンドポイントである点（[03/04](./04-graphql-schema.md)）を踏まえ、Gateway 化はデバイス制限とセットで将来検討する。

## 環境（ステージ）

**SST のステージ機能で環境を分離**する。少なくとも **beta（検証）と production（本番）は独立した環境**として用意する。ステージごとに DynamoDB テーブル・Cognito User Pool・Lambda・API キー等が別々にプロビジョニングされ、リソース名はステージ名で名前空間化される（本番データと検証データが混ざらない）。

| ステージ | 用途 | 備考 |
| --- | --- | --- |
| `dev`（各自の名前など） | 個人のローカル開発 | `sst dev`。各開発者が使い捨てで持つ |
| `beta` | 検証・受け入れ確認 | 本番相当の構成でリリース前に確認する常設環境 |
| `production` | 本番 | 実運用。デプロイは beta 検証を通したものだけ |

- デプロイは `sst deploy --stage beta` / `sst deploy --stage production` で切り替える。
- **beta と production は別 AWS リソース**（別テーブル・別 User Pool・別 API キー）。社員アカウント（Cognito）も環境ごとに分かれる点に注意。
- キオスク API キー等の秘密（`sst.Secret`）も**ステージごとに設定**する。beta の鍵で production は叩けない。
- **MVP は同一 AWS アカウント内のステージ分離で行く（確定）**。データ隔離をより強くしたくなったら（本番データの取り扱いが厳格化したら）AWS アカウント自体の分離へ移行する。
- 🟡 本番ドメイン・カスタムドメイン（beta 用サブドメイン含む）の要否は後で。
