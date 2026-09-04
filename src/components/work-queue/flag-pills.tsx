import { cn } from "@/lib/utils";
import { workFlagLabel } from "@/lib/work-queue/types";

export function WorkFlagPills({
  flags,
  empty = "No flags",
}: {
  flags: string[];
  empty?: string;
}) {
  if (flags.length === 0) {
    return <span className="text-base text-muted-foreground">{empty}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag}
          className={cn(
            "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-semibold",
            flag === "lapse_warning"
              ? "bg-fit-red-bg text-fit-red"
              : "bg-fit-flag-bg text-fit-flag",
          )}
        >
          {workFlagLabel(flag)}
        </span>
      ))}
    </span>
  );
}

export function WorkStatusPill({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <span className="text-base text-muted-foreground">Unassigned</span>;
  }
  return (
    <span className="inline-flex rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-navy">
      {status.replaceAll("_", " ")}
    </span>
  );
}
