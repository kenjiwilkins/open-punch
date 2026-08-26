import { describe, expect, it } from "vitest";
import { schema } from "./schema";

// 実行（graphql() の呼び出し）は yoga 経由にする #9 以降で行う。
// ここではスキーマオブジェクトのメソッドだけで検証し、graphql の realm 問題を避ける。
describe("schema", () => {
  it("Query に health フィールドがある", () => {
    const query = schema.getQueryType();
    expect(query).toBeDefined();
    expect(query?.getFields().health).toBeDefined();
  });

  it("主要な型・enum が登録されている", () => {
    for (const name of [
      "Worker",
      "Location",
      "PunchEvent",
      "Employee",
      "WorkerDayStatus",
      "PunchType",
      "WorkerStatus",
    ]) {
      expect(schema.getType(name), name).toBeDefined();
    }
  });

  it("PunchType は CLOCK_IN / CLOCK_OUT の2値", () => {
    const punchType = schema.getType("PunchType");
    // GraphQLEnumType のメソッドを直接呼ぶ（realm を跨がない）
    const values = (punchType as { getValues?: () => { name: string }[] }).getValues?.() ?? [];
    expect(values.map((v) => v.name)).toEqual(["CLOCK_IN", "CLOCK_OUT"]);
  });
});
