import type { Repositories } from "@open-punch/core";
import { describe, expect, it } from "vitest";
import { type GraphQLContext, requireEmployee, requireKiosk } from "./builder";

const repos = {} as Repositories;

function ctx(over: Partial<GraphQLContext>): GraphQLContext {
  return { authMode: "none", repos, now: () => new Date(), ...over };
}

function expectForbidden(fn: () => unknown): void {
  try {
    fn();
  } catch (e) {
    expect((e as { extensions?: { code?: string } }).extensions?.code).toBe("FORBIDDEN");
    return;
  }
  throw new Error("FORBIDDEN で throw するはずが throw しなかった");
}

describe("requireKiosk", () => {
  it("apiKey は通す", () => {
    expect(() => requireKiosk(ctx({ authMode: "apiKey" }))).not.toThrow();
  });

  it("cognito は FORBIDDEN（キオスク専用オペレーション）", () => {
    expectForbidden(() =>
      requireKiosk(ctx({ authMode: "cognito", employee: { sub: "s", email: "e@x" } })),
    );
  });

  it("none は FORBIDDEN", () => {
    expectForbidden(() => requireKiosk(ctx({})));
  });
});

describe("requireEmployee", () => {
  it("cognito は employee を返す", () => {
    const employee = { sub: "s", email: "e@example.com" };
    expect(requireEmployee(ctx({ authMode: "cognito", employee }))).toEqual(employee);
  });

  it("apiKey は FORBIDDEN（社員専用オペレーション）", () => {
    expectForbidden(() => requireEmployee(ctx({ authMode: "apiKey" })));
  });

  it("none は FORBIDDEN", () => {
    expectForbidden(() => requireEmployee(ctx({})));
  });

  it("cognito でも employee 欠落なら FORBIDDEN", () => {
    expectForbidden(() => requireEmployee(ctx({ authMode: "cognito" })));
  });
});
