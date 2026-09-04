import { asc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  DEFAULT_DESK_LINE_SETTINGS,
  DEFAULT_HEALTH_SUBFILTERS,
  DEFAULT_LIFE_SUBFILTERS,
  type DeskLineSettings,
  type LineBook,
  type LineSubfilterOption,
} from "@/lib/desk/line-settings";
import { db } from "./index";
import { agencySettings, lineSubfilterOptions } from "./schema";

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

export async function loadDeskLineSettings(): Promise<DeskLineSettings> {
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
