import "server-only";
import { z } from "zod";

// キオスクのサーバー側設定。API キーはブラウザに出さない（server-only 境界）。
// 値は SST Secret 由来の環境変数として実行時に注入する（ソースにハードコードしない）。
const envSchema = z.object({
  GRAPHQL_URL: z.url(),
  KIOSK_API_KEY: z.string().min(1),
  KIOSK_LOCATION_ID: z.string().min(1),
});

export interface KioskConfig {
  graphqlUrl: string;
  apiKey: string;
  locationId: string;
}

export function getKioskConfig(): KioskConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const bad = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`kiosk の環境変数が不足/不正です: ${bad}`);
  }
  return {
    graphqlUrl: parsed.data.GRAPHQL_URL,
    apiKey: parsed.data.KIOSK_API_KEY,
    locationId: parsed.data.KIOSK_LOCATION_ID,
  };
}
