import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookKpiStrip } from "@/components/book-lists/book-kpi-strip";
import { partyBookKpis } from "@/lib/book-lists/kpi";
import type { BookGlanceCard } from "@/lib/book-lists/types";

function card(id: string): BookGlanceCard {
  return {
    id,
    surface: "contacts",
    href: `/${id}`,
    title: id,
    heat: "cold",
    glance: [],
    why: "",
    primaryAction: { label: "Open", href: `/${id}` },
    hay: id,
    lastTouchDays: null,
    flags: { hasPhone: true, hasEmail: false },
    column: "current",
  };
}

describe("Contacts list header", () => {
  it("puts every counter on one flat row of white chips", () => {
    const model = partyBookKpis("contact", [card("a"), card("b")]);
    const html = renderToStaticMarkup(
      <BookKpiStrip label={model.label} items={model.items} flat />,
    );
    expect(html).toContain('data-ff-book-kpi="flat"');
    expect(html).toContain("ff-book-kpi-flat");
    const css = readFileSync("src/app/globals.css", "utf8");
    const row = css.match(/\.ff-book-kpi-flat \{[^}]*\}/)?.[0] ?? "";
    const chip = css.match(/\.ff-book-kpi-flat \.ff-book-kpi-item \{[^}]*\}/)?.[0] ?? "";
    expect(row).toMatch(/margin:\s*0\.35rem 0 1\.5rem/);
    expect(row).toMatch(/gap:\s*1\.25rem/);
    expect(row).toMatch(/grid-auto-flow:\s*column/);
    expect(row).toMatch(/grid-auto-columns:\s*minmax\(7\.75rem,\s*1fr\)/);
    expect(row).toMatch(/background:\s*transparent/);
    expect(row).toMatch(/border:\s*0/);
    expect(row).toMatch(/box-shadow:\s*none/);
    expect(chip).toMatch(/background:\s*#fff/);
    expect(chip).toMatch(/flex-direction:\s*column/);
    expect(chip).toMatch(/align-items:\s*center/);
    expect(chip).toMatch(/justify-content:\s*center/);
    expect(chip).toMatch(/text-align:\s*center/);
    expect(chip).not.toMatch(/background:\s*transparent/);
    expect(html).not.toContain("ff-book-kpi-item is-name");
    expect(html).not.toContain("<em>");
    for (const label of ["People", "With phone", "With email", "Reached lately", "Not reached", "Open deals", "Renewing ≤60d"]) {
      expect(html).toContain(label);
    }
    expect(html.indexOf("People")).toBeLessThan(html.indexOf("With phone"));
    expect(html.indexOf("With phone")).toBeLessThan(html.indexOf("With email"));
  });

  it("keeps the contacts actions bar in check, search, Actions, filters, New Contact order", () => {
    const barFile = readFileSync("src/components/developer-hub/list-selection.tsx", "utf8");
    const bar = barFile.slice(barFile.indexOf('data-testid="list-selection-bar"'));
    const page = readFileSync("src/app/contacts/page.tsx", "utf8");
    const check = bar.indexOf("<SelectAllCheckbox");
    const search = bar.indexOf("{afterCheck}");
    const cue = bar.indexOf("Select rows for Actions");
    const actions = bar.indexOf("<SelectionActionsMenu");
    const filters = bar.indexOf("{afterActions}");
    const end = bar.indexOf("{end}");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(search);
    expect(search).toBeLessThan(cue);
    expect(cue).toBeLessThan(actions);
    expect(actions).toBeLessThan(filters);
    expect(filters).toBeLessThan(end);
    expect(bar).toMatch(/hideSelectionCue \? null/);
    expect(page).toMatch(/hideSelectionCue/);
    expect(page).not.toMatch(/Select rows for Actions/);
    expect(page.indexOf("<BookKpiStrip")).toBeLessThan(page.indexOf("<ModuleListActions"));
    expect(page.indexOf("afterCheck={<PipelineFilterSearch />}")).toBeLessThan(
      page.indexOf("afterActions={<PipelineFilterControls />}"),
    );
    expect(page.indexOf("afterActions={<PipelineFilterControls />}")).toBeLessThan(
      page.indexOf("data-ff-contacts-list-actions"),
    );
    expect(page).toMatch(/searchPlaceholder="Find a person, phone, or email…"/);
    expect(readFileSync("src/app/accounts/page.tsx", "utf8")).not.toMatch(/hideSelectionCue|ff-book-kpi-flat/);
    expect(readFileSync("src/app/policies/page.tsx", "utf8")).not.toMatch(/hideSelectionCue|ff-book-kpi-flat/);
    expect(readFileSync("src/app/carriers/page.tsx", "utf8")).not.toMatch(/hideSelectionCue|ff-book-kpi-flat/);
  });
});
