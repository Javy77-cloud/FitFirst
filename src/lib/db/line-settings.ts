import { asc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  DEFAULT_AGENCY_LOBS,
  isAgencyLobFamily,
  visibleAgencyLobs,
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
import { agencyLobs, agencySettings, lineSubfilterOptions } from "./schema";

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
}

export async function loadAgencyLobs(opts?: {
  includeInactive?: boolean;
}): Promise<AgencyLobRecord[]> {
  await ensureDefaultAgencyLobs();
  const settings = await loadDeskLineSettings();
  const rows = await db
    .select()
    .from(agencyLobs)
    .where(eq(agencyLobs.tenantId, tenant()))
    .orderBy(asc(agencyLobs.sortOrder), asc(agencyLobs.label));
  const mapped = rows.length > 0 ? rows.map(toAgencyLob) : DEFAULT_AGENCY_LOBS;
  return visibleAgencyLobs(mapped, settings, { includeInactive: opts?.includeInactive });
}

export async function loadAgencyLobCatalog(): Promise<AgencyLobRecord[]> {
  return loadAgencyLobs({ includeInactive: true });
}

export async function loadDeskLineSettings(): Promise<DeskLineSettings> {
  await ensureDefaultLineSubfilters();
  await ensureDefaultAgencyLobs();
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
