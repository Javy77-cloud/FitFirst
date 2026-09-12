import { displayStatusLabel, STATUS_BAR_CLASS, type StatusColorKey } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

export type CarrierDeskStatus = "active" | "pending" | "inactive";

export function carrierDeskStatusFromFlags(input: {
  active: boolean;
  deskStatus?: string | null;
}): CarrierDeskStatus {
  const raw = (input.deskStatus ?? "").trim().toLowerCase();
  if (raw === "pending") return "pending";
  if (raw === "inactive" || raw === "archived") return "inactive";
  if (raw === "active") return "active";
  return input.active ? "active" : "inactive";
}

function carrierStatusColor(status: CarrierDeskStatus): StatusColorKey {
  if (status === "active") return "green";
  if (status === "pending") return "amber";
  return "red";
}

/** Solid status dot — green active, yellow/amber pending, red inactive. */
export function CarrierStatusDot({ status }: { status: CarrierDeskStatus | string }) {
  const key = (String(status || "inactive").toLowerCase() as CarrierDeskStatus);
  const normalized: CarrierDeskStatus =
    key === "active" || key === "pending" || key === "inactive" ? key : "inactive";
  const color = carrierStatusColor(normalized);
  const label = displayStatusLabel(normalized);
  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={label}
      data-ff-carrier-status-dot={normalized}
    >
      <span
        className={cn("size-2.5 rounded-full", STATUS_BAR_CLASS[color] ?? "bg-slate-500")}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
