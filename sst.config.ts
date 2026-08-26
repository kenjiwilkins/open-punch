/// <reference path="./.sst/platform/config.d.ts" />

// SST (Ion / v4系) の設定。`.sst/platform/config.d.ts` は `sst` を初めて実行したとき
// に生成される（$config / sst / $app などのグローバル型もそこで定義される）。
// そのためこのファイルと infra/ は `pnpm -r typecheck` の対象外で、`sst dev` 実行時に
// SST 側で型チェックされる。

export default $config({
  app(input) {
    return {
      name: "open-punch",
      // production は誤削除を防ぐためリソースを保持し保護する。dev / beta は破棄可能。
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: {
        aws: {
          region: "ap-northeast-1", // Tokyo
        },
      },
    };
  },
  async run() {
    // infra/ 配下でリソースを定義する（run() 内で import することで sst グローバルが使える）。
    const infra = await import("./infra");

    return {
      table: infra.table.name,
      userPool: infra.userPool.id,
      userPoolClient: infra.userPoolClient.id,
    };
  },
});
