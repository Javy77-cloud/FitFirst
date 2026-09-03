import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  pending: "bg-fit-yellow-bg text-fit-yellow",
  payable: "bg-fit-flag-bg text-fit-flag",
  paid: "bg-fit-green-bg text-fit-green",
  held: "bg-fit-red-bg text-fit-red",
};

export function CommissionStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        styles[status] ?? "bg-secondary text-navy",
      )}
    >
      {status}
    </span>
  );
}
