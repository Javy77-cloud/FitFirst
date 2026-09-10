"use client";

import { LoadAutoShopListButton } from "@/components/deal/load-auto-shop-list-button";
import { LoadFloodShopListButton } from "@/components/deal/load-flood-shop-list-button";
import { LoadHomeShopListButton } from "@/components/deal/load-home-shop-list-button";
import { appointmentLine } from "@/lib/domain";

/** Home / Auto / Flood curated lists by appointment line. */
export function LoadShopListButton({
  dealId,
  dealLine = "HO",
}: {
  dealId: string;
  dealLine?: string;
}) {
  const line = appointmentLine(dealLine);
  if (line === "AUTO") {
    return <LoadAutoShopListButton dealId={dealId} />;
  }
  if (line === "FLOOD") {
    return <LoadFloodShopListButton dealId={dealId} />;
  }
  return <LoadHomeShopListButton dealId={dealId} />;
}
