import Link from "next/link";
import {
  PC_PACKAGE_LINE_LABELS,
  dealLineSwitcherHref,
  type PcPackageLine,
} from "@/lib/deals/package-lines";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

export function DealLineSwitcher({
  dealId,
  lines,
  active,
  tab,
}: {
  dealId: string;
  lines: readonly PcPackageLine[];
  active: PcPackageLine;
  tab?: string | null;
}) {
  if (!lines.length) return null;
  return (
    <nav
      aria-label="Package lines"
      className={`mt-2 ${FF_CHIP_TAB_GROUP}`}
      data-ff-deal-line-switcher=""
    >
      {lines.map((line) => {
        const selected = line === active;
        return (
          <Link
            key={line}
            href={dealLineSwitcherHref({ dealId, line, tab })}
            scroll={false}
            className={chipTabClass(selected)}
            data-ff-deal-line-chip={line}
            data-active={selected ? "true" : "false"}
            aria-current={selected ? "page" : undefined}
          >
            {PC_PACKAGE_LINE_LABELS[line]}
          </Link>
        );
      })}
    </nav>
  );
}
