import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

describe("desk type tokens", () => {
  it("keeps body at 16px with 13–14px helper/caption and a darker muted grey", () => {
    expect(css).toContain("font-size: 16px;");
    expect(css).toContain("font-size: var(--ff-type-body);");
    expect(css).toContain("--ff-type-helper: 0.875rem;");
    expect(css).toContain("--ff-type-caption: 0.8125rem;");
    expect(css).toContain("--text-xs: 0.8125rem;");
    expect(css).toContain("--ff-muted: #3f4e5c;");
    expect(css).toContain(".text-helper");
    expect(css).toContain(".text-caption");
  });

  it("does not regress the darker sidebar or paper background", () => {
    expect(css).toContain("--ff-sidebar: #1d4e89;");
    expect(css).toContain("--ff-sidebar-blue: #1d4e89;");
    expect(css).toContain("--ff-bg: #f7f3ec;");
  });
});
