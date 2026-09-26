import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RENEWAL_AGREED_LABEL } from "@/lib/policies/renewal-agreed";
import { RENEWAL_HANDLED_FILTER_LABEL } from "@/lib/renewal/handled";
import { HandledStamp, RenewalBoardHandledStamp } from "./handled-stamp";

describe("Handled rubber stamp", () => {
  it("keeps existing copy on every surface that shares the stamp", () => {
    const board = renderToStaticMarkup(<RenewalBoardHandledStamp />);
    expect(board).toContain(`>${RENEWAL_HANDLED_FILTER_LABEL}<`);
    expect(board).toContain('data-ff-handled-stamp="board"');
    expect(board).toContain('data-ff-renewal-handled=""');
    expect(board).toContain("ff-handled-stamp-ink");
    expect(board).not.toContain("ff-renewal-handled-pill");

    const dossier = renderToStaticMarkup(
      <HandledStamp surface="dossier" label={RENEWAL_AGREED_LABEL} />,
    );
    expect(dossier).toContain(`>${RENEWAL_AGREED_LABEL}<`);
    expect(dossier).toContain('data-ff-handled-stamp="dossier"');
    expect(dossier).toContain('data-ff-renewal-agreed-stamp=""');

    const band = renderToStaticMarkup(
      <HandledStamp surface="band" label={RENEWAL_AGREED_LABEL} />,
    );
    expect(band).toContain("ff-renewal-agreed-badge");
    expect(band).toContain('data-ff-handled-stamp="band"');

    const stack = renderToStaticMarkup(
      <HandledStamp surface="stack" label={RENEWAL_AGREED_LABEL} />,
    );
    expect(stack).toContain("ff-policy-renewal-agreed");
    expect(stack).toContain("ff-deal-notice-compact-ink");
    expect(stack).toContain('data-ff-handled-stamp="stack"');
  });

  it("styles the board mark as a tilted coral stamp, including a brighter dark-mode wash", () => {
    const card = readFileSync("src/components/renewals/renewal-card.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(card).toContain("<RenewalBoardHandledStamp />");
    expect(card).not.toContain("ff-renewal-handled-pill");
    expect(css).toMatch(/\.ff-handled-stamp\s*\{[^}]*transform:\s*rotate\(-10deg\)/);
    expect(css).toMatch(/--ff-stamp-ink:\s*#b42318/);
    expect(css).toMatch(/--ff-stamp-wash:\s*#fff1ec/);
    expect(css).toMatch(/\.dark\s*\{[^}]*--ff-stamp-wash:\s*#ffe4db/);
    expect(css).toMatch(/\.ff-handled-stamp \.ff-handled-stamp-ink\s*\{[^}]*font-size:\s*1\.65rem/);
    expect(css).not.toMatch(/\.ff-renewal-handled-pill\s*\{/);
  });
});
