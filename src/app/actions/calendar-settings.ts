"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/guards";
import { saveCalendarAgencyPrefs } from "@/lib/ops/calendar-agency-prefs";
import { flashSettings } from "@/lib/flash-action";

function checked(form: FormData, key: string) {
  return form.get(key) === "true" || form.get(key) === "on" || form.get(key) === "1";
}

export async function saveCalendarAgencySettings(formData: FormData) {
  await requireAdminAction();
  await saveCalendarAgencyPrefs({
    calendarMarkSundayNonWorking: checked(formData, "calendarMarkSundayNonWorking"),
    calendarShowUsFederalHolidays: checked(formData, "calendarShowUsFederalHolidays"),
  });
  revalidatePath("/settings");
  revalidatePath("/calendar");
  await flashSettings("/settings", "calendar-settings-saved");
}
