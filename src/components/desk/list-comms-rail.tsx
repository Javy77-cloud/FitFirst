"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadListComms } from "@/app/actions/list-comms";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import type { SerializedActivity } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export type ListCommsRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
};

const PickContext = createContext<((id: string) => void) | null>(null);

export function ListCommsPick({ id }: { id: string }) {
  const pick = useContext(PickContext);
  if (!pick) return null;
  return (
    <button
      type="button"
      className="ff-list-comms-pick"
      data-ff-list-comms-pick={id}
      onClick={() => pick(id)}
    >
      Comms
    </button>
  );
}

function ListCommsAside({ row, onClose }: { row: ListCommsRow; onClose: () => void }) {
  const [items, setItems] = useState<SerializedActivity[]>([]);

  useEffect(() => {
    let cancel = false;
    loadListComms({
      leadId: row.leadId,
      dealId: row.dealId,
      policyId: row.policyId,
      contactId: row.contactId,
      accountId: row.accountId,
    })
      .then((next) => {
        if (!cancel) setItems(next);
      })
      .catch(() => {
        if (!cancel) setItems([]);
      });
    return () => {
      cancel = true;
    };
  }, [row.id, row.leadId, row.dealId, row.policyId, row.contactId, row.accountId]);

  return (
    <aside className="ff-list-comms-rail" data-ff-list-comms-rail="" data-ff-deal-right-rail="">
      <header className="ff-list-comms-rail-head">
        <p>{row.name}</p>
        <button type="button" onClick={onClose} data-ff-list-comms-close="">
          Close
        </button>
      </header>
      <QuickCommsBoard
        key={row.id}
        items={items}
        leadId={row.leadId}
        dealId={row.dealId}
        policyId={row.policyId}
        contactId={row.contactId}
        accountId={row.accountId}
        contactName={row.name}
        contactEmail={row.email}
        contactPhone={row.phone}
        initialKind="email"
      />
    </aside>
  );
}

/** Optional email/SMS board. Hidden until a list row is picked. */
export function ListCommsShell({ rows, children }: { rows: ListCommsRow[]; children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const row = rows.find((item) => item.id === selectedId) ?? null;

  return (
    <PickContext.Provider value={setSelectedId}>
      <div
        className={cn("ff-list-comms-shell", row && "is-open")}
        data-ff-list-comms={row ? "open" : "off"}
      >
        <div className="min-w-0">{children}</div>
        {row ? <ListCommsAside key={row.id} row={row} onClose={() => setSelectedId(null)} /> : null}
      </div>
    </PickContext.Provider>
  );
}
