import { createHash, randomBytes } from "node:crypto";

// PKCE（RFC 7636）と state 用のランダム値生成（純粋・server 非依存）。

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** URL セーフなランダムトークン（state / verifier に使う）。 */
export function randomUrlToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

export function randomState(): string {
  return randomUrlToken(16);
}

/** code_verifier と S256 の code_challenge を生成する。 */
export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomUrlToken(32);
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
