import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TENANT_ID, envUuid, FALLBACK_TENANT_ID } from "./domain";

const OVERRIDE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("envUuid", () => {
  it("treats unset, empty, and whitespace as missing", () => {
    expect(envUuid(undefined, FALLBACK_TENANT_ID)).toBe(FALLBACK_TENANT_ID);
    expect(envUuid("", FALLBACK_TENANT_ID)).toBe(FALLBACK_TENANT_ID);
    expect(envUuid("   ", FALLBACK_TENANT_ID)).toBe(FALLBACK_TENANT_ID);
    expect(envUuid("\t\n", FALLBACK_TENANT_ID)).toBe(FALLBACK_TENANT_ID);
  });

  it("keeps a real UUID and trims padding", () => {
    expect(envUuid(OVERRIDE, FALLBACK_TENANT_ID)).toBe(OVERRIDE);
    expect(envUuid(`  ${OVERRIDE}  `, FALLBACK_TENANT_ID)).toBe(OVERRIDE);
  });
});

describe("DEFAULT_TENANT_ID", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never resolves to an empty string", () => {
    expect(DEFAULT_TENANT_ID).toBeTruthy();
    expect(DEFAULT_TENANT_ID).not.toBe("");
  });

  it("uses the seed tenant when TENANT_ID is unset or blank at import", () => {
    const fromEnv = process.env.TENANT_ID?.trim() ?? "";
    expect(DEFAULT_TENANT_ID).toBe(fromEnv || FALLBACK_TENANT_ID);
    expect(FALLBACK_TENANT_ID).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("falls back when TENANT_ID is blank at import (Vercel empty env)", async () => {
    vi.resetModules();
    vi.stubEnv("TENANT_ID", "");
    const { DEFAULT_TENANT_ID: resolved, FALLBACK_TENANT_ID: fallback } = await import("./domain");
    expect(resolved).toBe(fallback);
    expect(resolved).not.toBe("");
  });
});
