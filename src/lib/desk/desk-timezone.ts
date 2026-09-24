/** FitFirst desk clock. Activity + Inbox timestamps render in this zone. */
export { ET_TIME_ZONE as DESK_TIME_ZONE, etDateKey as deskDateKey, etZonedParts as deskZonedParts } from "@/lib/time/et";
import { ET_TIME_ZONE } from "@/lib/time/et";

export function formatDeskDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: ET_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDeskClock(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: ET_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDeskMonthDay(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: ET_TIME_ZONE,
    month: "short",
    day: "numeric",
  });
}

export function formatDeskMonthDayYear(value: Date): string {
  return value.toLocaleString("en-US", {
    timeZone: ET_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
