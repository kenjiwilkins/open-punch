import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { AuthEmployee } from "../builder";

/**
 * Cognito の IdToken を検証する関数を作る（docs/02-architecture.md）。
 * admin は Hosted UI ログイン後の IdToken を Bearer で送る。email を含むため tokenUse は "id"。
 */
export function createCognitoVerifier(
  userPoolId: string,
  clientId: string,
): (token: string) => Promise<AuthEmployee> {
  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: "id",
  });

  return async (token: string): Promise<AuthEmployee> => {
    const payload = await verifier.verify(token);
    const email = typeof payload.email === "string" ? payload.email : "";
    return { sub: String(payload.sub), email };
  };
}
