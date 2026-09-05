import { NextResponse } from "next/server";
import { getAuthConfig } from "../../../../src/lib/auth/config";
import { clearSession } from "../../../../src/lib/auth/session";
import { logoutUrl } from "../../../../src/lib/auth/urls";

// セッションを消して Hosted UI のログアウトへ。
export async function GET() {
  const cfg = getAuthConfig();
  await clearSession();
  return NextResponse.redirect(logoutUrl(cfg));
}
