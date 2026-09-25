"use client";

import { LoadAutoShopListButton } from "@/components/deal/load-auto-shop-list-button";
import { LoadFloodShopListButton } from "@/components/deal/load-flood-shop-list-button";
import { LoadHomeShopListButton } from "@/components/deal/load-home-shop-list-button";
import { appointmentLine } from "@/lib/domain";

/** Home / Auto / Flood curated lists by appointment line. */
export function LoadShopListButton({
  dealId,
  dealLine = "HO",
  line,
  product,
}: {
  dealId: string;
  dealLine?: string;
  line?: string | null;
  product?: string | null;
}) {
  const appointment = appointmentLine(dealLine);
  if (appointment === "AUTO") {
    return <LoadAutoShopListButton dealId={dealId} line={line} product={product} />;
  }
  if (appointment === "FLOOD") {
    return <LoadFloodShopListButton dealId={dealId} line={line} product={product} />;
  }
  return <LoadHomeShopListButton dealId={dealId} line={line} product={product} />;
}
