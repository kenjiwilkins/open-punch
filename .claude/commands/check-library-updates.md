---
description: 依存ライブラリの更新可否と既知の脆弱性をスキャンして報告する（変更はしない・読み取り専用）
argument-hint: "[パッケージ名やフィルタ（任意）]"
allowed-tools: Bash(pnpm outdated:*), Bash(pnpm audit:*), Bash(pnpm ls:*), Bash(pnpm why:*), Read, WebFetch
---

このリポジトリ（pnpm workspace モノレポ）の依存ライブラリについて、**更新可否と既知の脆弱性を調査して報告**する。**このコマンドはファイルを一切変更しない**。実際の更新は `/update-library` で行う。

対象フィルタ（任意）: $ARGUMENTS

## 手順

1. **更新可能なパッケージを列挙**する:
   - `pnpm outdated -r`（ワークスペース全体、recursive）を実行。
   - 各パッケージについて current / wanted / latest と、semver の差分（patch / minor / **major**）を把握する。
2. **既知の脆弱性を調査**する:
   - `pnpm audit --json` を実行し、advisory を重大度（critical/high/moderate/low）別に整理。
   - 脆弱性が出た依存は `pnpm why <pkg>` で「なぜ入っているか（直接 or 推移的）」を確認。
3. **報告**する（表形式）。各行に:
   - パッケージ名 / 現在バージョン / 最新バージョン / semver ジャンプ（patch・minor・major）
   - セキュリティ advisory の有無と重大度
   - どのワークスペースパッケージが使っているか
4. **推奨アクションを優先度順に提示**する:
   - まず **セキュリティ advisory があるもの**（重大度順）。
   - 次に SST v3 / Next.js / GraphQL 系など**中核ライブラリの major 更新**（破壊的変更の可能性が高い）。
   - 最後に安全な patch/minor のまとめ更新。
   - 各項目に「`/update-library <pkg>` で対応」と添える。

## 注意

- **絶対にファイルを書き換えない**。`pnpm update` や `pnpm install` を実行しない（`outdated`/`audit`/`why`/`ls` の読み取り系のみ）。
- major 更新は「破壊的変更あり得る」として明確に区別する。曖昧に patch と混ぜない。
- 脆弱性が推移的依存由来の場合、直接の更新で解消するか、`pnpm.overrides` が必要かを見立てる。
