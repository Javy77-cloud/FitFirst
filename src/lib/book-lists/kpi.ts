import { formatMoney } from "@/lib/domain";
import type { BookFamily, BookGlanceCard } from "./types";

/** A logged call, email, SMS, or meeting inside this window counts as recent. */
export const RECENT_TOUCH_DAYS = 14;

export const REACHED_LATELY_LABEL = "Reached lately";
export const NOT_REACHED_LABEL = "Not reached";

export type BookKpiItem = {
  id: string;
  label: string;
  value: string;
  hint?: string | null;
  variant?: "count" | "name";
};

export type BookKpiShare = {
  name: string;
  pct: number;
};

export type BookKpiStripModel = {
  label: string;
  items: BookKpiItem[];
  share: BookKpiShare[] | null;
  shareLabel?: string | null;
};

function countItem(id: string, label: string, value: number): BookKpiItem {
  return { id, label, value: String(value), variant: "count" };
}

export function partyBookKpis(kind: "contact" | "account", cards: BookGlanceCard[]): BookKpiStripModel {
  const phone = cards.filter((card) => card.flags.hasPhone).length;
  const email = cards.filter((card) => card.flags.hasEmail).length;
  const recent = cards.filter((card) => card.flags.recentTouch).length;
  const never = cards.filter((card) => card.flags.neverTouched).length;
  const items: BookKpiItem[] = [
    countItem("total", kind === "contact" ? "People" : "Accounts", cards.length),
    countItem("phone", "With phone", phone),
    countItem("email", "With email", email),
  ];
  const missingPhone = cards.filter((card) => card.flags.hasPhone === false).length;
  const missingEmail = cards.filter((card) => card.flags.hasEmail === false).length;
  if (missingPhone > 0) items.push(countItem("missing-phone", "Missing phone", missingPhone));
  if (missingEmail > 0) items.push(countItem("missing-email", "Missing email", missingEmail));
  if (kind === "account") {
    items.push(countItem("portal", "Portal contact", cards.filter((card) => card.flags.portalContact).length));
  }
  items.push(
    countItem("recent", REACHED_LATELY_LABEL, recent),
    countItem("never", NOT_REACHED_LABEL, never),
    countItem("deals", "Open deals", cards.filter((card) => (card.flags.openShops ?? 0) > 0).length),
    countItem("renewing", "Renewing ≤60d", cards.filter((card) => card.flags.renewalSoon).length),
  );
  return {
    label: kind === "contact" ? "Contacts" : "Accounts",
    items,
    share: null,
  };
}

export function policyBookKpis(
  cards: BookGlanceCard[],
  settings: { writeLife: boolean; writeHealth: boolean },
): BookKpiStripModel {
  const familyCount = (family: BookFamily) => cards.filter((card) => card.flags.family === family).length;
  const items: BookKpiItem[] = [
    countItem("now", "Needs care now", cards.filter((card) => card.column === "now").length),
    countItem("watch", "Watch", cards.filter((card) => card.column === "watch").length),
    countItem("current", "Current", cards.filter((card) => card.column === "current").length),
    countItem("renewing", "Renewing ≤60d", cards.filter((card) => card.flags.renewalSoon).length),
  ];
  const withClaims = cards.filter((card) => (card.flags.openClaims ?? 0) > 0).length;
  const missingPhone = cards.filter((card) => card.flags.hasPhone === false).length;
  if (withClaims > 0) items.push(countItem("claims", "With claims", withClaims));
  if (missingPhone > 0) items.push(countItem("missing-phone", "Missing phone", missingPhone));
  items.push(countItem("pc", "P&C", familyCount("pc")));
  if (settings.writeLife) items.push(countItem("life", "Life", familyCount("life")));
  if (settings.writeHealth) items.push(countItem("health", "Health", familyCount("health")));
  return { label: "Policies", items, share: null };
}

export type CarrierLobUsage = {
  carrierId: string;
  carrierName: string;
  family: BookFamily;
  policies: number;
  premium: number;
};

const FAMILY_LABEL: Record<BookFamily, string> = {
  pc: "P&C",
  life: "Life",
  health: "Health",
};

function shareSlices(rows: Array<{ name: string; premium: number }>, total: number): BookKpiShare[] {
  const raw = rows.map((row) => ({
    name: row.name,
    pct: Math.round((row.premium / total) * 100),
  }));
  const drift = 100 - raw.reduce((sum, row) => sum + row.pct, 0);
  if (raw.length > 0) raw[raw.length - 1]!.pct += drift;
  return raw.filter((row) => row.pct > 0);
}

/** Top carrier per enabled book, plus premium and policy totals. Pie only when share is actually split. */
export function carrierMarketGlance(input: {
  usage: CarrierLobUsage[];
  writeLife: boolean;
  writeHealth: boolean;
}): BookKpiStripModel {
  const visible = input.usage.filter((row) => {
    if (row.family === "life") return input.writeLife;
    if (row.family === "health") return input.writeHealth;
    return true;
  });
  const families: BookFamily[] = ["pc"];
  if (input.writeLife) families.push("life");
  if (input.writeHealth) families.push("health");

  const items: BookKpiItem[] = families.map((family) => {
    const byCarrier = new Map<string, { name: string; policies: number; premium: number }>();
    for (const row of visible) {
      if (row.family !== family) continue;
      const prev = byCarrier.get(row.carrierId) ?? { name: row.carrierName, policies: 0, premium: 0 };
      prev.policies += row.policies;
      prev.premium += row.premium;
      byCarrier.set(row.carrierId, prev);
    }
    const ranked = [...byCarrier.values()].sort(
      (left, right) => right.policies - left.policies || right.premium - left.premium || left.name.localeCompare(right.name),
    );
    const top = ranked[0];
    return {
      id: `lead-${family}`,
      label: FAMILY_LABEL[family],
      value: top?.name ?? "—",
      hint: top ? `${top.policies} ${top.policies === 1 ? "policy" : "policies"}` : "No book yet",
      variant: "name",
    };
  });

  const totalPolicies = visible.reduce((sum, row) => sum + row.policies, 0);
  const totalPremium = visible.reduce((sum, row) => sum + row.premium, 0);
  items.push(
    { id: "premium", label: "Premium", value: totalPremium > 0 ? formatMoney(totalPremium) : "—", variant: "count" },
    countItem("policies", "Policies", totalPolicies),
  );

  const byName = new Map<string, number>();
  for (const row of visible) {
    if (row.premium <= 0) continue;
    byName.set(row.carrierName, (byName.get(row.carrierName) ?? 0) + row.premium);
  }
  const rankedPremium = [...byName.entries()]
    .map(([name, premium]) => ({ name, premium }))
    .sort((left, right) => right.premium - left.premium || left.name.localeCompare(right.name));
  let share: BookKpiShare[] | null = null;
  if (rankedPremium.length >= 2 && totalPremium > 0) {
    const top = rankedPremium.slice(0, 3);
    const shown = top.reduce((sum, row) => sum + row.premium, 0);
    const slices = [...top];
    if (rankedPremium.length > top.length && totalPremium - shown > 0) {
      slices.push({ name: "Other", premium: totalPremium - shown });
    }
    share = shareSlices(slices, totalPremium);
  }

  return { label: "Carriers", items, share, shareLabel: "Premium share" };
}
