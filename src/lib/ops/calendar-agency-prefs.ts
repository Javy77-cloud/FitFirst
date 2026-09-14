import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";

export type CalendarAgencyPrefs = {
  calendarMarkSundayNonWorking: boolean;
  calendarShowUsFederalHolidays: boolean;
};

export const DEFAULT_CALENDAR_AGENCY_PREFS: CalendarAgencyPrefs = {
  calendarMarkSundayNonWorking: true,
  calendarShowUsFederalHolidays: true,
};

export async function getCalendarAgencyPrefs(): Promise<CalendarAgencyPrefs> {
  try {
    const [row] = await db
      .select({
        calendarMarkSundayNonWorking: agencySettings.calendarMarkSundayNonWorking,
        calendarShowUsFederalHolidays: agencySettings.calendarShowUsFederalHolidays,
      })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return {
      calendarMarkSundayNonWorking:
        row?.calendarMarkSundayNonWorking ?? DEFAULT_CALENDAR_AGENCY_PREFS.calendarMarkSundayNonWorking,
      calendarShowUsFederalHolidays:
        row?.calendarShowUsFederalHolidays ?? DEFAULT_CALENDAR_AGENCY_PREFS.calendarShowUsFederalHolidays,
    };
  } catch {
    return { ...DEFAULT_CALENDAR_AGENCY_PREFS };
  }
}

export async function saveCalendarAgencyPrefs(
  prefs: CalendarAgencyPrefs,
): Promise<CalendarAgencyPrefs> {
  const next = {
    calendarMarkSundayNonWorking: Boolean(prefs.calendarMarkSundayNonWorking),
    calendarShowUsFederalHolidays: Boolean(prefs.calendarShowUsFederalHolidays),
  };
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  if (existing) {
    await db
      .update(agencySettings)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      ...next,
    });
  }
  return next;
}
