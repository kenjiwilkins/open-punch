import "server-only";
import { redirect } from "next/navigation";
import { getAuthConfig } from "./config";
import { getSessionToken } from "./session";
import { type Employee, createIdTokenVerifier } from "./verify";

let cachedVerifier: ((idToken: string) => Promise<Employee>) | null = null;
function verifier(): (idToken: string) => Promise<Employee> {
  if (!cachedVerifier) {
    const cfg = getAuthConfig();
    cachedVerifier = createIdTokenVerifier(cfg.userPoolId, cfg.clientId);
  }
  return cachedVerifier;
}

/** セッションの IdToken を検証して社員を返す。未ログイン/無効なら null。 */
export async function getEmployee(): Promise<Employee | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await verifier()(token);
  } catch {
    return null;
  }
}

/** 認証ガード。未ログインならログイン（Hosted UI）へ誘導する。 */
export async function requireEmployee(): Promise<Employee> {
  const employee = await getEmployee();
  if (!employee) {
    redirect("/api/auth/login");
  }
  return employee;
}
