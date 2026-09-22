import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookPriorityStack } from "@/components/book-lists/book-stack";
import { BookGlanceCardView, CarrierStackColumnHeader } from "@/components/book-lists/glance-card";
import { presentCarrierCard } from "./present";
import type { CarrierMarketSignal } from "./present";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const signal = {
  rateable: null,
  skipDecline: false,
  skipWhy: null,
  limited: true,
  appetiteLines: ["HO3"],
  dontWrite: [],
  lastUseAt: null,
  lastUseKind: null,
  declineCount: 0,
  skipCount: 0,
  activePolicies: 4,
  premiumVolume: 12400,
  bookFamilies: ["pc"],
} satisfies CarrierMarketSignal;

function carrierCard(overrides: Partial<Parameters<typeof presentCarrierCard>[0]> = {}) {
  return presentCarrierCard(
    {
      id: "oak",
      name: "Southern Oak",
      writtenLines: ["HO3", "AUTO"],
      phone: "(800) 555-0199",
      email: "uw@southernoak.example",
      portalUrl: "https://portal.example/oak",
      ...overrides,
    },
    signal,
    new Date("2026-09-21T12:00:00.000Z"),
    { writeLife: false, writeHealth: false },
  );
}

describe("Carriers Stack layout lock", () => {
  it("source-locks 3 rows, activity by the name, sticky header, and plain tracks", () => {
    const card = source("src/components/book-lists/glance-card.tsx");
    const css = source("src/app/globals.css");
    const present = source("src/lib/book-lists/present.ts");
    const stackFile = source("src/components/book-lists/book-stack.tsx");
    const workspace = source("src/components/book-lists/book-workspace.tsx");
    const carriersPage = source("src/app/carriers/page.tsx");
    const activity = source("src/components/desk/standard-activity-panel.tsx");

    const stackStart = card.indexOf("function CarrierStackCard");
    expect(stackStart).toBeGreaterThan(-1);
    const stackSrc = card.slice(stackStart, card.indexOf("/** Narrow band column"));
    const rowIds = [...stackSrc.matchAll(/data-ff-carrier-stack-row="([^"]+)"/g)].map((match) => match[1]);
    expect([...new Set(rowIds)]).toEqual(["name", "phone", "email"]);
    expect(card).toMatch(/CARRIER_STACK_CENTER = \["portal", "lines", "policies"\]/);
    expect(card).toMatch(/CARRIER_STACK_BOTTOM = \["status", "last-use"\]/);
    expect(stackSrc.indexOf("data-ff-carrier-stack-check")).toBeLessThan(stackSrc.indexOf('className="ff-stack-name"'));
    expect(stackSrc.indexOf("data-ff-carrier-stack-heartbeat")).toBeGreaterThan(stackSrc.indexOf('className="ff-stack-name"'));
    expect(stackSrc.indexOf("data-ff-carrier-stack-heartbeat")).toBeLessThan(stackSrc.indexOf("data-ff-carrier-stack-phone"));
    const phoneSpan = stackSrc.slice(
      stackSrc.indexOf("ff-carrier-stack-phone"),
      stackSrc.indexOf("CARRIER_STACK_CENTER.map"),
    );
    expect(phoneSpan).not.toMatch(/activity|heartbeat/);
    expect(stackSrc).toMatch(/EmptyFieldDash/);
    expect(stackSrc).toMatch(/data-ff-book-action/);
    expect(stackSrc).not.toMatch(/ff-book-facts|data-ff-carrier-stack-row="meta"/);

    expect(card).toMatch(/function CarrierStackColumnHeader/);
    expect(card).toMatch(/surface === "carriers" && layoutMode === "stack"/);
    expect(stackFile).toMatch(/CarrierStackColumnHeader/);
    expect(stackFile).toMatch(/surface === "carriers"/);
    expect(present).toMatch(/function carrierStackFooter/);
    expect(present).toMatch(/id: "portal"/);
    expect(present).toMatch(/id: "lines"/);
    expect(present).toMatch(/id: "policies"/);
    expect(present).toMatch(/id: "status"/);
    expect(present).toMatch(/id: "last-use"/);
    expect(workspace).toMatch(/surface === "carriers"/);
    expect(workspace).toMatch(/carriers-stack/);
    expect(activity).toMatch(/"carriers-stack"/);
    expect(carriersPage).toMatch(/emptyPlaceholder="none"/);
    expect(carriersPage).toMatch(/SelectRowCheckbox/);

    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-spread \{[^}]*grid-template-rows:\s*auto auto auto/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-spread \{[^}]*row-gap:\s*0\.35rem/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-header \{[^}]*position:\s*sticky/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-name \{[^}]*grid-column:\s*2 \/ -1;[^}]*grid-row:\s*1/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-phone \{ grid-row: 2; \}/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-col,\s*\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-phone a,\s*\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-email a,\s*\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-col a,\s*\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-stack-empty-dash \{[^}]*font-size:\s*0\.9rem;[^}]*background:\s*none/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-stack-empty-dash \{[^}]*text-align:\s*center/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="carriers"\]\[data-ff-book-layout="stack"\] \.ff-carrier-stack-card \[data-ff-assign-tags\]:not\(:has\(\[data-ff-tag-chip\]\)\) \{[^}]*display:\s*none/,
    );
  });

  it("renders name + heartbeat, then phone tracks, then email tracks — no fourth row", () => {
    const card = carrierCard();
    expect(card.title).toBe("Southern Oak");
    expect(card.columns?.filter((column) => ["portal", "lines", "policies", "status", "last-use"].includes(column.id)).map((column) => column.label)).toEqual([
      "Portal",
      "Home · Auto",
      "4",
      "Limited",
      "No recent use",
    ]);

    const html = renderToStaticMarkup(
      <BookGlanceCardView
        card={card}
        layoutMode="stack"
        leading={<input type="checkbox" aria-label="Select row" />}
        activity={<button type="button">Activity</button>}
      />,
    );
    expect(html).toContain('data-ff-carrier-stack-card="oak"');
    expect(html).toContain('data-ff-carrier-stack-check=""');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Southern Oak");
    expect(html).toContain("(800) 555-0199");
    expect(html).toContain("uw@southernoak.example");
    expect(html).toContain("https://portal.example/oak");
    expect(html).toContain(">Portal<");
    expect(html).toContain("Home · Auto");
    expect(html).toContain(">4<");
    expect(html).toContain(">Limited<");
    expect(html).toContain("No recent use");
    expect(html).toContain(">Open market<");
    expect(html).not.toContain("ff-book-facts");
    expect(html).not.toContain('data-ff-carrier-stack-row="meta"');
    const rows = [...new Set([...html.matchAll(/data-ff-carrier-stack-row="([^"]+)"/g)].map((match) => match[1]))];
    expect(rows).toEqual(["name", "phone", "email"]);

    const nameRow = html.slice(html.indexOf('data-ff-carrier-stack-row="name"'), html.indexOf('data-ff-carrier-stack-row="phone"'));
    expect(nameRow).toContain("Southern Oak");
    expect(nameRow).toContain('data-ff-carrier-stack-heartbeat=""');
    expect(nameRow).toContain(">Activity<");
    expect(nameRow).not.toContain("(800) 555-0199");
    expect(nameRow).not.toContain(">Portal<");

    const phoneAt = html.indexOf('data-ff-carrier-stack-phone=""');
    const emailAt = html.indexOf('data-ff-carrier-stack-email=""');
    const phoneRow = html.slice(phoneAt, emailAt);
    expect(phoneRow).toContain("(800) 555-0199");
    expect(phoneRow).toContain('data-ff-carrier-stack-col="portal"');
    expect(phoneRow).toContain('data-ff-carrier-stack-col="lines"');
    expect(phoneRow).toContain('data-ff-carrier-stack-col="policies"');
    expect(phoneRow).not.toContain("data-ff-carrier-stack-heartbeat");
    expect(phoneRow).not.toContain(">Activity<");

    const emailRow = html.slice(emailAt);
    expect(emailRow).toContain("uw@southernoak.example");
    expect(emailRow).toContain('data-ff-carrier-stack-col="status"');
    expect(emailRow).toContain('data-ff-carrier-stack-col="last-use"');
    expect(emailRow).toContain('data-ff-carrier-stack-open=""');
    expect(emailRow.indexOf('data-ff-carrier-stack-col="status"')).toBeLessThan(emailRow.indexOf('data-ff-carrier-stack-col="last-use"'));
    expect(emailRow.indexOf('data-ff-carrier-stack-col="last-use"')).toBeLessThan(emailRow.indexOf('data-ff-carrier-stack-open=""'));
    expect(emailRow).not.toContain("data-ff-carrier-stack-heartbeat");
  });

  it("centers a dash when phone or email is missing and still emits every track", () => {
    const card = presentCarrierCard(
      { id: "bare", name: "Bare Market" },
      {
        ...signal,
        limited: false,
        skipDecline: true,
        appetiteLines: [],
        activePolicies: 0,
      },
      new Date("2026-09-21T12:00:00.000Z"),
    );
    expect(card.title).toBe("Bare Market");
    expect(card.columns?.filter((column) => column.id !== "posture" && column.id !== "use").map((column) => [column.id, column.label])).toEqual([
      ["portal", "none"],
      ["lines", ""],
      ["policies", "0"],
      ["status", "Skip"],
      ["last-use", "No recent use"],
    ]);
    const html = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="stack" />);
    expect(html).toContain("Bare Market");
    expect(html.match(/data-ff-stack-empty-dash=/g)).toHaveLength(2);
    expect(html).toContain(">—<");
    expect(html).toContain(">none<");
    expect(html).toContain(">0<");
    expect(html).toContain(">Skip<");
    expect(html).not.toContain('data-ff-carrier-stack-row="dash"');
    const rows = [...new Set([...html.matchAll(/data-ff-carrier-stack-row="([^"]+)"/g)].map((match) => match[1]))];
    expect(rows).toEqual(["name", "phone", "email"]);
  });

  it("keeps a sticky column header above the first card, labels only", () => {
    const html = renderToStaticMarkup(
      <BookPriorityStack cards={[carrierCard()]} empty="No markets in this lens." layoutMode="stack" />,
    );
    expect(html).toContain('data-ff-carrier-stack-header=""');
    expect(html.indexOf("data-ff-carrier-stack-header")).toBeLessThan(html.indexOf("data-ff-carrier-stack-card"));
    for (const label of ["Name", "Portal", "Lines", "Policies", "Status", "Last use", "Open"]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).not.toMatch(/aria-sort|sort ascending|sort descending/i);
    expect(html).not.toContain("<button");

    const header = renderToStaticMarkup(<CarrierStackColumnHeader />);
    expect(header).toContain('data-ff-stack-col="portal"');
    expect(header).toContain('data-ff-stack-col="open"');
    expect(header).not.toContain("<button");
  });

  it("leaves the non-stack carrier card on the grid rail", () => {
    const html = renderToStaticMarkup(<BookGlanceCardView card={carrierCard()} layoutMode="list" />);
    expect(html).not.toContain("data-ff-carrier-stack-card");
    expect(html).toContain("ff-book-grid");
    expect(html).toContain("Limited appetite");
    expect(html).not.toContain('data-ff-carrier-stack-col="portal"');
  });
});
