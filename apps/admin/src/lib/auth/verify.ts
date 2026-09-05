import { CognitoJwtVerifier } from "aws-jwt-verify";

export interface Employee {
  sub: string;
  email: string;
}

// Cognito IdToken を検証して社員を返す（graphql パッケージと同じ方針）。
export function createIdTokenVerifier(
  userPoolId: string,
  clientId: string,
): (idToken: string) => Promise<Employee> {
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
  return async (idToken: string): Promise<Employee> => {
    const payload = await verifier.verify(idToken);
    const email = typeof payload.email === "string" ? payload.email : "";
    return { sub: String(payload.sub), email };
  };
}
