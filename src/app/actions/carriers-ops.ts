"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { parseCommissionScheduleJson } from "@/lib/carriers/commission";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  carrierActivityEvents,
  carrierAmBestHistory,
  carriers,
} from "@/lib/db/schema";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { isUuid } from "@/lib/ids";
import { titleCaseLabel } from "@/lib/ui/title-case";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function parseWrittenLines(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const FIELD_MAP = {
  name: "name",
  agency_code: "agencyCode",
  website: "website",
  phone: "phone",
  email: "email",
  mailing_address: "mailingAddress",
  written_lines: "writtenLines",
  status: "active",
  active: "active",
  desk_status: "deskStatus",
  underwriter_name: "underwriterName",
  underwriter_email: "underwriterEmail",
  underwriter_phone: "underwriterPhone",
  claims_contact_name: "claimsContactName",
  claims_contact_email: "claimsContactEmail",
  claims_phone: "claimsPhone",
  marketing_contact_name: "marketingContactName",
  marketing_contact_phone: "marketingContactPhone",
  marketing_contact_email: "marketingContactEmail",
  appetite_notes: "appetiteNotes",
  dont_write_notes: "dontWriteNotes",
  am_best_rating: "amBestRating",
  am_best_outlook: "amBestOutlook",
  am_best_date: "amBestDate",
  portal_url: "portalUrl",
  new_business_comm_pct: "newBusinessCommPct",
  renewal_comm_pct: "renewalCommPct",
  commission_schedule: "commissionSchedule",
  customer_service_phone: "customerServicePhone",
  agent_phone: "agentPhone",
  account_manager_name: "accountManagerName",
  account_manager_email: "accountManagerEmail",
  account_manager_phone: "accountManagerPhone",
  billing_phone: "billingPhone",
  naic: "naic",
  territory: "territory",
  carrier_info: "carrierInfo",
} as const;

type FieldKey = keyof typeof FIELD_MAP;

async function assertAdmin(): Promise<
  { ok: true; name: string; userId: string | null } | { ok: false; error: string }
> {
  const session = await currentDeskSession();
  if (!session.isAdmin) return { ok: false, error: "Admin only." };
  return { ok: true, name: session.name, userId: session.userId };
}

async function recordCarrierEvent(input: {
  carrierId: string;
  kind: string;
  title: string;
  detail?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  occurredAt?: Date;
}) {
  await db.insert(carrierActivityEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    carrierId: input.carrierId,
    kind: input.kind,
    title: input.title,
    detail: input.detail ?? null,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
}

function amBestChanged(
  existing: typeof carriers.$inferSelect,
  nextRating: string | null | undefined,
  nextOutlook: string | null | undefined,
  nextDate: Date | null | undefined,
  touched: { rating: boolean; outlook: boolean; date: boolean },
): boolean {
  if (touched.rating) {
    const a = (existing.amBestRating ?? "").trim();
    const b = (nextRating ?? "").trim();
    if (a !== b) return true;
  }
  if (touched.outlook) {
    const a = (existing.amBestOutlook ?? "").trim();
    const b = (nextOutlook ?? "").trim();
    if (a !== b) return true;
  }
  if (touched.date) {
    const a = existing.amBestDate ? new Date(existing.amBestDate).toISOString().slice(0, 10) : "";
    const b = nextDate ? nextDate.toISOString().slice(0, 10) : "";
    if (a !== b) return true;
  }
  return false;
}

export async function createCarrierPopup(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await currentDeskSession();

  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Carrier Name Is Required." };

  const written = parseWrittenLines(str(formData, "writtenLines"));
  const statusRaw = str(formData, "status").toLowerCase();
  let deskStatus: "active" | "pending" | "inactive" = "active";
  if (statusRaw === "pending") deskStatus = "pending";
  else if (statusRaw === "inactive" || statusRaw === "false" || statusRaw === "0") deskStatus = "inactive";
  const active = deskStatus !== "inactive";

  const [row] = await db
    .insert(carriers)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      agencyCode: str(formData, "agencyCode") || null,
      website: str(formData, "website") || null,
      phone: str(formData, "phone") || null,
      email: str(formData, "email") || null,
      mailingAddress: str(formData, "mailingAddress") || null,
      writtenLines: written,
      active,
      deskStatus,
      portalStatus: "open",
      commissionSchedule: [],
    })
    .returning({ id: carriers.id });

  if (!row) return { ok: false, error: "Could Not Create Carrier." };

  await emitDeskEvent("record.created", {
    module: "carriers",
    entityType: "carrier",
    entityId: row.id,
    summary: `Carrier created: ${name}`,
  });

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${row.id}`);
  return { ok: true, id: row.id };
}

export async function updateCarrierField(input: {
  carrierId: string;
  fieldKey: string;
  value: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await assertAdmin();
  if (!admin.ok) return admin;

  const carrierId = (input.carrierId ?? "").trim();
  const fieldKey = (input.fieldKey ?? "").trim() as FieldKey;
  if (!isUuid(carrierId) || !(fieldKey in FIELD_MAP)) {
    return { ok: false, error: "Unknown Field." };
  }

  const [existing] = await db
    .select()
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));
  if (!existing) return { ok: false, error: "Carrier Not Found." };

  const raw = input.value ?? "";
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  const col = FIELD_MAP[fieldKey];

  let nextDesk: "active" | "pending" | "inactive" | null = null;
  const amTouched = { rating: false, outlook: false, date: false };
  let nextRating = existing.amBestRating;
  let nextOutlook = existing.amBestOutlook;
  let nextDate = existing.amBestDate ? new Date(existing.amBestDate) : null;

  if (fieldKey === "status" || fieldKey === "active" || fieldKey === "desk_status") {
    const v = raw.trim().toLowerCase();
    let desk: "active" | "pending" | "inactive" = "active";
    if (v === "pending") desk = "pending";
    else if (v === "inactive" || v === "false" || v === "0" || v === "archived") desk = "inactive";
    else if (v === "active" || v === "true" || v === "1") desk = "active";
    else if (fieldKey === "active") desk = v ? "active" : "inactive";
    patch.deskStatus = desk;
    patch.active = desk !== "inactive";
    nextDesk = desk;
  } else if (fieldKey === "written_lines") {
    patch.writtenLines = parseWrittenLines(raw);
  } else if (fieldKey === "commission_schedule") {
    patch.commissionSchedule = parseCommissionScheduleJson(raw);
  } else if (fieldKey === "am_best_date") {
    const t = raw.trim();
    nextDate = t ? new Date(t) : null;
    patch.amBestDate = nextDate;
    amTouched.date = true;
  } else if (fieldKey === "am_best_rating") {
    nextRating = raw.trim() || null;
    patch.amBestRating = nextRating;
    amTouched.rating = true;
  } else if (fieldKey === "am_best_outlook") {
    nextOutlook = raw.trim() || null;
    patch.amBestOutlook = nextOutlook;
    amTouched.outlook = true;
  } else {
    patch[col] = raw.trim() || null;
  }

  await db
    .update(carriers)
    .set(patch)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));

  if (amBestChanged(existing, nextRating, nextOutlook, nextDate, amTouched)) {
    const rating = (nextRating ?? "").trim() || null;
    const outlook = (nextOutlook ?? "").trim() || null;
    await db.insert(carrierAmBestHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      carrierId,
      rating,
      outlook,
      ratedAt: nextDate,
      actorId: admin.userId,
      actorName: admin.name,
    });
    await recordCarrierEvent({
      carrierId,
      kind: "am_best",
      title: "AM Best Updated",
      detail: [rating, outlook, nextDate ? nextDate.toISOString().slice(0, 10) : null]
        .filter(Boolean)
        .join(" · "),
      actorId: admin.userId,
      actorName: admin.name,
    });
  }

  if (fieldKey === "appetite_notes") {
    await recordCarrierEvent({
      carrierId,
      kind: "appetite",
      title: "Appetite Notes Edited",
      detail: raw.trim().slice(0, 160) || null,
      actorId: admin.userId,
      actorName: admin.name,
    });
  }
  if (fieldKey === "dont_write_notes") {
    await recordCarrierEvent({
      carrierId,
      kind: "dont_write",
      title: "Don't Write Edited",
      detail: raw.trim().slice(0, 160) || null,
      actorId: admin.userId,
      actorName: admin.name,
    });
  }
  if (nextDesk) {
    const prev =
      (existing.deskStatus as string | null)?.toLowerCase() ||
      (existing.active ? "active" : "inactive");
    if (prev !== nextDesk) {
      await recordCarrierEvent({
        carrierId,
        kind: "status",
        title: `Status → ${titleCaseLabel(nextDesk)}`,
        detail: `Was ${titleCaseLabel(prev)}`,
        actorId: admin.userId,
        actorName: admin.name,
      });
    }
  }

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
  return { ok: true };
}

export async function touchCarrierLastContacted(input: {
  carrierId: string;
  kind?: string;
  title?: string;
  detail?: string | null;
}): Promise<{ ok: true; lastContactedAt: string } | { ok: false; error: string }> {
  const session = await currentDeskSession();
  const carrierId = (input.carrierId ?? "").trim();
  if (!isUuid(carrierId)) return { ok: false, error: "Invalid Carrier." };

  const [existing] = await db
    .select({ id: carriers.id })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));
  if (!existing) return { ok: false, error: "Carrier Not Found." };

  const now = new Date();
  await db
    .update(carriers)
    .set({ lastContactedAt: now, updatedAt: now })
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));

  const kind = (input.kind ?? "comms").trim() || "comms";
  const title = (input.title ?? "Quick Comms Logged").trim() || "Quick Comms Logged";
  await recordCarrierEvent({
    carrierId,
    kind,
    title,
    detail: input.detail ?? null,
    actorId: session.userId,
    actorName: session.name,
    occurredAt: now,
  });

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
  return { ok: true, lastContactedAt: now.toISOString() };
}

export async function archiveCarrier(
  carrierId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await assertAdmin();
  if (!admin.ok) return admin;
  if (!isUuid(carrierId)) return { ok: false, error: "Invalid Carrier." };
  await db
    .update(carriers)
    .set({ active: false, deskStatus: "inactive", updatedAt: new Date() })
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));
  await recordCarrierEvent({
    carrierId,
    kind: "status",
    title: "Status → Inactive",
    detail: "Archived",
    actorId: admin.userId,
    actorName: admin.name,
  });
  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
  return { ok: true };
}

/** Agent-safe: returns portal URL only — never username/password. */
export async function openCarrierPortalUrl(
  carrierId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isUuid(carrierId)) return { ok: false, error: "Invalid Carrier." };
  const [row] = await db
    .select({
      portalUrl: carriers.portalUrl,
      agentPortalUrl: carriers.agentPortalUrl,
      website: carriers.website,
    })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, carrierId)));
  if (!row) return { ok: false, error: "Carrier Not Found." };
  const url = (row.portalUrl || row.agentPortalUrl || row.website || "").trim();
  if (!url) return { ok: false, error: "No Portal URL On File. Ask An Admin." };
  return { ok: true, url };
}

export async function searchCarriersForMerge(q: string): Promise<
  { id: string; name: string; agencyCode: string | null }[]
> {
  const admin = await assertAdmin();
  if (!admin.ok) return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const rows = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      agencyCode: carriers.agencyCode,
    })
    .from(carriers)
    .where(
      and(
        eq(carriers.tenantId, DEFAULT_TENANT_ID),
        sql`lower(${carriers.name}) like ${"%" + needle + "%"}`,
      ),
    )
    .limit(12);
  return rows;
}

export async function mergeCarrierIntoSurvivor(input: {
  keepId: string;
  dropId: string;
}): Promise<{ ok: true; survivorId: string } | { ok: false; error: string }> {
  const admin = await assertAdmin();
  if (!admin.ok) return admin;
  const keepId = input.keepId?.trim();
  const dropId = input.dropId?.trim();
  if (!isUuid(keepId) || !isUuid(dropId) || keepId === dropId) {
    return { ok: false, error: "Pick Two Different Carriers." };
  }
  // Honest stub: deactivate duplicate; do not rewrite policy FKs yet.
  await db
    .update(carriers)
    .set({
      active: false,
      carrierInfo: sql`coalesce(${carriers.carrierInfo}, '') || ${"\\n[Merged into " + keepId + "]"}`,
      updatedAt: new Date(),
    })
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, dropId), ne(carriers.id, keepId)));
  revalidatePath("/carriers");
  revalidatePath(`/carriers/${keepId}`);
  revalidatePath(`/carriers/${dropId}`);
  return { ok: true, survivorId: keepId };
}
