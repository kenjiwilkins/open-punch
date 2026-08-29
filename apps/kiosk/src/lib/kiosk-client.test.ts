import { describe, expect, it } from "vitest";
import { createKioskClient } from "./kiosk-client";

describe("createKioskClient", () => {
  it("endpoint と x-api-key ヘッダを設定する", () => {
    const client = createKioskClient({
      graphqlUrl: "https://api.example.com/graphql",
      apiKey: "secret-123",
      locationId: "L1",
    });
    // graphql-request v7 は url / requestConfig を保持する
    const c = client as unknown as {
      url: string;
      requestConfig: { headers?: Record<string, string> };
    };
    expect(c.url).toBe("https://api.example.com/graphql");
    expect(c.requestConfig.headers?.["x-api-key"]).toBe("secret-123");
  });
});
