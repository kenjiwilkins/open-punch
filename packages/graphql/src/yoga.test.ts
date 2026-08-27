import type { Repositories } from "@open-punch/core";
import { describe, expect, it } from "vitest";
import { createYogaHandler } from "./yoga";

const yoga = createYogaHandler({
  repos: {} as Repositories,
  expectedApiKey: "k",
  verifyJwt: async () => ({ sub: "s", email: "e@example.com" }),
});

describe("yoga", () => {
  it("health を POST で実行できる（realm 問題が無いことの確認）", async () => {
    const res = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ health }" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { health: "ok" } });
  });
});
