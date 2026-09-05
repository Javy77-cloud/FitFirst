import { cn } from "@/lib/utils";
import { statusColorClass } from "@/lib/desk/status-colors";

export function StatusBadge({
  color,
  children,
  className,
  uppercase = true,
}: {
  color?: string | null;
  children: React.ReactNode;
  className?: string;
  uppercase?: boolean;
}) {
  return (
    <span
      data-status-color={color ?? "slate"}
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tracking-wide",
        uppercase && "uppercase",
        statusColorClass(color),
        className,
      )}
    >
      {children}
    </span>
  );
}
