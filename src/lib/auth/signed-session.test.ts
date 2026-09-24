import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken, type SignedSessionClaims } from "./signed-session";

const secret = "test-session-secret-16";

function claims(partial?: Partial<SignedSessionClaims>): SignedSessionClaims {
  return {
    sub: "user-1",
    role: "agent",
    mfa: "ok",
    mod: "1",
    name: "Agent",
    imp: "",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...partial,
  };
}

describe("signed session cookies", () => {
  it("accepts a token signed with the secret and rejects tampering", () => {
    const token = signSessionToken(claims({ role: "admin" }), secret);
    expect(token).toBeTruthy();
    expect(verifySessionToken(token, secret)?.role).toBe("admin");
    expect(verifySessionToken(token, "other-secret-value-16")).toBeNull();
    const [version, body, sig] = token!.split(".");
    expect(verifySessionToken(`${version}.${body}.${sig.slice(0, -2)}zz`, secret)).toBeNull();
    expect(verifySessionToken(`${body}.${sig}`, secret)).toBeNull();
    expect(verifySessionToken("ff_role=admin", secret)).toBeNull();
  });

  it("rejects expired tokens and a missing secret", () => {
    const token = signSessionToken(claims({ exp: Math.floor(Date.now() / 1000) - 10 }), secret);
    expect(verifySessionToken(token, secret)).toBeNull();
    expect(verifySessionToken(signSessionToken(claims(), secret), null)).toBeNull();
    expect(signSessionToken(claims(), "short")).toBeNull();
  });
});
