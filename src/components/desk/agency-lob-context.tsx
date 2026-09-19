"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_AGENCY_LOBS, type AgencyLobRecord } from "@/lib/desk/agency-lobs";
import { isDealProductId, type DealProductId } from "@/lib/deals/deal-products";

const AgencyLobContext = createContext<AgencyLobRecord[]>(DEFAULT_AGENCY_LOBS);

export function AgencyLobProvider({
  catalog,
  children,
}: {
  catalog: AgencyLobRecord[];
  children: ReactNode;
}) {
  return (
    <AgencyLobContext.Provider value={catalog.length ? catalog : DEFAULT_AGENCY_LOBS}>
      {children}
    </AgencyLobContext.Provider>
  );
}

export function useAgencyLobs(): AgencyLobRecord[] {
  return useContext(AgencyLobContext);
}

export function useVisibleDealProductIds(): DealProductId[] {
  return useAgencyLobs()
    .filter((row) => row.active)
    .map((row) => row.productId)
    .filter(isDealProductId);
}
