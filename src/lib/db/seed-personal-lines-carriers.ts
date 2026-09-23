import { and, asc, eq, or, sql } from "drizzle-orm";
import {
  PERSONAL_LINES_CARRIERS,
  PERSONAL_LINES_FIXTURE_TAG,
  PERSONAL_LINES_NOTES_DATE,
  matchesPersonalLinesName,
  personalLinesAppetiteNote,
  personalLinesCarrierInfo,
  personalLinesDontWrite,
  type PersonalLinesCarrierSpec,
} from "@/lib/appetite/personal-lines-carriers";
import { TENANT_ID } from "../fixtures/ids";
import { db } from "./index";
import { carriers, type AppetiteNoteRow } from "./schema";

function appetiteRows(spec: PersonalLinesCarrierSpec): AppetiteNoteRow[] {
  const lobs = spec.appetiteLobs?.length ? spec.appetiteLobs : spec.writtenLines;
  return lobs.map((lob) => ({
    id: `pl-${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${lob.toLowerCase()}-2026-09`,
    dateRequested: PERSONAL_LINES_NOTES_DATE,
    lob,
    roofAge: "",
    waterHeater: "",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "accept" as const,
    notes: personalLinesAppetiteNote(spec),
  }));
}

function mergeAppetiteRows(existing: unknown, ours: AppetiteNoteRow[]): AppetiteNoteRow[] {
  const ids = new Set(ours.map((row) => row.id));
  const kept = Array.isArray(existing)
    ? (existing as AppetiteNoteRow[]).filter((row) => row && !ids.has(String(row.id ?? "")))
    : [];
  return [...kept, ...ours];
}

function mergeTags(existing: string[] | null | undefined, extra: string[]): string[] {
  const tags = new Set(existing ?? []);
  for (const tag of extra) tags.add(tag);
  return [...tags];
}

function addLines(existing: string[] | null | undefined, extra: string[]): string[] {
  const written = new Set(existing ?? []);
  for (const line of extra) written.add(line);
  return [...written];
}

function nameMatchSql(spec: PersonalLinesCarrierSpec) {
  return or(
    eq(carriers.id, spec.seedId),
    ...spec.matchNeedles.map(
      (needle) =>
        sql`lower(${carriers.name}) ~ ${`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`}`,
    ),
  );
}

async function findExisting(spec: PersonalLinesCarrierSpec) {
  const rows = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      writtenLines: carriers.writtenLines,
      appetiteRows: carriers.appetiteRows,
      tags: carriers.tags,
    })
    .from(carriers)
    .where(and(eq(carriers.tenantId, TENANT_ID), nameMatchSql(spec)))
    .orderBy(asc(carriers.createdAt));

  const named = rows.filter((row) => matchesPersonalLinesName(row.name, spec));
  // Prefer live Neon rows over fixture 3333… / a0a0… duplicates (e.g. Progressive ×3).
  const preferred =
    named.find((row) => !/^(33333333-|a0a00000-)/i.test(row.id)) ?? named[0] ?? null;
  const byId = rows.find((row) => row.id === spec.seedId);
  return preferred ?? byId ?? null;
}

async function upsertOne(spec: PersonalLinesCarrierSpec): Promise<"added" | "enriched" | "skipped"> {
  const current = await findExisting(spec);

  if (!current && spec.enrichOnly) {
    return "skipped";
  }

  const ours = appetiteRows(spec);
  const patch = {
    name:
      current?.name?.trim() && matchesPersonalLinesName(current.name, spec)
        ? current.name
        : spec.name,
    writtenLines: addLines(current?.writtenLines, spec.writtenLines),
    portalStatus: "open" as const,
    territory: spec.territory,
    carrierInfo: personalLinesCarrierInfo(spec),
    appetiteNotes: personalLinesAppetiteNote(spec),
    dontWriteNotes: personalLinesDontWrite(spec),
    appetiteRows: mergeAppetiteRows(current?.appetiteRows, ours),
    tags: mergeTags(current?.tags, spec.tags),
    active: true,
    updatedAt: new Date(),
  };

  if (current) {
    await db.update(carriers).set(patch).where(eq(carriers.id, current.id));
    return "enriched";
  }

  await db.insert(carriers).values({
    id: spec.seedId,
    tenantId: TENANT_ID,
    ...patch,
    fixtureTag: PERSONAL_LINES_FIXTURE_TAG,
  });
  return "added";
}

/** Upsert personal-lines carriers from Javy 2026-09-22 notes. Never duplicates American Modern. */
export async function seedPersonalLinesCarriers() {
  const added: string[] = [];
  const enriched: string[] = [];
  const skipped: string[] = [];

  for (const spec of PERSONAL_LINES_CARRIERS) {
    const result = await upsertOne(spec);
    if (result === "added") added.push(spec.name);
    else if (result === "enriched") enriched.push(spec.name);
    else skipped.push(spec.name);
  }

  return { added, enriched, skipped };
}
