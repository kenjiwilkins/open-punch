import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createRepositories } from "@open-punch/core";
import { createCognitoVerifier } from "./auth/cognito";
import { createYogaHandler } from "./yoga";

// AWS Lambda（Function URL）のエントリ。SST の infra/api.ts から参照される。
// 設定はステージごとの環境変数から受け取り、パッケージは SST に依存しない。

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env: ${name}`);
  return value;
}

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const repos = createRepositories({ doc, tableName: requiredEnv("TABLE_NAME") });
const verifyJwt = createCognitoVerifier(
  requiredEnv("COGNITO_USER_POOL_ID"),
  requiredEnv("COGNITO_CLIENT_ID"),
);

const yoga = createYogaHandler({
  repos,
  expectedApiKey: requiredEnv("KIOSK_API_KEY"),
  verifyJwt,
});

// Function URL のイベント/レスポンス（必要な部分だけ型付け。@types/aws-lambda は入れない）。
interface FunctionUrlEvent {
  requestContext: { http: { method: string; path: string } };
  rawPath?: string;
  rawQueryString?: string;
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path;
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `https://lambda${path}${query}`;

  const rawBody =
    event.body === undefined
      ? undefined
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;

  const request = new Request(url, {
    method,
    headers: cleanHeaders(event.headers ?? {}),
    body: method === "GET" || method === "HEAD" ? undefined : rawBody,
  });

  const response = await yoga.fetch(request);

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
    isBase64Encoded: false,
  };
}

function cleanHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    const value = headers[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
