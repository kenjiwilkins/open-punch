import type { Repositories } from "@open-punch/core";
import { describe, expect, it } from "vitest";
import type { AuthEmployee } from "./builder";
import { buildContext, type ContextDeps } from "./context";

const repos = {} as Repositories;
const employee: AuthEmployee = { sub: "s1", email: "e@example.com" };

function deps(over: Partial<ContextDeps> = {}): ContextDeps {
  return {
    repos,
    expectedApiKey: "secret-key",
    verifyJwt: async () => employee,
    ...over,
  };
}

describe("buildContext", () => {
  it("正しい x-api-key で apiKey", async () => {
    const ctx = await buildContext({ "x-api-key": "secret-key" }, deps());
    expect(ctx.authMode).toBe("apiKey");
    expect(ctx.employee).toBeUndefined();
  });

  it("誤った x-api-key は none", async () => {
    const ctx = await buildContext({ "x-api-key": "wrong-key-x" }, deps());
    expect(ctx.authMode).toBe("none");
  });

  it("ヘッダ名の大小を無視（X-Api-Key）", async () => {
    const ctx = await buildContext({ "X-Api-Key": "secret-key" }, deps());
    expect(ctx.authMode).toBe("apiKey");
  });

  it("有効な Bearer で cognito + employee", async () => {
    const ctx = await buildContext({ authorization: "Bearer good.token" }, deps());
    expect(ctx.authMode).toBe("cognito");
    expect(ctx.employee).toEqual(employee);
  });

  it("無効な Bearer（検証失敗）は none", async () => {
    const ctx = await buildContext(
      { authorization: "Bearer bad.token" },
      deps({
        verifyJwt: async () => {
          throw new Error("invalid");
        },
      }),
    );
    expect(ctx.authMode).toBe("none");
  });

  it("ヘッダ無しは none", async () => {
    const ctx = await buildContext({}, deps());
    expect(ctx.authMode).toBe("none");
  });

  it("apiKey を Bearer より優先", async () => {
    const ctx = await buildContext(
      { "x-api-key": "secret-key", authorization: "Bearer good.token" },
      deps(),
    );
    expect(ctx.authMode).toBe("apiKey");
  });
});
