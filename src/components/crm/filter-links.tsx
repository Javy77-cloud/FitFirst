import Link from "next/link";
import { cn } from "@/lib/utils";

export function FilterLinks({
  pathname,
  param,
  value,
  extra,
  options,
}: {
  pathname: string;
  param: string;
  value: string;
  extra?: Record<string, string>;
  options: ReadonlyArray<{ id: string; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const selected = option.id === value;
        const params = new URLSearchParams();
        for (const [key, entry] of Object.entries(extra ?? {})) {
          if (entry && entry !== "all") params.set(key, entry);
        }
        if (option.id !== "all") params.set(param, option.id);
        const qs = params.toString();
        return (
          <Link
            key={option.id}
            href={qs ? `${pathname}?${qs}` : pathname}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              selected ? "bg-navy text-white" : "bg-muted text-navy hover:bg-secondary",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
