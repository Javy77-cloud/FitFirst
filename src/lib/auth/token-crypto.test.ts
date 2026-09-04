import { describe, expect, it } from "vitest";
import { generateApiToken, hashToken, parseBearer, readCookie } from "./token-crypto";

describe("Open API token helpers", () => {
  it("hashes tokens with sha256 hex", () => {
    expect(hashToken("ff_demo_admin")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("parses Bearer headers and cookies", () => {
    expect(parseBearer("Bearer  abc")).toBe("abc");
    expect(parseBearer("bearer fft_x")).toBe("fft_x");
    expect(parseBearer("Basic nope")).toBeNull();
    expect(readCookie("ff_actor_id=user-1; other=2", "ff_actor_id")).toBe("user-1");
    expect(readCookie("theme=dark", "ff_actor_id")).toBeNull();
  });

  it("issues opaque fft_ tokens", () => {
    const token = generateApiToken();
    expect(token.startsWith("fft_")).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });
});
