import { describe, expect, it } from "vitest";
import { carrierMarketGlance, partyBookKpis, policyBookKpis, RECENT_TOUCH_DAYS } from "./kpi";
import type { BookGlanceCard } from "./types";

function card(patch: Partial<BookGlanceCard> & Pick<BookGlanceCard, "id" | "column">): BookGlanceCard {
  return {
    surface: "contacts",
    href: `/${patch.id}`,
    title: patch.id,
    heat: "cold",
    glance: [],
    why: "",
    primaryAction: { label: "Open", href: `/${patch.id}` },
    hay: patch.id,
    lastTouchDays: null,
    flags: {},
    ...patch,
  };
}

describe("book desk KPIs", () => {
  it("counts people by reach and touch, not by policy type", () => {
    expect(RECENT_TOUCH_DAYS).toBe(14);
    const model = partyBookKpis("contact", [
      card({
        id: "a",
        column: "touch",
        phone: "321",
        email: "a@example.com",
        flags: { hasPhone: true, hasEmail: true, recentTouch: true },
      }),
      card({
        id: "b",
        column: "current",
        flags: { neverTouched: true, hasPhone: true },
        phone: "407",
      }),
      card({ id: "c", column: "watch", flags: { neverTouched: true } }),
    ]);
    expect(model.items.map((item) => [item.id, item.value])).toEqual([
      ["total", "3"],
      ["phone", "2"],
      ["email", "1"],
      ["recent", "1"],
      ["never", "2"],
    ]);
    expect(model.items.some((item) => item.id === "portal")).toBe(false);
    expect(model.share).toBeNull();
  });

  it("uses a portal-contact twin on accounts", () => {
    const model = partyBookKpis("account", [
      card({ id: "biz", column: "current", surface: "accounts", flags: { portalContact: true, hasEmail: true } }),
    ]);
    expect(model.items.find((item) => item.id === "total")?.label).toBe("Accounts");
    expect(model.items.find((item) => item.id === "portal")?.value).toBe("1");
  });

  it("counts policy bands and hides Life or Health when the agency toggle is off", () => {
    const cards = [
      card({ id: "1", column: "now", surface: "policies", flags: { family: "pc" } }),
      card({ id: "2", column: "watch", surface: "policies", flags: { family: "life" } }),
      card({ id: "3", column: "current", surface: "policies", flags: { family: "health" } }),
      card({ id: "4", column: "current", surface: "policies", flags: { family: "pc" } }),
    ];
    const both = policyBookKpis(cards, { writeLife: true, writeHealth: true });
    expect(both.items.map((item) => item.id)).toEqual(["now", "watch", "current", "pc", "life", "health"]);
    expect(both.items.find((item) => item.id === "now")?.value).toBe("1");
    expect(both.items.find((item) => item.id === "pc")?.value).toBe("2");
    const pcOnly = policyBookKpis(cards, { writeLife: false, writeHealth: false });
    expect(pcOnly.items.map((item) => item.id)).toEqual(["now", "watch", "current", "pc"]);
  });

  it("names the most-used carrier per enabled book and skips a one-slice pie", () => {
    const glance = carrierMarketGlance({
      writeLife: false,
      writeHealth: true,
      usage: [
        { carrierId: "s", carrierName: "Southern Oak", family: "pc", policies: 4, premium: 8000 },
        { carrierId: "p", carrierName: "Progressive", family: "pc", policies: 9, premium: 3000 },
        { carrierId: "h", carrierName: "Ambetter", family: "health", policies: 2, premium: 1200 },
        { carrierId: "l", carrierName: "Mutual of Omaha", family: "life", policies: 6, premium: 9000 },
      ],
    });
    expect(glance.items.find((item) => item.id === "lead-pc")).toMatchObject({
      value: "Progressive",
      hint: "9 policies",
    });
    expect(glance.items.find((item) => item.id === "lead-health")?.value).toBe("Ambetter");
    expect(glance.items.some((item) => item.id === "lead-life")).toBe(false);
    expect(glance.items.find((item) => item.id === "policies")?.value).toBe("15");
    expect(glance.share?.map((slice) => slice.name)).toEqual(["Southern Oak", "Progressive", "Ambetter"]);
    expect(glance.share?.reduce((sum, slice) => sum + slice.pct, 0)).toBe(100);

    const solo = carrierMarketGlance({
      writeLife: false,
      writeHealth: false,
      usage: [{ carrierId: "s", carrierName: "Southern Oak", family: "pc", policies: 4, premium: 8000 }],
    });
    expect(solo.share).toBeNull();
  });
});
