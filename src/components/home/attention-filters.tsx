import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ATTENTION_WINDOW_LABEL,
  ATTENTION_WINDOWS,
  type AttentionWindow,
} from "@/lib/home/attention-window";

export function AttentionFilters({
  current,
  basePath,
  extra,
}: {
  current: AttentionWindow | null;
  basePath: string;
  extra?: string;
}) {
  const chips: { id: AttentionWindow | null; label: string }[] = [
    { id: null, label: "All" },
    ...ATTENTION_WINDOWS.map((id) => ({ id, label: ATTENTION_WINDOW_LABEL[id] })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const href = chip.id
          ? `${basePath}${basePath.includes("?") ? "&" : "?"}attention=${chip.id}${extra ? `&${extra}` : ""}`
          : extra
            ? `${basePath}${basePath.includes("?") ? "&" : "?"}${extra}`
            : basePath;
        const active = current === chip.id;
        return (
          <Link
            key={chip.label}
            href={href}
            className={cn(
              "rounded-md px-2 py-1 text-caption font-semibold",
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-navy hover:bg-secondary/80",
            )}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
