import { and, asc, eq, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  DEFAULT_AGENCY_LOBS,
  LOB_CODE_ALIASES,
  canonicalizeLobCode,
  findAgencyLobOrphans,
  isAgencyLobFamily,
  resolveAgencyLobCode,
  uniqueLobCodes,
  visibleAgencyLobs,
  type AgencyLobOrphan,
  type AgencyLobRecord,
} from "@/lib/desk/agency-lobs";
import {
  DEFAULT_DESK_LINE_SETTINGS,
  DEFAULT_HEALTH_SUBFILTERS,
  DEFAULT_LIFE_SUBFILTERS,
  type DeskLineSettings,
  type LineBook,
  type LineSubfilterOption,
} from "@/lib/desk/line-settings";
import { db } from "./index";
import { agencyLobs, agencySettings, deals, lineSubfilterOptions, policies } from "./schema";

function tenant() {
  return DEFAULT_TENANT_ID;
}

function toOption(row: typeof lineSubfilterOptions.$inferSelect): LineSubfilterOption {
  return {
    id: row.id,
    book: row.book === "health" ? "health" : "life",
    slug: row.slug,
    label: row.label,
    sortOrder: row.sortOrder,
  };
}

function toAgencyLob(row: typeof agencyLobs.$inferSelect): AgencyLobRecord {
  return {
    id: row.id,
    productId: row.productId,
    label: row.label,
    lobCode: row.lobCode,
    family: isAgencyLobFamily(row.family) ? row.family : "personal",
    sheetProduct: row.sheetProduct,
    quotingForm: row.quotingForm,
    active: row.active,
    builtIn: row.builtIn,
    sortOrder: row.sortOrder,
  };
}

export async function ensureDefaultAgencyLobs() {
  try {
    const existing = await db
      .select({ id: agencyLobs.id })
      .from(agencyLobs)
      .where(eq(agencyLobs.tenantId, tenant()));
    if (existing.length > 0) return;

    await db.insert(agencyLobs).values(
      DEFAULT_AGENCY_LOBS.map((row) => ({
        tenantId: tenant(),
        productId: row.productId,
        label: row.label,
        lobCode: row.lobCode,
        family: row.family,
        sheetProduct: row.sheetProduct,
        quotingForm: row.quotingForm,
        active: row.active,
        builtIn: row.builtIn,
        sortOrder: row.sortOrder,
      })),
    ).onConflictDoNothing();
  } catch {
    // Catalog seed is optional chrome. A missing agency_lobs table or insert miss
    // must not take down Home / Deals / Renewals / Policies.
  }
}

export async function loadAgencyLobs(opts?: {
  includeInactive?: boolean;
}): Promise<AgencyLobRecord[]> {
  try {
    await ensureDefaultAgencyLobs();
    const settings = await loadDeskLineSettings();
    const rows = await db
      .select()
      .from(agencyLobs)
      .where(eq(agencyLobs.tenantId, tenant()))
      .orderBy(asc(agencyLobs.sortOrder), asc(agencyLobs.label));
    const mapped = rows.length > 0 ? rows.map(toAgencyLob) : DEFAULT_AGENCY_LOBS;
    return visibleAgencyLobs(mapped, settings, { includeInactive: opts?.includeInactive });
  } catch {
    return visibleAgencyLobs(DEFAULT_AGENCY_LOBS, DEFAULT_DESK_LINE_SETTINGS, {
      includeInactive: opts?.includeInactive,
    });
  }
}

export async function loadAgencyLobCatalog(): Promise<AgencyLobRecord[]> {
  return loadAgencyLobs({ includeInactive: true });
}

export async function listAgencyLobOrphans(): Promise<AgencyLobOrphan[]> {
  const catalog = await loadAgencyLobCatalog();
  const [dealRows, policyRows] = await Promise.all([
    db
      .select({ lineOfBusiness: deals.lineOfBusiness })
      .from(deals)
      .where(eq(deals.tenantId, tenant())),
    db
      .select({ lineOfBusiness: policies.lineOfBusiness })
      .from(policies)
      .where(eq(policies.tenantId, tenant())),
  ]);
  return findAgencyLobOrphans(
    [...dealRows.map((row) => row.lineOfBusiness), ...policyRows.map((row) => row.lineOfBusiness)],
    catalog,
  );
}

export async function remapStoredLob(fromRaw: string, toCode: string) {
  const from = fromRaw.trim();
  const to = toCode.trim();
  if (!from || !to) return { deals: 0, policies: 0 };
  const dealResult = await db
    .update(deals)
    .set({ lineOfBusiness: to, updatedAt: new Date() })
    .where(
      and(
        eq(deals.tenantId, tenant()),
        or(eq(deals.lineOfBusiness, from), sql`upper(trim(${deals.lineOfBusiness})) = ${from.toUpperCase()}`),
      ),
    );
  const policyResult = await db
    .update(policies)
    .set({ lineOfBusiness: to, updatedAt: new Date() })
    .where(
      and(
        eq(policies.tenantId, tenant()),
        or(
          eq(policies.lineOfBusiness, from),
          sql`upper(trim(${policies.lineOfBusiness})) = ${from.toUpperCase()}`,
        ),
      ),
    );
  return { deals: dealResult.rowCount ?? 0, policies: policyResult.rowCount ?? 0 };
}

export async function normalizeStoredAgencyLobs() {
  const catalog = await loadAgencyLobCatalog();
  const codes = uniqueLobCodes(catalog);
  let dealsChanged = 0;
  let policiesChanged = 0;
  for (const code of codes) {
    const keys = catalog
      .filter((row) => row.lobCode.trim().toUpperCase() === code)
      .flatMap((row) => [row.lobCode, row.label, row.productId]);
    const extras = Object.entries(LOB_CODE_ALIASES)
      .filter(([, target]) => target === code)
      .map(([alias]) => alias);
    const all = [...new Set([...keys, ...extras])].map((item) => item.trim()).filter(Boolean);
    if (all.length === 0) continue;
    const upper = all.map((item) => item.toUpperCase());
    const dealResult = await db
      .update(deals)
      .set({ lineOfBusiness: code, updatedAt: new Date() })
      .where(
        and(
          eq(deals.tenantId, tenant()),
          sql`${deals.lineOfBusiness} <> ${code}`,
          sql`upper(trim(${deals.lineOfBusiness})) in (${sql.join(
            upper.map((item) => sql`${item}`),
            sql`, `,
          )})`,
        ),
      );
    dealsChanged += dealResult.rowCount ?? 0;
    const policyResult = await db
      .update(policies)
      .set({ lineOfBusiness: code, updatedAt: new Date() })
      .where(
        and(
          eq(policies.tenantId, tenant()),
          sql`${policies.lineOfBusiness} <> ${code}`,
          sql`upper(trim(${policies.lineOfBusiness})) in (${sql.join(
            upper.map((item) => sql`${item}`),
            sql`, `,
          )})`,
        ),
      );
    policiesChanged += policyResult.rowCount ?? 0;
  }
  return { deals: dealsChanged, policies: policiesChanged };
}

export async function requireStoredLobCode(
  value: string | null | undefined,
  fallback = "HO",
): Promise<string> {
  const catalog = await loadAgencyLobCatalog();
  return resolveAgencyLobCode(value, catalog) ?? canonicalizeLobCode(value, catalog) ?? fallback;
}

export async function loadDeskLineSettings(): Promise<DeskLineSettings> {
  try {
    await ensureDefaultLineSubfilters();
    const [row] = await db
      .select()
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, tenant()));
    const options = await db
      .select()
      .from(lineSubfilterOptions)
      .where(eq(lineSubfilterOptions.tenantId, tenant()))
      .orderBy(asc(lineSubfilterOptions.sortOrder), asc(lineSubfilterOptions.label));

    const life = options.filter((item) => item.book === "life").map(toOption);
    const health = options.filter((item) => item.book === "health").map(toOption);

    return {
      writeLife: row?.writeLife ?? DEFAULT_DESK_LINE_SETTINGS.writeLife,
      writeHealth: row?.writeHealth ?? DEFAULT_DESK_LINE_SETTINGS.writeHealth,
      showSellingAgency: row?.showSellingAgency ?? DEFAULT_DESK_LINE_SETTINGS.showSellingAgency,
      lifeOptions: life.length > 0 ? life : DEFAULT_LIFE_SUBFILTERS,
      healthOptions: health.length > 0 ? health : DEFAULT_HEALTH_SUBFILTERS,
    };
  } catch {
    // Life/Health chips are optional. A missing catalog table must not 441 the desk.
    return DEFAULT_DESK_LINE_SETTINGS;
  }
}

export async function ensureDefaultLineSubfilters() {
  const existing = await db
    .select({ id: lineSubfilterOptions.id })
    .from(lineSubfilterOptions)
    .where(eq(lineSubfilterOptions.tenantId, tenant()));
  if (existing.length > 0) return;

  const rows = [...DEFAULT_LIFE_SUBFILTERS, ...DEFAULT_HEALTH_SUBFILTERS].map((option) => ({
    tenantId: tenant(),
    book: option.book,
    slug: option.slug,
    label: option.label,
    sortOrder: option.sortOrder,
  }));
  await db.insert(lineSubfilterOptions).values(rows).onConflictDoNothing();
}

export async function listLineSubfilters(book: LineBook) {
  const settings = await loadDeskLineSettings();
  return book === "life" ? settings.lifeOptions : settings.healthOptions;
}
