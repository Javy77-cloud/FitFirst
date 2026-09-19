import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_REVIEWS_MIGRATION,
  EXPERIENCE_REVIEWS_SQL,
  EXPERIENCE_REVIEWS_TABLE,
  splitMigrationStatements,
} from "./experience-reviews-sql";
import { pulseSaveLogContext } from "@/lib/health/pulse-save-log";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("experience_reviews migrate-on-deploy", () => {
  it("keeps embedded 0145 SQL identical to the drizzle file", () => {
    const fileSql = source("drizzle/0145_experience_reviews.sql");
    expect(splitMigrationStatements(EXPERIENCE_REVIEWS_SQL)).toEqual(splitMigrationStatements(fileSql));
    expect(fileSql).toContain(`CREATE TABLE IF NOT EXISTS "${EXPERIENCE_REVIEWS_TABLE}"`);
    expect(fileSql).toContain("experience_reviews_tenant_idx");
    expect(source("drizzle/meta/_journal.json")).toContain(EXPERIENCE_REVIEWS_MIGRATION);
  });

  it("wires drizzle migrate + 0145 ensure into Vercel build and Docker boot", () => {
    const pkg = JSON.parse(source("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toMatch(/migrate-on-deploy/);
    expect(pkg.scripts.build).toMatch(/next build/);
    expect(pkg.scripts["db:migrate:deploy"]).toMatch(/migrate-on-deploy/);
    expect(pkg.scripts["db:migrate"]).toBe("drizzle-kit migrate");

    const deploy = source("scripts/migrate-on-deploy.ts");
    expect(deploy).toMatch(/migrationsFolder: "\.\/drizzle"/);
    expect(deploy).toMatch(/0145_experience_reviews\.sql/);
    expect(deploy).toMatch(/VERCEL_ENV === "production"/);
    expect(deploy).toMatch(/experience_reviews is present/);

    const entry = source("scripts/entrypoint.sh");
    expect(entry).toMatch(/scripts\/migrate-on-deploy\.ts/);
    expect(entry).not.toMatch(/npx drizzle-kit migrate/);

    const boot = source("src/instrumentation.ts");
    expect(boot).toMatch(/ensureExperienceReviewsTable/);
    expect(boot).toMatch(/NEXT_RUNTIME !== "nodejs"/);

    const vercel = source("vercel.json");
    expect(vercel).toMatch(/migrate-on-deploy/);
    expect(vercel).toMatch(/next build/);
  });

  it("ensures the table before Pulse insert and logs Postgres failures", () => {
    const write = source("src/app/actions/health-reviews.ts");
    expect(write).toMatch(/ensureExperienceReviewsTable/);
    expect(write).toMatch(/logPulseSaveFailure/);
    expect(write).toMatch(/441 the desk when a Pulse rate is chosen/);
    expect(write).toMatch(/Could not save that pulse/);
    expect(source("src/lib/db/ensure-experience-reviews.ts")).toMatch(/sql\.unsafe/);
    expect(source("src/lib/db/ensure-experience-reviews.ts")).toMatch(/0145 statement failed/);
    expect(source("scripts/migrate-on-deploy.ts")).toMatch(/0145 statement failed/);
  });

  it("exposes greppable Pulse save errors for Vercel logs", () => {
    const ctx = pulseSaveLogContext({
      stage: "insert",
      error: { code: "42P01", message: 'relation "experience_reviews" does not exist' },
      moment: "bind",
      promptId: "conversation",
      skipped: false,
      hasContact: true,
    });
    expect(ctx.code).toBe("42P01");
    expect(ctx.message).toMatch(/experience_reviews/);
    expect(ctx.moment).toBe("bind");
    expect(ctx.hasContact).toBe(true);
    expect(ctx.hasPolicy).toBeNull();
  });
});
