import { cn } from "@/lib/utils";
import { resolveColorKey, STATUS_COLOR_STYLE, statusColorClass, statusColorFor } from "@/lib/desk/status-colors";

export function StatusBadge({
  color,
  status,
  children,
  className,
  uppercase = true,
}: {
  color?: string | null;
  status?: string | null;
  children: React.ReactNode;
  className?: string;
  uppercase?: boolean;
}) {
  const resolved = resolveColorKey(
    color ?? statusColorFor(status ?? (typeof children === "string" ? children : null)),
  );
  const paint = STATUS_COLOR_STYLE[resolved];
  return (
    <span
      data-status-color={resolved}
      style={{
        backgroundColor: paint.backgroundColor,
        borderColor: paint.borderColor,
        color: paint.color,
      }}
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide",
        uppercase && "uppercase",
        statusColorClass(resolved),
        className,
      )}
    >
      {children}
    </span>
  );
}
