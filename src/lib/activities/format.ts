import { formatDuration, pipelineLabel, statusLabel } from "@/lib/domain";
import { DESK_TIME_ZONE, formatDeskDateTime } from "@/lib/desk/desk-timezone";
import { toEtDateTimeLocal } from "@/lib/time/et";

export function toDateTimeLocal(value: Date | string | null | undefined): string {
  return toEtDateTimeLocal(value);
}

export function formatWhen(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDeskDateTime(d);
}

export function formatDay(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    timeZone: DESK_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function kindClass(kind: string): string {
  switch (kind) {
    case "call":
      return "bg-fit-flag-bg text-fit-flag";
    case "meeting":
      return "bg-fit-yellow-bg text-fit-yellow";
    case "note":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-fit-green-bg text-fit-green";
  }
}

export function statusClass(status: string): string {
  switch (status) {
    case "completed":
    case "done":
      return "bg-fit-green-bg text-fit-green";
    case "canceled":
    case "cancelled":
      return "bg-fit-red-bg text-fit-red";
    case "delayed":
    case "rescheduled":
      return "bg-fit-yellow-bg text-fit-yellow";
    case "in_progress":
      return "bg-fit-flag-bg text-fit-flag";
    default:
      return "bg-muted text-navy";
  }
}

export { formatDuration, pipelineLabel, statusLabel };
