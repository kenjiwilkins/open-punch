import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminGraphQLClient } from "./graphql-client";

beforeEach(() => vi.stubEnv("GRAPHQL_URL", "https://api.example/graphql"));
afterEach(() => vi.unstubAllEnvs());

describe("createAdminGraphQLClient", () => {
  it("IdToken を Authorization: Bearer に載せる", async () => {
    const client = await createAdminGraphQLClient("idtoken-abc");
    const c = client as unknown as {
      url: string;
      requestConfig: { headers?: Record<string, string> };
    };
    expect(c.url).toBe("https://api.example/graphql");
    expect(c.requestConfig.headers?.Authorization).toBe("Bearer idtoken-abc");
  });
});
