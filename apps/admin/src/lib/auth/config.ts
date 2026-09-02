import "server-only";
import { z } from "zod";
import type { AuthConfig } from "./urls";

// Cognito Hosted UI の設定は SST の Cognito 出力・Secret 由来の環境変数から受け取る。
const envSchema = z.object({
  COGNITO_DOMAIN: z.url(),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_REGION: z.string().min(1),
  ADMIN_URL: z.url(),
});

export function getAuthConfig(): AuthConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const bad = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`admin の認証環境変数が不足/不正です: ${bad}`);
  }
  const d = parsed.data;
  const domain = d.COGNITO_DOMAIN.replace(/\/$/, "");
  const adminUrl = d.ADMIN_URL.replace(/\/$/, "");
  return {
    domain,
    clientId: d.COGNITO_CLIENT_ID,
    userPoolId: d.COGNITO_USER_POOL_ID,
    region: d.COGNITO_REGION,
    adminUrl,
    redirectUri: `${adminUrl}/api/auth/callback`,
    logoutRedirectUri: adminUrl,
    scopes: ["openid", "email", "profile"],
  };
}
