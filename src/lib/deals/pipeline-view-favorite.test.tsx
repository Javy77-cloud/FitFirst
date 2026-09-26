import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DEFAULT_DESK_LINE_SETTINGS } from "@/lib/desk/line-settings";
import { FAVORITE_VIEW_TOOLTIP, favoriteViewFormData } from "@/lib/wire/view-favorite";
import { PIPELINE_VIEW_COOKIE, RENEWALS_VIEW_COOKIE } from "@/lib/wire/pipeline-view-cookies";
import { renewalsHref } from "@/lib/wire/pipeline";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const settings = DEFAULT_DESK_LINE_SETTINGS;

function buttons(html: string) {
  return [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);
}

function chipSlice(html: string, id: string) {
  const marker = `data-ff-view-chip="${id}"`;
  const at = html.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<span", at);
  const next = html.indexOf("data-ff-view-chip=", at + marker.length);
  return html.slice(start, next === -1 ? undefined : next);
}

describe("favorite star inside view chips", () => {
  it("marks only the saved favorite and keeps the star off the view link", () => {
    const html = renderToStaticMarkup(
      <DealWorkspaceBar
        boards={[{ slug: "p-c", name: "P&C" }]}
        view="stack"
        defaultView="radar"
        settings={settings}
        cookieKey={PIPELINE_VIEW_COOKIE}
      />,
    );

    expect(html).toContain(">Stack<");
    expect(html).toContain(">Radar<");
    expect(html).toContain(">List<");
    expect(html).not.toContain(">Board<");

    const stars = buttons(html).filter((button) => button.includes("data-ff-view-favorite"));
    expect(stars.map((button) => button.match(/data-ff-view-favorite="([^"]+)"/)?.[1])).toEqual([
      "stack",
      "radar",
      "list",
    ]);
    expect(stars.filter((button) => button.includes('data-favorite="true"'))).toHaveLength(1);
    expect(stars.find((button) => button.includes('data-ff-view-favorite="radar"'))).toMatch(/data-favorite="true"/);
    expect(stars.find((button) => button.includes('data-ff-view-favorite="radar"'))).toMatch(/aria-pressed="true"/);
    expect(stars.find((button) => button.includes('data-ff-view-favorite="stack"'))).toMatch(/data-favorite="false"/);
    expect(stars.find((button) => button.includes('data-ff-view-favorite="list"'))).toMatch(/data-favorite="false"/);

    for (const id of ["stack", "radar", "list"]) {
      const slice = chipSlice(html, id);
      const star = stars.find((button) => button.includes(`data-ff-view-favorite="${id}"`)) ?? "";
      expect(star).toContain(`title="${FAVORITE_VIEW_TOOLTIP}"`);
      expect(star).toContain(`aria-label="${FAVORITE_VIEW_TOOLTIP}"`);
      expect(star).toContain('type="button"');
      expect(slice.indexOf("</a>")).toBeGreaterThan(-1);
      expect(slice.indexOf("<button")).toBeGreaterThan(slice.indexOf("</a>"));
      expect(slice).toContain(`data-ff-view-link="${id}"`);
    }

    const radar = chipSlice(html, "radar");
    const stack = chipSlice(html, "stack");
    expect(radar).toContain("fill-current");
    expect(stack).not.toContain("fill-current");
    expect(stack).toContain('data-active="true"');
    expect(radar).toContain('data-active="false"');
  });

  it("uses the same star-in-chip pattern on Renewals", () => {
    const html = renderToStaticMarkup(
      <DealWorkspaceBar
        boards={[{ slug: "p-c", name: "P&C" }]}
        view="board"
        defaultView="list"
        settings={settings}
        cookieKey={RENEWALS_VIEW_COOKIE}
        hrefBuilder={renewalsHref}
        boardWhenNoPipeline={null}
      />,
    );

    expect(html).toContain(">Board<");
    expect(html).toContain(">Stack<");
    expect(html).toContain(">List<");
    expect(html).not.toContain(">Radar<");

    const stars = buttons(html).filter((button) => button.includes("data-ff-view-favorite"));
    expect(stars.map((button) => button.match(/data-ff-view-favorite="([^"]+)"/)?.[1])).toEqual([
      "board",
      "stack",
      "list",
    ]);
    expect(stars.filter((button) => button.includes('data-favorite="true"'))).toHaveLength(1);
    expect(stars.find((button) => button.includes('data-ff-view-favorite="list"'))).toMatch(/data-favorite="true"/);
    expect(stars.every((button) => button.includes(`title="${FAVORITE_VIEW_TOOLTIP}"`))).toBe(true);
    expect(stars.every((button) => button.includes(`aria-label="${FAVORITE_VIEW_TOOLTIP}"`))).toBe(true);

    const list = chipSlice(html, "list");
    const board = chipSlice(html, "board");
    expect(list).toContain("fill-current");
    expect(list).toContain('data-active="false"');
    expect(board).toContain('data-active="true"');
    expect(board).not.toContain("fill-current");
    expect(list.indexOf("<button")).toBeGreaterThan(list.indexOf("</a>"));
  });

  it("writes the clicked view into the existing cookie, not the view that is open", () => {
    const deals = favoriteViewFormData("list", PIPELINE_VIEW_COOKIE);
    expect(deals.get("view")).toBe("list");
    expect(deals.get("cookie")).toBe(PIPELINE_VIEW_COOKIE);
    expect(String(deals.get("view"))).not.toBe("");

    const renewals = favoriteViewFormData("stack", RENEWALS_VIEW_COOKIE);
    expect(renewals.get("view")).toBe("stack");
    expect(renewals.get("cookie")).toBe(RENEWALS_VIEW_COOKIE);

    const chips = source("src/components/deals/pipeline-view-chips.tsx");
    expect(chips).toMatch(/favoriteViewFormData\(view, cookieKey\)/);
    expect(chips).toMatch(/onFavorite\(chip\.id, event\)/);
    expect(chips).toMatch(/event\.stopPropagation\(\)/);
    expect(chips).toMatch(/event\.preventDefault\(\)/);
    expect(chips).not.toMatch(/currentView/);
    expect(chips).toMatch(/saveDefaultPipelineViewAction/);
    expect(FAVORITE_VIEW_TOOLTIP).toBe("Set as favorite.");

    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/<PipelineViewChips/);
    expect(bar).not.toMatch(/PipelineViewDefaultStar/);
    expect(source("src/components/renewals/renewals-desk.tsx")).toMatch(/DealWorkspaceBar/);
    expect(source("src/app/deals/page.tsx")).toMatch(/<DealWorkspaceBar/);
    expect(source("src/app/actions/pipeline-view-prefs.ts")).toMatch(/jar\.set\(cookie, view, COOKIE_OPTS\)/);
  });
});
