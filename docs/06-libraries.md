# 06. 主要ライブラリ解説

このプロジェクトで採用する主要ライブラリと、その役割・選定理由・注意点。**依存は必要最小限**に保つ（過去の脆弱性対応の反省。依存が少ないほど攻撃面と保守コストが小さい）。新しい依存を足すときは、その価値が保守コストを上回るかを [07-testing.md](./07-testing.md) の観点とセットで判断する。

## レイヤ別まとめ

| レイヤ | ライブラリ | 役割 |
| --- | --- | --- |
| インフラ | **sst**（v3） | AWS リソースを TS で定義・デプロイ |
| フロント | **next**, **react** | App Router ベースの2アプリ |
| UI | **shadcn/ui** + **@radix-ui/** + **tailwindcss** | アクセシブルな UI コンポーネント |
| GraphQL サーバ | **@pothos/core**, **graphql-yoga**, **graphql** | コードファーストなスキーマとサーバ |
| GraphQL クライアント | **graphql-request** + **@graphql-codegen/** | 型付きクエリ実行 |
| DB | **@aws-sdk/client-dynamodb** + **@aws-sdk/lib-dynamodb** | DynamoDB アクセス |
| 認証 | **aws-jwt-verify** | Cognito の JWT を Lambda 側で検証 |
| 検証 | **zod** | 境界での入力バリデーション |
| ID | **ulid** | 時刻ソート可能な一意 ID |
| テスト | **vitest**, **@testing-library/react**, **aws-sdk-client-mock**, **msw** | Unit / UI テスト |

---

## インフラ

### SST（Ion / v4系）
AWS を TypeScript で宣言的に構築するフレームワーク。**Ion**（現在の `sst@4` 系）は Pulumi/Terraform エンジン上で動く（旧 SST Classic = `sst@2` の CDK ベースから刷新）。`sst.aws.Nextjs` / `sst.aws.Dynamo` / `sst.aws.CognitoUserPool` / `sst.aws.Function` といった高レベルコンポーネントで、本プロジェクトの構成をほぼカバーできる。
- **なぜ**: Next.js のデプロイ・Lambda・DynamoDB・Cognito を1つの `sst.config.ts` で束ね、ステージ分離（dev/beta/production）も容易。
- **注意**: SST Classic（v2, CDK）と Ion（v3/v4, `sst.aws.*`）で API が大きく違う。ドキュメント/AI が Classic の書き方を出しがちなので、必ず Ion（`sst.aws.*` コンポーネント）で書く。

## フロント / UI

### Next.js（App Router）
kiosk・admin の2アプリ。kiosk は常時表示のキオスク、admin は認証付き SPA 的な管理画面。
- **注意**: kiosk はほぼクライアント操作なので、Server Component と Client Component の境界に注意。認証情報を持たない前提。

### shadcn/ui + Radix + Tailwind
shadcn/ui は「npm パッケージではなく、コードを自分のリポジトリにコピーして使う」方式。Radix UI（アクセシブルな挙動）と Tailwind（スタイル）の上に乗る。
- **なぜ**: 依存としてブラックボックス化せず、自分のコードとして持てる＝脆弱性・改修を自分で制御できる。キオスクは**大きなタップターゲット**が要るので、コンポーネントを直接いじれるのが有利。
- **注意**: `packages/ui` に共有コンポーネントを置き、kiosk/admin から使う。shadcn のコピー元は両アプリで統一する。

## GraphQL

### Pothos（@pothos/core）
コードファーストの GraphQL スキーマビルダー。SDL を手書きせず、TypeScript のコードからスキーマと型を生成する。
- **なぜ**: リゾルバの引数・戻り値が TS の型と一致し、スキーマドリフトが起きにくい。「GraphQL を触ってみたい」という目的に対して DX が良い。
- **注意**: プラグイン構成（`@pothos/plugin-*`）で機能追加する。最初は最小構成で。

### GraphQL Yoga
軽量な GraphQL サーバ。Lambda ハンドラとして動かす。認証 context（apiKey / Cognito JWT の判定）はここの `context` 生成で行う。
- **注意**: Lambda アダプタで動かす。1エンドポイントに2認証モードを同居させる肝の部分（[02](./02-architecture.md)）。

### graphql-request + GraphQL Code Generator
フロントの GraphQL クライアント。codegen でスキーマから型付きの `.ts` を生成し、クエリ結果に型が付く。
- **なぜ**: Apollo/urql より軽量。キャッシュ層が要らない本アプリには十分。
- 🟡 リアルタイム表示やキャッシュ要件が出てきたら urql への切替を検討。

## DB

### AWS SDK v3 + lib-dynamodb
`@aws-sdk/lib-dynamodb` の DocumentClient で、素の DynamoDB JSON ではなく普通の JS オブジェクトで読み書きする。シングルテーブルのキー組み立て（`WORKER#<id>` 等）は `packages/core` の薄い Repository 層に閉じ込める。
- **なぜ薄い自作 Repository か**: 依存を増やさず、アクセスパターン（[03](./03-data-model.md)）が7つと限定的なので、抽象化ライブラリより手書きの方が把握しやすく脆弱性面も小さい。
- 🟡 **ElectroDB** という単一テーブル向け ORM もある。GSI やエンティティが増えて手書きが辛くなったら導入検討。MVP は入れない方針。

## 認証・検証

### aws-jwt-verify
Cognito が発行する JWT を Lambda 側で検証する公式ライブラリ。admin からの `Authorization: Bearer` を検証し、社員 context を作る。
- **注意**: User Pool ID / Client ID を verifier に渡す。検証失敗は 401 相当で弾く。

### zod
GraphQL の input やキオスクからのリクエストを、リゾルバ内で検証する。信用できない入力（特にキオスクは公開エンドポイント）を型だけで信用しない。
- **なぜ**: 「境界で必ず検証」を徹底することで、不正な打刻や injection 的な入力を早期に落とす。セキュリティ上の一次防御。

## その他

### ulid
時系列ソート可能な一意 ID。`PunchEvent` の `SK` に使い、時刻順の Query を素直にする。UUID より DynamoDB のソートと相性が良い。

## 依存の保守方針

- **更新は放置しない**。[07-testing.md](./07-testing.md) のテストがある状態で、定期的に `/check-library-updates` → `/update-library` → `/investigate-vulnerability` を回す（`.claude/commands/`）。
- テストが緑であることを更新の前提条件にする。テストの網羅性＝安心して上げ続けられること。
