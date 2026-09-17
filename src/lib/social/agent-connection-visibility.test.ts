import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAdminOnlyPath } from "@/lib/auth/access";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("agent social connection visibility", () => {
  it("omits Connected social accounts from the agent /me profile", () => {
    const me = source("src/app/me/page.tsx");
    expect(me).not.toMatch(/Connected social accounts/);
    expect(me).not.toMatch(/id="social"/);
    expect(me).not.toMatch(/ConnectionBadge/);
    expect(me).not.toMatch(/SocialByoCard/);
  });

  it("does not offer a personal Connected accounts nav item", () => {
    const nav = source("src/components/personal-settings-nav.tsx");
    expect(nav).not.toMatch(/Connected accounts/);
    expect(nav).not.toMatch(/href: "\/social"/);
  });

  it("keeps Settings → Social Admin-only so agents never see BYO status", () => {
    expect(isAdminOnlyPath("/settings/social")).toBe(true);
    expect(isAdminOnlyPath("/settings/integrations")).toBe(true);
    expect(isAdminOnlyPath("/me")).toBe(false);
    const social = source("src/app/settings/social/page.tsx");
    expect(social).toMatch(/requireAdminPage/);
    expect(social).toMatch(/ConnectionBadge/);
    expect(social).toMatch(/SocialByoCard/);
    expect(social).toMatch(/canEdit/);
    expect(social).not.toMatch(/currentDeskSession/);
  });

  it("hides BYO connection cards and View connections on the agent Social desk", () => {
    const pulse = source("src/app/social/page.tsx");
    expect(pulse).toMatch(/session\.isAdmin \? \(/);
    expect(pulse).toMatch(/Social settings/);
    expect(pulse).not.toMatch(/View connections/);
    expect(pulse).toMatch(/SocialByoCard/);
    expect(pulse).toMatch(/canEdit/);
  });

  it("does not list platforms or connected stubs on the inquiry empty state", () => {
    const list = source("src/components/social/inquiry-list.tsx");
    expect(list).not.toMatch(/No connected stubs/);
    expect(list).not.toMatch(/Connect Facebook, Instagram/);
    expect(list).toMatch(/No inbound inquiries yet/);
  });

  it("hides connection badges on agent home social tiles", () => {
    const tiles = source("src/components/social/pulse-cards.tsx");
    expect(tiles).toMatch(/showConnectionStatus/);
    expect(tiles).toMatch(/ConnectionBadge/);
    const desk = source("src/components/home/owner-desk.tsx");
    expect(desk).toMatch(/showConnectionStatus=\{showConnectionStatus\}/);
    expect(desk).toMatch(/socialTiles\(socialPulse, tile, isAdmin\)/);
  });
});
