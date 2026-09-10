import Link from "next/link";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
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
    <div className={FF_CHIP_TAB_GROUP}>
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
            className={chipTabClass(active)}
            data-active={active ? "true" : "false"}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
