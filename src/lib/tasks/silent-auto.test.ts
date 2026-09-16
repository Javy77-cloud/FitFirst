import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isOpenSilentAutoTask,
  isSilentAutoTaskKind,
  isSilentAutoTaskTitle,
  SILENT_AUTO_TASK_CLEANUP_SQL,
} from "./silent-auto";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("silent auto-task matcher", () => {
  it("matches stage / quote-sent / review / mint / packet junk titles", () => {
    expect(isSilentAutoTaskTitle("Stage · quote_sent · Diego Martinez")).toBe(true);
    expect(isSilentAutoTaskTitle("Stage · quotes · Diego Martinez")).toBe(true);
    expect(isSilentAutoTaskTitle("Stage · review · Gloria")).toBe(true);
    expect(isSilentAutoTaskTitle("Stage · homeowners · quote_sent · Heather")).toBe(true);
    expect(isSilentAutoTaskTitle("Confirm declaration · Homeowners · Rosa Castellanos")).toBe(true);
    expect(isSilentAutoTaskTitle("Collect ID cards · HP-FL-88421")).toBe(true);
    expect(isSilentAutoTaskTitle("Collect AOR packet · HO3-ELENA-2026")).toBe(true);
    expect(isSilentAutoTaskTitle("Collect AOR package · ATM205086")).toBe(true);
    expect(isSilentAutoTaskKind("stage_move")).toBe(true);
    expect(isSilentAutoTaskKind("mint_confirm")).toBe(true);
    expect(isSilentAutoTaskKind("servicing_aor")).toBe(true);
  });

  it("leaves agent notice / reminder tasks alone", () => {
    expect(isSilentAutoTaskKind("work_reminder")).toBe(false);
    expect(isSilentAutoTaskKind("30_day")).toBe(false);
    expect(isSilentAutoTaskTitle("30-day notice — mortgagee on Hale HO3")).toBe(false);
    expect(isSilentAutoTaskTitle("Work reminder — call Rosa")).toBe(false);
    expect(isOpenSilentAutoTask({ kind: "stage_move", title: "Stage · quote_sent · X", status: "done" })).toBe(
      false,
    );
    expect(
      isOpenSilentAutoTask({
        kind: "work_reminder",
        title: "Work reminder — inspection",
        status: "open",
      }),
    ).toBe(false);
  });

  it("cleanup SQL is tenant-scoped and only cancels open junk", () => {
    expect(SILENT_AUTO_TASK_CLEANUP_SQL).toMatch(/tenant_id = \$1/);
    expect(SILENT_AUTO_TASK_CLEANUP_SQL).toMatch(/status = 'open'/);
    expect(SILENT_AUTO_TASK_CLEANUP_SQL).toMatch(/status = 'cancelled'/);
    expect(SILENT_AUTO_TASK_CLEANUP_SQL).not.toMatch(/DELETE /i);
  });
});

describe("stage and packet hooks do not insert Tasks", () => {
  it("quote_sent / review stage moves pass createTask: false", () => {
    const signals = source("src/lib/crm/signals.ts");
    expect(signals).toMatch(/export function shouldCreateStageTask/);
    expect(signals).toMatch(/return false/);
    expect(signals).toMatch(/writeDeskComms/);
    expect(signals).toMatch(/eventType: "stage_moved"/);
    expect(signals).toMatch(/input\.kind === "stage_moved" \? false/);
    expect(signals).not.toMatch(/key === "quote_sent"/);

    const pipeline = source("src/app/actions/pipeline.ts");
    expect(pipeline).toMatch(/createTask:\s*shouldCreateStageTask\(/);

    const crm = source("src/app/actions/crm.ts");
    const updateStage = crm.slice(crm.indexOf("export async function updateDealStage"));
    expect(updateStage).toMatch(/createTask:\s*false/);
    expect(updateStage).not.toMatch(/createTask:\s*resolved\.pipelineStageSlug === "quote_sent"/);

    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/createTask:\s*false/);
    expect(mint).not.toMatch(/createTask:\s*true/);
  });

  it("policy servicing load no longer auto-inserts Collect AOR / ID card tasks", () => {
    const queries = source("src/lib/ams/queries.ts");
    const fn = queries.slice(
      queries.indexOf("export async function ensureServicingSuspense"),
      queries.indexOf("export async function listServiceRequestEvents"),
    );
    expect(fn).toMatch(/return pending/);
    expect(fn).not.toMatch(/\.insert\(reviewTasks\)/);
    expect(fn).not.toMatch(/packetTaskTitle/);
  });

  it("notice reminder create path is still agent-gated", () => {
    const productStage = source("src/app/actions/product-stage.ts");
    expect(productStage).toMatch(/Reminder is createDeskTask — never a second engine/);
    expect(productStage).toMatch(/createTask:\s*false/);
  });
});
