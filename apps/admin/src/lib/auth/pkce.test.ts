import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generatePkce, randomState, randomUrlToken } from "./pkce";

describe("pkce", () => {
  it("challenge は verifier の SHA-256(base64url)", () => {
    const { verifier, challenge } = generatePkce();
    const expected = createHash("sha256").update(verifier).digest().toString("base64url");
    expect(challenge).toBe(expected);
  });

  it("verifier / state は毎回異なる", () => {
    expect(generatePkce().verifier).not.toBe(generatePkce().verifier);
    expect(randomState()).not.toBe(randomState());
  });

  it("URL セーフ（+ / = を含まない）", () => {
    expect(randomUrlToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
