import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PipelineStageBoard } from "@/lib/wire/pipeline-cards";

vi.mock("@/app/actions/pipeline-admin", () => ({
  addPipelineStage: vi.fn(),
  deletePipelineStage: vi.fn(),
  relabelPipelineStage: vi.fn(),
  reorderPipelineStage: vi.fn(),
  setPipelineStageColor: vi.fn(),
}));

import { StageColorMenu } from "@/components/deals/stage-color-menu";
import { PipelineStageEditor } from "@/components/pipeline/stage-editor";

const boards: PipelineStageBoard[] = [
  {
    id: "pipe-pc",
    slug: "p-c",
    name: "P&C pipeline",
    stages: [
      { id: "st-gather", slug: "gathering", name: "Gathering", sortOrder: 0, color: "blue", seeded: true },
      { id: "st-markets", slug: "markets", name: "Markets", sortOrder: 1, color: "teal", seeded: true },
    ],
  },
  {
    id: "pipe-life",
    slug: "life",
    name: "Life",
    stages: [
      { id: "st-life", slug: "gathering", name: "Gathering", sortOrder: 0, color: "blue", seeded: true },
    ],
  },
];

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("agent stage menu is color-only", () => {
  it("renders color pickers and no relabel, add, or delete controls", () => {
    const html = renderToStaticMarkup(
      createElement(StageColorMenu, {
        boards,
        activeId: "pipe-pc",
        onSelectBoard: () => undefined,
        returnTo: "/deals",
      }),
    );
    expect(html).toContain("Stage colors");
    expect(html).toContain('data-ff-stage-color-menu');
    expect(html).toContain('data-ff-stage-color-picker');
    expect(html).toContain("Color for Gathering");
    expect(html).toContain("Save color for Gathering");
    expect(html).toContain(">Gathering<");
    expect(html).not.toMatch(/Edit stages/i);
    expect(html).not.toMatch(/placeholder="New stage"/);
    expect(html).not.toMatch(/Name for /);
    expect(html).not.toMatch(/Move Gathering/);
    expect(html).not.toMatch(/Delete Gathering/);
    expect(html).not.toMatch(/data-ff-delete-file/);
    expect(html).not.toMatch(/>Add</);
    expect(html).not.toMatch(/>Relabel</);
  });

  it("does not offer Edit stages from the shared Deals and Renewals menu", () => {
    const menu = source("src/components/deals/pipeline-views-menu.tsx");
    const color = source("src/components/deals/stage-color-menu.tsx");
    const renewals = source("src/components/renewals/renewals-desk.tsx");
    const deals = source("src/app/deals/page.tsx");
    expect(menu).toMatch(/StageColorMenu/);
    expect(menu).not.toMatch(/Edit stages/);
    expect(menu).not.toMatch(/addPipelineStage|relabelPipelineStage|deletePipelineStage|reorderPipelineStage/);
    expect(color).toMatch(/setPipelineStageColor/);
    expect(color).not.toMatch(/addPipelineStage|relabelPipelineStage|deletePipelineStage|reorderPipelineStage/);
    expect(renewals).toMatch(/DealWorkspaceBar/);
    expect(deals).toMatch(/DealWorkspaceBar/);
    expect(renewals).toMatch(/PipelineViewsMenu|DealWorkspaceBar/);
  });

  it("keeps full stage control on the admin settings editor", () => {
    const html = renderToStaticMarkup(
      createElement(PipelineStageEditor, {
        pipelineId: "pipe-pc",
        stages: boards[0]!.stages,
        bare: true,
        returnTo: "/settings/pipeline-stages",
      }),
    );
    expect(html).toContain('data-ff-stage-editor');
    expect(html).toContain('placeholder="New stage"');
    expect(html).toContain(">Add<");
    expect(html).toContain("Name for Gathering");
    expect(html).toContain("Move Gathering up");
    expect(html).toContain("Move Gathering down");
    expect(html).toContain("Delete Gathering");
    expect(html).toContain("Color for Gathering");
    expect(html).toContain('name="next" value="/settings/pipeline-stages"');
  });
});

describe("stage mutation API guards", () => {
  it("refuses agent structure mutations and allows signed-in color changes", () => {
    const admin = source("src/app/actions/pipeline-admin.ts");
    const crm = source("src/app/actions/crm.ts");
    expect(admin).toMatch(/export async function addPipelineStage[\s\S]*assertStructureAdmin/);
    expect(admin).toMatch(/export async function relabelPipelineStage[\s\S]*assertStructureAdmin/);
    expect(admin).toMatch(/export async function deletePipelineStage[\s\S]*assertStructureAdmin/);
    expect(admin).toMatch(/export async function reorderPipelineStage[\s\S]*assertStructureAdmin/);
    expect(admin).toMatch(/export async function setPipelineStageColor[\s\S]*assertColorActor/);
    expect(admin).not.toMatch(/export async function setPipelineStageColor[\s\S]{0,180}assertAdmin\(\)/);
    expect(crm).toMatch(/export async function createPipelineStage[\s\S]*assertStageStructureMutation/);
    expect(crm).toMatch(/export async function relabelPipelineStage[\s\S]*assertStageStructureMutation/);
    expect(crm).toMatch(/export async function deletePipelineStage[\s\S]*assertStageStructureMutation/);
  });
});
