import { afterEach, describe, expect, it } from "vitest";
import { hashPassword } from "./password";
import { passwordMatchesUser } from "./session";
import { localTestPasswordMatches } from "./dev-passwords";

const env = process.env as Record<string, string | undefined>;
const originalNode = env.NODE_ENV;
const originalVercel = env.VERCEL_ENV;

afterEach(() => {
  env.NODE_ENV = originalNode;
  if (originalVercel === undefined) delete env.VERCEL_ENV;
  else env.VERCEL_ENV = originalVercel;
});

describe("demo passwords", () => {
  it("rejects known desk passwords in production even when a hash is stored", () => {
    env.NODE_ENV = "production";
    delete env.VERCEL_ENV;
    const user = {
      email: "javy@fitfirst.local",
      passwordHash: hashPassword("real-desk-secret"),
    };
    expect(passwordMatchesUser(user, "javy")).toBe(false);
    expect(passwordMatchesUser({ email: "maya@fitfirst.local", passwordHash: null }, "maya")).toBe(false);
    expect(passwordMatchesUser({ email: "javier@fitfirst.local", passwordHash: null }, "javier")).toBe(false);
    expect(passwordMatchesUser({ email: "logan@fitfirst.local", passwordHash: null }, "logan")).toBe(false);
    expect(localTestPasswordMatches("javy@fitfirst.local", "javy")).toBe(false);
    expect(passwordMatchesUser(user, "real-desk-secret")).toBe(true);
  });

  it("allows the local test password only outside production when the hash misses", () => {
    env.NODE_ENV = "test";
    delete env.VERCEL_ENV;
    expect(localTestPasswordMatches("logan@fitfirst.local", "logan")).toBe(true);
    expect(passwordMatchesUser({ email: "logan@fitfirst.local", passwordHash: null }, "logan")).toBe(true);
    env.VERCEL_ENV = "production";
    expect(localTestPasswordMatches("logan@fitfirst.local", "logan")).toBe(false);
  });
});
