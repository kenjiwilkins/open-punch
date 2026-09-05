import "server-only";
import { cookies } from "next/headers";

// IdToken は httpOnly クッキーに入れ、ブラウザ JS からは読めないようにする（XSS 対策）。
const SESSION_COOKIE = "op_admin_session";
// ログイン中の一時状態（PKCE verifier / state / 戻り先）。
const LOGIN_STATE_COOKIE = "op_login_state";

// ローカル開発は http なので secure を外す（本番のみ secure）。
const secure = process.env.NODE_ENV === "production";

export interface LoginState {
  state: string;
  verifier: string;
  returnTo: string;
}

export async function setSession(idToken: string, maxAgeSec: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, idToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function setLoginState(data: LoginState): Promise<void> {
  const jar = await cookies();
  jar.set(LOGIN_STATE_COOKIE, JSON.stringify(data), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

/** ログイン一時状態を取り出して消費する（CSRF 対策の state 検証に使う）。 */
export async function takeLoginState(): Promise<LoginState | null> {
  const jar = await cookies();
  const raw = jar.get(LOGIN_STATE_COOKIE)?.value;
  if (!raw) return null;
  jar.delete(LOGIN_STATE_COOKIE);
  try {
    return JSON.parse(raw) as LoginState;
  } catch {
    return null;
  }
}
