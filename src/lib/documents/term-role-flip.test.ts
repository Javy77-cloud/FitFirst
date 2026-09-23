import { describe, expect, it } from "vitest";
import {
  COMPARE_TERM_ROLES,
  DOCUMENT_TERM_ROLES,
  isCompareTermRole,
  planTermStartRoleFlip,
  tagsWithTermRole,
  termRoleFromTags,
} from "@/lib/documents/document-labels";
import {
  canFillCompareFromTermRoleDocs,
  selectCompareTermRoleDocs,
} from "@/lib/renewal/fill-compare-from-decs";

function doc(id: string, role: "prior" | "current" | "renewal" | "archive", createdAt: string) {
  return { id, tags: tagsWithTermRole(["dec"], role), createdAt };
}

describe("archive term role", () => {
  it("lists Archive and excludes it from Compare roles", () => {
    expect(DOCUMENT_TERM_ROLES.map((r) => r.value)).toEqual([
      "prior",
      "current",
      "renewal",
      "archive",
    ]);
    expect([...COMPARE_TERM_ROLES]).toEqual(["prior", "current", "renewal"]);
    expect(isCompareTermRole("archive")).toBe(false);
  });
});

describe("planTermStartRoleFlip", () => {
  it("renewal→current, current→prior, older prior→archive; idempotent without renewal", () => {
    const priorOld = doc("p-old", "prior", "2024-01-01T12:00:00.000Z");
    const priorKeep = doc("p-keep", "prior", "2024-06-01T12:00:00.000Z");
    const current = doc("c1", "current", "2025-01-01T12:00:00.000Z");
    const renewal = doc("r1", "renewal", "2026-01-01T12:00:00.000Z");
    const changes = planTermStartRoleFlip([priorOld, priorKeep, current, renewal]);
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    expect(byId.r1).toEqual({ id: "r1", from: "renewal", to: "current" });
    expect(byId.c1).toEqual({ id: "c1", from: "current", to: "prior" });
    expect(byId["p-old"].to).toBe("archive");
    expect(byId["p-keep"].to).toBe("archive");
    const after = [
      { ...priorOld, tags: tagsWithTermRole(priorOld.tags, "archive") },
      { ...priorKeep, tags: tagsWithTermRole(priorKeep.tags, "archive") },
      { ...current, tags: tagsWithTermRole(current.tags, "prior") },
      { ...renewal, tags: tagsWithTermRole(renewal.tags, "current") },
    ];
    expect(planTermStartRoleFlip(after)).toEqual([]);
  });
});

describe("Fill Compare never reads archive", () => {
  it("ignores archive-tagged DECs", () => {
    const archiveOnly = {
      id: "a1",
      filename: "old.pdf",
      tags: tagsWithTermRole(["dec"], "archive"),
      createdAt: "2023-01-01T12:00:00.000Z",
    };
    const prior = {
      id: "p1",
      filename: "prior.pdf",
      tags: tagsWithTermRole(["dec"], "prior"),
      createdAt: "2025-01-01T12:00:00.000Z",
    };
    const renewal = {
      id: "r1",
      filename: "ren.pdf",
      tags: tagsWithTermRole(["dec"], "renewal"),
      createdAt: "2026-01-01T12:00:00.000Z",
    };
    const selected = selectCompareTermRoleDocs([archiveOnly, prior, renewal]);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.baseline.id).toBe("p1");
    expect(selected.renewal.id).toBe("r1");
    expect(selected.baselineSource).toBe("prior");
    expect(canFillCompareFromTermRoleDocs([archiveOnly, renewal])).toBe(false);
    expect(termRoleFromTags(archiveOnly.tags)).toBe("archive");
  });
});
