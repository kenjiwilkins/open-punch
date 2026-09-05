// 社員（Employee）認証用の Cognito User Pool（docs/02-architecture.md）。
// アルバイトは Cognito を持たない。社員のみ。
// メールアドレスをユーザー名として使う。
export const userPool = new sst.aws.CognitoUserPool("Employees", {
  usernames: ["email"],
});

// admin（社員向け管理画面）用のアプリクライアント。
// ログイン UI は Cognito Hosted UI を使う（確定）。
export const userPoolClient = userPool.addClient("AdminWeb");

// --- Hosted UI 配線（デプロイ時に設定する） -------------------------------------
// admin アプリ側の OAuth 実装（認可コード+PKCE / httpOnly クッキー）は完成済み。
// 実際に疎通させるには、以下を Cognito 側に設定し、admin に env を渡す必要がある。
// callback/logout URL は「デプロイ済み admin の URL」に依存するため、admin を
// sst.aws.Nextjs 化して URL が確定してから配線する（#17 以降で admin をデプロイ対象にする際に実施）。
//
// 1) Hosted UI ドメイン（例）:
//      new aws.cognito.UserPoolDomain("EmployeesAuthDomain", {
//        domain: `open-punch-${$app.stage}`,
//        userPoolId: userPool.id,
//      });
// 2) AdminWeb クライアントの OAuth 設定（transform で下層 client に付与）:
//      - allowedOauthFlows: ["code"]
//      - allowedOauthFlowsUserPoolClient: true
//      - allowedOauthScopes: ["openid", "email", "profile"]
//      - supportedIdentityProviders: ["COGNITO"]
//      - callbackUrls: [`${adminUrl}/api/auth/callback`]（ローカルは http://localhost:3000/api/auth/callback）
//      - logoutUrls:   [adminUrl]
// 3) admin に渡す env（.env.example 参照）:
//      COGNITO_DOMAIN / COGNITO_CLIENT_ID(=userPoolClient.id) /
//      COGNITO_USER_POOL_ID(=userPool.id) / COGNITO_REGION / ADMIN_URL / GRAPHQL_URL
