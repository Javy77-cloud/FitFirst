import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookPriorityStack } from "@/components/book-lists/book-stack";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import { presentPartyCard } from "./present";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function accountCard(overrides: Partial<Parameters<typeof presentPartyCard>[0]> = {}) {
  return presentPartyCard(
    {
      id: "a1",
      name: "Diaz Marine LLC",
      phone: "(321) 555-0144",
      email: "office@diazmarine.example",
      operations: "Marina slip rental and boat repair",
      primaryContactName: "Fabia Diaz",
      clientStatus: "client",
      policyCount: 3,
      activePolicyCount: 2,
      nearestRenewalDays: 40,
      ...overrides,
    },
    "account",
    { asOf: new Date("2026-09-21T12:00:00.000Z") },
  );
}

describe("Accounts Stack layout lock", () => {
  it("source-locks exactly 3 rows, phone-row columns, sticky header, no dash, and client status from counts", () => {
    const card = source("src/components/book-lists/glance-card.tsx");
    const css = source("src/app/globals.css");
    const present = source("src/lib/book-lists/present.ts");
    const stackFile = source("src/components/book-lists/book-stack.tsx");
    const accountsPage = source("src/app/accounts/page.tsx");
    const queries = source("src/lib/db/queries.ts");
    const schema = source("src/lib/db/schema.ts");

    expect(card).toMatch(/data-ff-account-stack-card/);
    expect(card).toMatch(/data-ff-account-stack-check/);
    expect(card).toMatch(/data-ff-account-stack-header/);
    expect(card).toMatch(/data-ff-account-stack-row="name"/);
    expect(card).toMatch(/data-ff-account-stack-row="phone"/);
    expect(card).toMatch(/data-ff-account-stack-row="email"/);
    expect(card).toMatch(/data-ff-account-stack-phone/);
    expect(card).toMatch(/data-ff-account-stack-email/);
    expect(card).toMatch(/data-ff-account-stack-reach/);
    expect(card).toMatch(
      /ACCOUNT_STACK_META = \["operations", "contact", "policies", "renewals", "status"\]/,
    );
    expect(card).toMatch(/data-ff-account-stack-col=\{column\.id\}/);
    expect(card).not.toMatch(/sort ascending|sort descending|aria-sort/);

    const stackStart = card.indexOf("function AccountStackCard");
    expect(stackStart).toBeGreaterThan(-1);
    const stackSrc = card.slice(stackStart, card.indexOf("/** Policies Stack"));
    const rowIds = [...stackSrc.matchAll(/data-ff-account-stack-row="([^"]+)"/g)].map((match) => match[1]);
    expect([...new Set(rowIds)]).toEqual(["name", "phone", "email"]);
    expect(stackSrc.indexOf("data-ff-account-stack-check")).toBeLessThan(stackSrc.indexOf('className="ff-stack-name"'));
    expect(stackSrc.indexOf("data-ff-account-stack-glyph")).toBeLessThan(stackSrc.indexOf("data-ff-account-stack-phone"));
    expect(stackSrc.indexOf("data-ff-account-stack-phone")).toBeLessThan(stackSrc.indexOf("data-ff-account-stack-col"));
    expect(stackSrc.indexOf("data-ff-account-stack-col")).toBeLessThan(stackSrc.indexOf("data-ff-account-stack-email"));
    expect(stackSrc).toMatch(/data-ff-account-stack-col=\{column\.id\}[\s\S]*data-ff-account-stack-row="phone"/);
    expect(stackSrc).not.toMatch(/[—–]/);
    expect(stackSrc).not.toMatch(/ff-book-facts|ClientStatusPill|data-ff-contact-status-dot|data-status-color/);

    expect(stackFile).toMatch(/AccountStackColumnHeader/);
    expect(stackFile).toMatch(/surface === "accounts"/);

    const footerStart = present.indexOf("function accountStackFooter");
    expect(footerStart).toBeGreaterThan(-1);
    const footer = present.slice(footerStart, present.indexOf("function maskedFein"));
    expect(footer.indexOf('id: "operations"')).toBeLessThan(footer.indexOf('id: "contact"'));
    expect(footer.indexOf('id: "contact"')).toBeLessThan(footer.indexOf('id: "policies"'));
    expect(footer.indexOf('id: "policies"')).toBeLessThan(footer.indexOf('id: "renewals"'));
    expect(footer.indexOf('id: "renewals"')).toBeLessThan(footer.indexOf('id: "status"'));
    expect(footer).toMatch(/clientStatusCue\(statusRaw\)/);
    expect(footer).toMatch(/primaryContactName/);
    expect(footer).toMatch(/renewalColumnLabel\(row\.nearestRenewalDays\)/);
    expect(footer).toMatch(/String\(row\.policyCount \?\? 0\)/);

    const accountsFn = queries.slice(queries.indexOf("export async function listAccounts"));
    expect(accountsFn).toMatch(/clientStatus: clientStatusFromCounts\(counts\.lifetime, counts\.inForce\)/);
    expect(accountsFn).toMatch(/primaryContactName/);
    expect(accountsFn).toMatch(/officerContactId/);
    expect(accountsFn).toMatch(/principal\|owner\|primary/);
    const accountsTable = schema.slice(
      schema.indexOf("export const accounts = pgTable"),
      schema.indexOf("export const contactCoapplicants"),
    );
    expect(accountsTable).toMatch(/operations: text\("operations"\)/);
    expect(accountsTable).not.toMatch(/client_status|clientStatus/);

    expect(accountsPage).toMatch(/emptyPlaceholder="none"/);

    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-spread \{[^}]*grid-template-rows:\s*auto auto auto/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-header,\s*\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-spread \{[^}]*grid-template-columns:\s*var\(--ff-account-stack-cols\)/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-check \{/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-col\[data-ff-account-stack-col="operations"\] \{[^}]*grid-column:\s*3;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-col\[data-ff-account-stack-col="contact"\] \{[^}]*grid-column:\s*4;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-col\[data-ff-account-stack-col="policies"\] \{[^}]*grid-column:\s*5;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-col\[data-ff-account-stack-col="renewals"\] \{[^}]*grid-column:\s*6;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-col\[data-ff-account-stack-col="status"\] \{[^}]*grid-column:\s*7;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-phone \{[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-email \{[^}]*grid-row:\s*3/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-reach \{[^}]*grid-column:\s*8;[^}]*grid-row:\s*3/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-header \{[^}]*position:\s*sticky/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-col,\s*\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-phone a,\s*\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-email a,\s*\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-reach \{[^}]*font-size:\s*0\.9rem;[^}]*background:\s*none/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-card \[data-ff-assign-tags\]:not\(:has\(\[data-ff-tag-chip\]\)\) \{[^}]*display:\s*none/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-card \.ff-stack-name \{[^}]*font-weight:\s*750/,
    );
    expect(css).not.toMatch(
      /\[data-ff-book-command="accounts"\]\[data-ff-book-layout="stack"\] \.ff-account-stack-card \.ff-stack-name \{[^}]*font-size:/,
    );
  });

  it("renders name, then phone-row columns ops to status, then email with reach", () => {
    const card = accountCard();
    expect(card.columns?.map((column) => column.id)).toEqual([
      "operations",
      "contact",
      "policies",
      "renewals",
      "status",
    ]);
    expect(card.columns?.map((column) => column.label)).toEqual([
      "Marina slip rental and boat repair",
      "Fabia Diaz",
      "3",
      "Renews in 40d",
      "Client",
    ]);
    expect(card.mid).toBe("Not reached");

    const html = renderToStaticMarkup(
      <BookGlanceCardView
        card={card}
        layoutMode="stack"
        leading={<input type="checkbox" aria-label="Select row" />}
      />,
    );
    expect(html).toContain('data-ff-account-stack-card="a1"');
    expect(html).toContain('data-ff-account-stack-check=""');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-ff-account-stack-row="name"');
    expect(html).toContain('data-ff-account-stack-row="phone"');
    expect(html).toContain('data-ff-account-stack-row="email"');
    expect(html).toContain("Diaz Marine LLC");
    expect(html).toContain("(321) 555-0144");
    expect(html).toContain("office@diazmarine.example");
    expect(html).toContain("Fabia Diaz");
    expect(html).toContain("Not reached");
    expect(html).not.toContain("ff-book-channels");
    expect(html).not.toContain("ff-book-facts");
    expect(html).not.toContain("ff-book-grid");
    expect(html).not.toContain("data-ff-contact-stack-card");
    expect(html).not.toContain("data-ff-contact-status-dot");
    expect(html).not.toContain("data-status-color");
    expect(html.replace(/ title="[^"]*"/g, "").match(/>Client</g)).toEqual([">Client<"]);
    expect(html.indexOf('data-ff-account-stack-row="name"')).toBeLessThan(
      html.indexOf('data-ff-account-stack-row="phone"'),
    );
    expect(html.indexOf('data-ff-account-stack-row="phone"')).toBeLessThan(
      html.indexOf('data-ff-account-stack-row="email"'),
    );
    expect(html.indexOf('data-ff-account-stack-check=""')).toBeLessThan(html.indexOf('class="ff-stack-name"'));
    expect(html.indexOf("data-ff-account-stack-glyph")).toBeLessThan(html.indexOf("data-ff-account-stack-phone"));
    expect(html.indexOf("data-ff-account-stack-phone")).toBeLessThan(html.indexOf("data-ff-account-stack-email"));
    const phoneRow = html.slice(
      html.indexOf('data-ff-account-stack-row="phone"'),
      html.indexOf('data-ff-account-stack-row="email"'),
    );
    expect(phoneRow).toContain('data-ff-account-stack-col="operations"');
    expect(phoneRow).toContain('data-ff-account-stack-col="contact"');
    expect(phoneRow).toContain('data-ff-account-stack-col="policies"');
    expect(phoneRow).toContain('data-ff-account-stack-col="renewals"');
    expect(phoneRow).toContain('data-ff-account-stack-col="status"');
    expect(html.indexOf('data-ff-account-stack-col="operations"')).toBeLessThan(
      html.indexOf('data-ff-account-stack-col="contact"'),
    );
    expect(html.indexOf('data-ff-account-stack-col="contact"')).toBeLessThan(
      html.indexOf('data-ff-account-stack-col="policies"'),
    );
    expect(html.indexOf('data-ff-account-stack-col="policies"')).toBeLessThan(
      html.indexOf('data-ff-account-stack-col="renewals"'),
    );
    expect(html.indexOf('data-ff-account-stack-col="renewals"')).toBeLessThan(
      html.indexOf('data-ff-account-stack-col="status"'),
    );
    const nameRow = html.slice(
      html.indexOf('data-ff-account-stack-row="name"'),
      html.indexOf('data-ff-account-stack-row="phone"'),
    );
    expect(nameRow).not.toContain("data-ff-account-stack-col");
    expect(nameRow).not.toContain("data-ff-account-stack-phone");
    expect(nameRow).not.toContain("data-ff-account-stack-email");
  });

  it("keeps a sticky column header above the first card, labels only", () => {
    const html = renderToStaticMarkup(
      <BookPriorityStack cards={[accountCard()]} empty="No accounts in this lens." layoutMode="stack" />,
    );
    expect(html).toContain('data-ff-account-stack-header=""');
    expect(html.indexOf("data-ff-account-stack-header")).toBeLessThan(html.indexOf("data-ff-account-stack-card"));
    for (const label of [
      "Name",
      "Operations",
      "Attached contact",
      "Policy count",
      "Renewals",
      "Client status",
      "Reach",
    ]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).not.toMatch(/aria-sort|sort ascending|sort descending/i);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("data-ff-contact-stack-header");
  });

  it("drops a dash reach and does not paint a status pill or empty-tag dash", () => {
    const card = {
      ...accountCard({
        operations: "—",
        operationsDescription: null,
        primaryContactName: "—",
        clientStatus: null,
        nearestRenewalDays: null,
        policyCount: 0,
        activePolicyCount: 0,
      }),
      mid: "—",
      why: "—",
      subtitle: "client",
      facts: [{ id: "status", label: "Client" }],
    };
    const html = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="stack" />);
    expect(html).not.toContain("—");
    expect(html).not.toContain("data-ff-account-stack-reach");
    expect(html).not.toContain("ff-book-facts");
    expect(html).not.toContain("data-status-color");
    expect(html).not.toContain("data-ff-contact-status-dot");
    expect(html).not.toContain(">Client<");
  });

  it("keeps empty phone-row cells blank, policy count at 0, and renewal blank when none", () => {
    const card = accountCard({
      operations: null,
      operationsDescription: "-",
      primaryContactName: null,
      clientStatus: "—",
      nearestRenewalDays: null,
      policyCount: 0,
      activePolicyCount: 0,
    });
    expect(card.columns?.map((column) => column.label)).toEqual(["", "", "0", "", ""]);
  });

  it("reads client status from counts through the existing cue, not a new field", () => {
    const asOf = new Date("2026-09-21T12:00:00.000Z");
    const base = {
      id: "a-status",
      name: "Diaz Marine LLC",
      policyCount: 0,
      activePolicyCount: 0,
    };
    expect(
      presentPartyCard({ ...base, clientStatus: "client" }, "account", { asOf }).columns?.find(
        (column) => column.id === "status",
      )?.label,
    ).toBe("Client");
    expect(
      presentPartyCard({ ...base, clientStatus: "former_client" }, "account", { asOf }).columns?.find(
        (column) => column.id === "status",
      )?.label,
    ).toBe("Former client");
    expect(
      presentPartyCard({ ...base, clientStatus: "not_a_client" }, "account", { asOf }).columns?.find(
        (column) => column.id === "status",
      )?.label,
    ).toBe("Not a client");
  });

  it("uses the operations description when the operations line is blank", () => {
    const card = accountCard({
      operations: null,
      operationsDescription: "Dock work and haul-out",
    });
    expect(card.columns?.find((column) => column.id === "operations")?.label).toBe("Dock work and haul-out");
  });
});
