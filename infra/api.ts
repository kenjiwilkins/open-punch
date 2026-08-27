import { userPool, userPoolClient } from "./auth";
import { kioskApiKey } from "./secrets";
import { table } from "./storage";

// GraphQL を Function URL で公開（MVP。docs/02-architecture.md）。
// 設定はすべて環境変数で渡し、packages/graphql は SST に依存しない。
// link: [table] で DynamoDB への IAM 権限を付与する。
export const graphql = new sst.aws.Function("Graphql", {
  handler: "packages/graphql/src/handler.handler",
  url: true,
  link: [table],
  environment: {
    TABLE_NAME: table.name,
    COGNITO_USER_POOL_ID: userPool.id,
    COGNITO_CLIENT_ID: userPoolClient.id,
    KIOSK_API_KEY: kioskApiKey.value,
  },
});
