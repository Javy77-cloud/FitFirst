"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadListComms } from "@/app/actions/list-comms";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { RecordActivityMenu } from "@/components/desk/record-activity-menu";
import type { SerializedActivity } from "@/lib/db/queries";
import { QUICK_COMMS_EVENT, type QuickCommsTarget } from "@/lib/desk/quick-comms-open";
import type { ActivityKind } from "@/lib/domain";
import { ACTIVITY_RAIL_ASIDE_CLASS, ACTIVITY_RAIL_LOCK } from "@/lib/desk/activity-rail";
import { cn } from "@/lib/utils";

export type ActivityPanelRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  clientAddress?: string | null;
};

type DeskValue = {
  selectedId: string | null;
  kind: ActivityKind | null;
  nonce: number;
  pick: (id: string, kind?: ActivityKind) => void;
};

const DeskContext = createContext<DeskValue | null>(null);

export function useActivityPick() {
  return useContext(DeskContext);
}

export function ActivityDeskProvider({
  initialId = null,
  initialKind = null,
  children,
}: {
  initialId?: string | null;
  initialKind?: ActivityKind | null;
  children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [kind, setKind] = useState<ActivityKind | null>(initialKind);
  const [nonce, setNonce] = useState(0);
  const pick = useCallback((id: string, next?: ActivityKind) => {
    setSelectedId(id);
    if (next) {
      setKind(next);
      setNonce((value) => value + 1);
    }
  }, []);
  const value = useMemo(() => ({ selectedId, kind, nonce, pick }), [selectedId, kind, nonce, pick]);
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

/** Activity glyph — same control as Contacts. Opens call, SMS, email, meeting, or task on the right board. */
export function ActivityGlyph({
  id,
  menuTestId,
  listTestId,
  optionAttr = "data-ff-record-activity-option",
  leadId,
  dealId,
  contactId,
  accountId,
  policyId,
}: {
  id: string;
  menuTestId: string;
  listTestId: string;
  optionAttr?: string;
  leadId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
}) {
  const desk = useActivityPick();
  return (
    <RecordActivityMenu
      menuTestId={menuTestId}
      listTestId={listTestId}
      optionAttr={optionAttr}
      leadId={leadId}
      dealId={dealId}
      contactId={contactId}
      accountId={accountId}
      policyId={policyId}
      onOpen={desk ? () => desk.pick(id) : undefined}
      onKind={desk ? (kind) => desk.pick(id, kind) : undefined}
    />
  );
}

/** Hide the queue context rail when the producer picks a different lead. */
export function ActivityContextGate({ id, children }: { id: string; children: ReactNode }) {
  const desk = useActivityPick();
  if (desk?.selectedId && desk.selectedId !== id) return null;
  return children;
}

function targetFor(row: ActivityPanelRow, kind: ActivityKind): QuickCommsTarget {
  return {
    kind,
    leadId: row.leadId,
    dealId: row.dealId,
    policyId: row.policyId,
    contactId: row.contactId,
    accountId: row.accountId,
  };
}

function KindPulse({ row, kind, nonce }: { row: ActivityPanelRow; kind: ActivityKind | null; nonce: number }) {
  useEffect(() => {
    if (!kind || nonce === 0) return;
    window.dispatchEvent(new CustomEvent(QUICK_COMMS_EVENT, { detail: targetFor(row, kind) }));
  }, [row, kind, nonce]);
  return null;
}

function FetchedBoard({
  row,
  kind,
  nonce,
  officeAddress,
}: {
  row: ActivityPanelRow;
  kind: ActivityKind | null;
  nonce: number;
  officeAddress?: string | null;
}) {
  const [items, setItems] = useState<SerializedActivity[]>([]);

  useEffect(() => {
    let cancel = false;
    setItems([]);
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
    <QuickCommsBoard
      key={`${row.id}:${nonce}`}
      items={items}
      leadId={row.leadId}
      dealId={row.dealId}
      policyId={row.policyId}
      contactId={row.contactId}
      accountId={row.accountId}
      contactName={row.name}
      contactEmail={row.email}
      contactPhone={row.phone}
      officeAddress={officeAddress}
      clientAddress={row.clientAddress}
      initialKind={kind}
    />
  );
}

function Party({ name }: { name: string }) {
  return (
    <p className="truncate px-0.5 text-sm font-semibold text-navy" data-ff-activity-party="">
      {name}
    </p>
  );
}

/**
 * Leads desk: the server paints Quick Comms for the focused lead.
 * Picking another lead loads that same board without leaving the page.
 */
export function LeadActivitySwitch({
  initialId,
  rows,
  officeAddress = null,
  seed,
}: {
  initialId: string | null;
  rows: ActivityPanelRow[];
  officeAddress?: string | null;
  seed: ReactNode;
}) {
  const desk = useActivityPick();
  const selectedId = desk?.selectedId ?? initialId;
  const row = rows.find((item) => item.id === selectedId) ?? null;
  if (!row) {
    return null;
  }
  return (
    <div className="space-y-3" data-ff-standard-activity="" data-ff-activity-for={row.id}>
      <Party name={row.name} />
      {row.id === initialId ? (
        <>
          {seed}
          <KindPulse row={row} kind={desk?.kind ?? null} nonce={desk?.nonce ?? 0} />
        </>
      ) : (
        <FetchedBoard
          row={row}
          kind={desk?.kind ?? null}
          nonce={desk?.nonce ?? 0}
          officeAddress={officeAddress}
        />
      )}
    </div>
  );
}

function ActivityAside({
  row,
  kind,
  nonce,
  officeAddress,
}: {
  row: ActivityPanelRow;
  kind: ActivityKind | null;
  nonce: number;
  officeAddress?: string | null;
}) {
  return (
    <aside
      className={ACTIVITY_RAIL_ASIDE_CLASS}
      data-ff-standard-activity=""
      data-ff-deal-right-rail=""
      data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
      data-ff-activity-for={row.id}
    >
      <Party name={row.name} />
      <FetchedBoard row={row} kind={kind} nonce={nonce} officeAddress={officeAddress} />
    </aside>
  );
}

export type ActivitySurface =
  | "deals-list"
  | "renewals-list"
  | "deals-stack"
  | "renewals-stack"
  | "contacts-stack"
  | "accounts-stack"
  | "policies-stack"
  | "carriers-stack";

function activityEmptyCopy(surface: ActivitySurface): string {
  if (surface.startsWith("deals-")) {
    return "Select a deal. Call, SMS, email, meeting, and task log on this board.";
  }
  if (surface.startsWith("renewals-")) {
    return "Select a renewal. Call, SMS, email, meeting, and task log on this board.";
  }
  if (surface === "contacts-stack") {
    return "Select a contact. Call, SMS, email, meeting, and task log on this board.";
  }
  if (surface === "accounts-stack") {
    return "Select an account. Call, SMS, email, meeting, and task log on this board.";
  }
  if (surface === "policies-stack") {
    return "Select a policy. Call, SMS, email, meeting, and task log on this board.";
  }
  if (surface === "carriers-stack") {
    return "Select a carrier. Call, SMS, email, meeting, and task log on this board.";
  }
  return "Select a record. Call, SMS, email, meeting, and task log on this board.";
}

/** List and Stack desks: Activity rail stays reserved; selection is opt-in (click or ?rail=). */
export function StandardActivityShell({
  rows,
  officeAddress = null,
  surface,
  initialId = null,
  children,
}: {
  rows: ActivityPanelRow[];
  officeAddress?: string | null;
  surface: ActivitySurface;
  /** Deep-link / intentional focus only — never auto-pick rows[0]. */
  initialId?: string | null;
  children: ReactNode;
}) {
  const seedId = initialId && rows.some((row) => row.id === initialId) ? initialId : null;
  return (
    <ActivityDeskProvider initialId={seedId}>
      <ActivityDeskLayout rows={rows} officeAddress={officeAddress} surface={surface}>
        {children}
      </ActivityDeskLayout>
    </ActivityDeskProvider>
  );
}

function ActivityDeskLayout({
  rows,
  officeAddress,
  surface,
  children,
}: {
  rows: ActivityPanelRow[];
  officeAddress?: string | null;
  surface: ActivitySurface;
  children: ReactNode;
}) {
  const desk = useActivityPick();
  const selectedId = desk?.selectedId ?? null;
  const row = selectedId ? rows.find((item) => item.id === selectedId) ?? null : null;
  const showRail = rows.length > 0;
  return (
    <div
      className={cn("ff-activity-desk", showRail && "is-open")}
      data-ff-activity-desk={showRail ? "open" : "off"}
      data-ff-activity-surface={surface}
      data-ff-renewals-list-rail={surface === "renewals-list" ? "" : undefined}
      data-ff-deals-list-rail={surface === "deals-list" ? "" : undefined}
      data-ff-renewals-stack-rail={surface === "renewals-stack" ? "" : undefined}
      data-ff-deals-stack-rail={surface === "deals-stack" ? "" : undefined}
    >
      <div className="min-w-0">{children}</div>
      {showRail ? (
        row ? (
          <ActivityAside
            row={row}
            kind={desk?.kind ?? null}
            nonce={desk?.nonce ?? 0}
            officeAddress={officeAddress}
          />
        ) : (
          <aside
            className={ACTIVITY_RAIL_ASIDE_CLASS}
            data-ff-standard-activity=""
            data-ff-deal-right-rail=""
            data-ff-deal-rail-lock={ACTIVITY_RAIL_LOCK}
            data-ff-activity-empty=""
          >
            <div className="ff-card p-4 text-sm text-muted-foreground">{activityEmptyCopy(surface)}</div>
          </aside>
        )
      ) : null}
    </div>
  );
}
