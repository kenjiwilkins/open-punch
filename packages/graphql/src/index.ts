// Pothos スキーマ + resolvers + GraphQL Yoga ハンドラはここに置く（M1 で実装）。
// 認証 context（apiKey / Cognito JWT の判定）もここ。
// 現状は雛形のプレースホルダ。core の型が参照できることだけ確認しておく。
import type { PunchType } from "@open-punch/core";

export const GRAPHQL_PACKAGE = "@open-punch/graphql";
export type { PunchType };
