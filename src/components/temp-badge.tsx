import { StatusBadge } from "@/components/status-badge";
import { tempColor } from "@/lib/desk/status-colors";
import { normalizeLeadTemperature } from "@/lib/leads/queue";

export function TempBadge({
  temperature,
  className,
}: {
  temperature?: string | null;
  className?: string;
}) {
  const value = normalizeLeadTemperature(temperature);
  const label = value === "hot" ? "Hot" : value === "warm" ? "Warm" : "Cold";
  return (
    <StatusBadge color={tempColor(value)} className={className}>
      {label}
    </StatusBadge>
  );
}
