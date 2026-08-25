# 05. ロードマップ / MVP マイルストーン

段階的に。各マイルストーンは「動くものが1つ増える」単位で切る。

## M0: 土台（インフラの骨組み）
- pnpm workspace モノレポの初期化（apps/packages/infra）
- SST v3 セットアップ、`sst dev` が起動する
- **ステージ分離を最初から用意**: `dev` / `beta` / `production` を SST のステージで分けられる状態にする（リソースはステージ名で名前空間化）。[docs/02-architecture.md](./02-architecture.md#環境ステージ) 参照
- DynamoDB テーブル（`OpenPunch` + GSI1/GSI2）を SST で定義
- Cognito User Pool を SST で定義（社員1名を手動作成できる状態）
- **完了条件**: `pnpm sst dev` でリソースが上がり、`sst deploy --stage beta` で beta 環境を作れる

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
- Cognito ログイン（Hosted UI or 自前フォーム）🟡 どちらか決める
- 今日の打刻一覧（`punchesByDate`）
- アルバイト CRUD（`createWorker` など）
- **完了条件**: 社員がログインして当日勤怠を見られる

## M4: 補正・集計
- 打刻補正（`correctPunch`） / 手動打刻（`createManualPunch`）
- 期間指定の個人別集計、CSV エクスポート
- 休憩打刻（BREAK）を UI に追加（データモデルは M1 から対応済み）
- **完了条件**: 月次の勤怠を締められる

## Phase 2 以降（アイデア）
- デバイス登録・IP 許可リストによるキオスク保護強化
- 多店舗対応
- リアルタイム表示（Subscription）
- 給与システム連携 / API 提供

---

## 🟡 今このタイミングで握りたいこと

- **どこまでを「最初に見せられる価値」とするか**。個人的には **M2 まで（アルバイトが実機で打刻できる）** を最初のゴールに置くのを提案。管理画面はその後。
- M0 の初期化を**このまま自分（Co-po）が進めてよいか**。GO が出れば pnpm ワークスペースと SST の雛形を作る。
