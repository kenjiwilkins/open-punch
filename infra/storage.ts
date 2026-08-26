// DynamoDB シングルテーブル（docs/03-data-model.md）。
// - primaryIndex: PK / SK
// - GSI1: 有効なアルバイト一覧（スパース。active な Worker のみ GSI1PK を持つ）
// - GSI2: 日付別の全打刻
// DynamoDB はキーに使う属性だけ fields に宣言すればよい（他はスキーマレス）。
export const table = new sst.aws.Dynamo("OpenPunch", {
  fields: {
    PK: "string",
    SK: "string",
    GSI1PK: "string",
    GSI1SK: "string",
    GSI2PK: "string",
    GSI2SK: "string",
  },
  primaryIndex: { hashKey: "PK", rangeKey: "SK" },
  globalIndexes: {
    GSI1: { hashKey: "GSI1PK", rangeKey: "GSI1SK" },
    GSI2: { hashKey: "GSI2PK", rangeKey: "GSI2SK" },
  },
});
