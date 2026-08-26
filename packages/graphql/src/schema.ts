import { builder } from "./builder";
import "./types"; // 型・enum を builder に登録する（副作用）

// オペレーション（workers / workerStatus / punch など）は #9 で追加する。
// ここでは疎通確認用の health のみ。Query 型が無いとスキーマがビルドできないため。
builder.queryType({
  fields: (t) => ({
    health: t.string({ resolve: () => "ok" }),
  }),
});

export const schema = builder.toSchema();
