# 05. ロードマップ / MVP マイルストーン

段階的に。各マイルストーンは「動くものが1つ増える」単位で切る。

## M0: 土台（インフラの骨組み）✅ 済（スキャフォールド）
- ✅ pnpm workspace モノレポの初期化（apps/kiosk・admin, packages/core・graphql・ui・config, infra）。バージョンは pnpm catalog に集約
- ✅ SST（Ion / v4系）セットアップ、`sst.config.ts` を配置（CLI 4.17.1 動作確認）
- ✅ **ステージ分離**: `app()` で `dev` / `beta` / `production` を切替（production は removal=retain + protect）
- ✅ DynamoDB テーブル（`OpenPunch` + GSI1/GSI2）を `infra/storage.ts` で定義
- ✅ Cognito User Pool + client を `infra/auth.ts` で定義、キオスク API キー Secret を `infra/secrets.ts` で定義
- ✅ `packages/core`: ドメイン型 + `computeBusinessDate`（拠点TZ・DST対応）を実装、vitest で12ケース緑
- ✅ `pnpm typecheck` / `pnpm test` が緑
- ⏳ **残り（オーナー作業）**: AWS 認証情報を用意して `pnpm sst dev` / `pnpm sst deploy --stage beta` を実行し、実リソースが上がることを確認
- **完了条件**: `pnpm sst deploy --stage beta` で beta 環境が立ち上がる

## M1: GraphQL の背骨
- `packages/core`: DynamoDB アクセス層（Worker / PunchEvent の Repository）
- `packages/graphql`: Pothos スキーマ + Yoga ハンドラ、Lambda で公開
- 認証 context（apiKey 検証 / Cognito JWT 検証）
- `workers` / `punch` / `workerStatus` の3オペレーションが動く
- **完了条件**: GraphQL Playground から apiKey で打刻できる

## M2: kiosk アプリ（アルバイト側）
- Next.js + shadcn/ui セットアップ、`packages/ui` 共有
- 名前一覧グリッド（大きなタップターゲット、iPad 最適化）
- 名前選択 → 状態に応じた打刻ボタン → 完了表示 → 自動で一覧へ戻る
- GraphQL コード生成で型付きクライアント
- **完了条件**: 実機 iPad で出勤→退勤が打てる

## M3: admin アプリ（社員側）
- **Cognito Hosted UI でログイン**（確定。センシティブな認証 UI を AWS に寄せる）
- 今日の打刻一覧（`punchesByDate`）
- アルバイト CRUD（`createWorker` など）
- **完了条件**: 社員が Hosted UI でログインして当日勤怠を見られる

## M4: 補正・集計
- 打刻補正（`correctPunch`） / 手動打刻（`createManualPunch`）— PunchAudit を残す
- 期間指定の個人別集計、CSV エクスポート
- **完了条件**: 月次の勤怠を締められる

## Phase 2 以降（アイデア）
- デバイス登録・IP 許可リストによるキオスク保護強化（+ Function URL → API Gateway 化）
- 業務日の締め時刻設定（`computeBusinessDate` の cutoff を可変に）
- リアルタイム表示（Subscription）
- 給与システム連携 / API 提供

> シフト管理なし・休憩打刻なしは MVP の確定方針。多拠点（Location）＋拠点単位のタイムゾーンは対応する（日豪運用のため）。admin の横断集計は現時点で不要。

---

## 最初のゴール（確定）

- **M2 まで（アルバイトが実機 iPad で打刻できる）を最初の到達点**とする。管理画面（M3 以降）はその後。
- 次アクション: **M0（pnpm ワークスペース + SST（Ion / v4系） の雛形、`sst dev` 起動 & `--stage beta` デプロイ可能まで）**。
