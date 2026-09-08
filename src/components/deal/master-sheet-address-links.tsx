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

  const chip = cn(
    buttonVariants({ size: "sm", variant: "outline" }),
    "h-8 px-2.5 text-xs font-medium",
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
        className={chip}
        data-ff-sheet-zillow=""
        title={`Zillow: ${links.formatted}`}
      >
        Zillow
      </a>
      <a
        href={links.maps}
        target="_blank"
        rel="noopener noreferrer"
        className={chip}
        data-ff-sheet-maps=""
        title={`Google Maps: ${links.formatted}`}
      >
        Google Maps
      </a>
    </div>
  );
}
