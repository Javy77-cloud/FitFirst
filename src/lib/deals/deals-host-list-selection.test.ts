import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals List multi-select", () => {
  it("restores SelectRowCheckbox + ModuleListActions on the List host only", () => {
    const list = source("src/components/deals/deals-host-list.tsx");
    const workspace = source("src/components/deals/deals-command-workspace.tsx");
    const radar = source("src/components/deals/deals-radar.tsx");
    const stack = source("src/components/deals/priority-stack.tsx");

    expect(list).toMatch(/ModuleListActions/);
    expect(list).toMatch(/module="deals"/);
    expect(list).toMatch(/SelectRowCheckbox/);
    expect(list).toMatch(/recordIds=\{cards\.map/);
    expect(list).toMatch(/dealId:\s*card\.id/);
    expect(list).toMatch(/archivedAt:\s*card\.archivedAt/);
    expect(list).toMatch(/id:\s*"pick"/);

    expect(workspace).toMatch(/view === "list"/);
    expect(workspace).toMatch(/<DealsHostList cards=\{cards\} \/>/);
    expect(workspace).not.toMatch(/ModuleListActions|SelectRowCheckbox/);

    expect(radar).not.toMatch(/ModuleListActions|SelectRowCheckbox/);
    expect(stack).not.toMatch(/ModuleListActions|SelectRowCheckbox/);
  });
});
