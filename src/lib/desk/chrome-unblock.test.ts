import { describe, expect, it } from "vitest";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { CONTACT_ID, DEAL_ID, LEAD_ID, TENANT_ID } from "@/lib/fixtures/ids";
import { SESSION_COOKIE_OPTS, SESSION_COOKIES } from "@/lib/auth/cookies";

describe("Mac Chrome unblock locks", () => {
  it("keeps the single-tenant id alias used by seed and session", () => {
    expect(DEFAULT_TENANT_ID).toBe("11111111-1111-4111-8111-111111111111");
    expect(TENANT_ID).toBe(DEFAULT_TENANT_ID);
    expect(LEAD_ID.startsWith("22222222-2222-4222-8222-")).toBe(true);
    expect(DEAL_ID).toBe("22222222-2222-4222-8222-222222222222");
    expect(CONTACT_ID).toBe("22222222-2222-4222-8222-222222222224");
  });

  it("scopes session cookies to the host (localhost vs 127.0.0.1 stay separate)", () => {
    expect(SESSION_COOKIES.actorId).toBe("ff_actor_id");
    expect(SESSION_COOKIE_OPTS.path).toBe("/");
    expect(SESSION_COOKIE_OPTS.sameSite).toBe("lax");
    expect(SESSION_COOKIE_OPTS).not.toHaveProperty("domain");
  });
});
