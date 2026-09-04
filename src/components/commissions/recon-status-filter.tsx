import Link from "next/link";
import { cn } from "@/lib/utils";

const CHIPS = [
  { value: "all", label: "All" },
  { value: "short", label: "Short" },
  { value: "disputed", label: "Disputed" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "earned", label: "Earned" },
] as const;

export function ReconStatusFilter({
  status,
  family,
  sub,
  range,
}: {
  status?: string;
  family?: string;
  sub?: string;
  range?: string;
}) {
  const current = status && status !== "all" ? status : "all";

  function hrefFor(value: string) {
    const params = new URLSearchParams();
    if (family) params.set("family", family);
    if (sub && sub !== "all") params.set("sub", sub);
    if (range && range !== "all") params.set("range", range);
    if (value !== "all") params.set("recon", value);
    const q = params.toString();
    return q ? `/commissions?${q}` : "/commissions";
  }

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {CHIPS.map((chip) => (
        <Link
          key={chip.value}
          href={hrefFor(chip.value)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs",
            current === chip.value
              ? "border-navy bg-navy text-white"
              : "border-input bg-card text-navy hover:bg-muted",
          )}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
