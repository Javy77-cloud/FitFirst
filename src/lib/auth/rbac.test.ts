import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import {
  canAssignOwner,
  canPostAsk,
  canResolveAsk,
  canSeeOwned,
  commissionViewFor,
  isAdmin,
  isAgent,
  visibleOwnerId,
  type Actor,
} from "./rbac";

const admin: Actor = {
  id: "admin-1",
  name: "Javy Rivera",
  email: "javy@local",
  role: "admin",
};

const agent: Actor = {
  id: "agent-1",
  name: "Maya Chen",
  email: "maya@local",
  role: "agent",
};

describe("RBAC", () => {
  it("treats Javy as Admin who sees every owner", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(canSeeOwned(admin, agent.id)).toBe(true);
    expect(canSeeOwned(admin, null)).toBe(true);
    expect(canAssignOwner(admin)).toBe(true);
    expect(canResolveAsk(admin)).toBe(true);
    expect(visibleOwnerId(admin)).toBeNull();
  });

  it("hides other producers from an Agent", () => {
    expect(isAgent(agent)).toBe(true);
    expect(canSeeOwned(agent, agent.id)).toBe(true);
    expect(canSeeOwned(agent, admin.id)).toBe(false);
    expect(canSeeOwned(agent, null)).toBe(false);
    expect(canAssignOwner(agent)).toBe(false);
    expect(canResolveAsk(agent)).toBe(false);
    expect(canPostAsk(agent)).toBe(true);
    expect(visibleOwnerId(agent)).toBe(agent.id);
  });

  it("forces Agents onto My commissions and lets Admin toggle Agency", () => {
    expect(commissionViewFor(agent, "agency")).toBe("mine");
    expect(commissionViewFor(admin, "agency")).toBe("agency");
    expect(commissionViewFor(admin, "mine")).toBe("mine");
    expect(commissionViewFor(admin, null)).toBe("agency");
  });
});

describe("password hashing", () => {
  it("hashes locally and verifies without storing the raw password", () => {
    const hash = hashPassword("fitfirst-local-only");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(hash).not.toContain("fitfirst-local-only");
    expect(verifyPassword("fitfirst-local-only", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
    expect(verifyPassword("fitfirst-local-only", null)).toBe(false);
  });
});
