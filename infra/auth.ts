// 社員（Employee）認証用の Cognito User Pool（docs/02-architecture.md）。
// アルバイトは Cognito を持たない。社員のみ。
// メールアドレスをユーザー名として使う。
export const userPool = new sst.aws.CognitoUserPool("Employees", {
  usernames: ["email"],
});

// admin（社員向け管理画面）用のアプリクライアント。
// ログイン UI は Cognito Hosted UI を使う（確定）。
// Hosted UI のドメイン・コールバックURLは admin アプリの URL が決まる M3 で設定する
// （callback URL がデプロイ済み admin の URL に依存するため）。
export const userPoolClient = userPool.addClient("AdminWeb");
