"use client";

import { propertyAddressLinks } from "@/lib/address-links";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function cellValue(values: Record<string, QuoteSheetFieldValue>, key: string): string {
  return (values[key]?.value ?? "").trim();
}

export function MasterSheetAddressLinks({
  values,
}: {
  values: Record<string, QuoteSheetFieldValue>;
}) {
  const links = propertyAddressLinks({
    address1: cellValue(values, "address1"),
    city: cellValue(values, "city"),
    state: cellValue(values, "state"),
    zip: cellValue(values, "zip"),
  });

  const base = cn(
    buttonVariants({ size: "sm", variant: "outline" }),
    "h-8 px-2.5 text-xs font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-sm",
  );

  if (!links) {
    return (
      <span
        className="text-[11px] text-muted-foreground"
        title="Add a property address on the sheet first"
        data-ff-sheet-address-links="empty"
      >
        Zillow / Maps need address
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-ff-sheet-address-links="">
      <a
        href={links.zillow}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          base,
          "hover:bg-fit-yellow-bg hover:border-fit-yellow hover:text-navy",
        )}
        data-ff-sheet-zillow=""
        title={`Zillow: ${links.formatted}`}
      >
        Zillow
      </a>
      <a
        href={links.maps}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          base,
          "hover:bg-fit-check-bg hover:border-fit-check hover:text-fit-check",
        )}
        data-ff-sheet-maps=""
        title={`Google Maps: ${links.formatted}`}
      >
        Google Maps
      </a>
    </div>
  );
}
