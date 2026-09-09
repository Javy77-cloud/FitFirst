import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Support placement (tip sep7gb)", () => {
  it("drops the floating Support FAB and keeps header + ProfileMenu entry", () => {
    const help = source("src/components/support/help-center.tsx");
    const profile = source("src/components/profile-menu.tsx");
    const header = source("src/components/desk-header.tsx");
    const shell = source("src/components/app-shell.tsx");

    expect(help).not.toMatch(/fixed bottom-5/);
    expect(help).toMatch(/Sheet open=\{open\}/);
    expect(help).toMatch(/parseSupportQuery/);
    expect(help).toMatch(/export function SupportLauncher/);

    expect(header).toMatch(/openSupport\(\)/);
    expect(header).toMatch(/title="Support"/);
    expect(header).toMatch(/CircleHelp/);

    expect(profile).toMatch(/useSupport/);
    expect(profile).toMatch(/openSupport\(\)/);
    expect(profile).toMatch(/DropdownMenuItem onClick=\{\(\) => openSupport\(\)\}>Support</);

    expect(shell).toMatch(/SupportProvider/);
    expect(shell).toMatch(/SupportLauncher/);
  });
});
