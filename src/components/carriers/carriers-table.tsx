"use client";

import { useEffect, useState } from "react";
import { AppointmentRows } from "@/components/carriers/appointment-rows";
import { AppetiteNotes, type AppetiteNotesRule } from "@/components/carriers/appetite-notes";
import { ColumnPicker } from "@/components/carriers/column-picker";
import {
  defaultColumnVisibility,
  type CarrierTableColumnId,
} from "@/lib/carriers/desk";
import type { AppointmentRowInput } from "@/components/carriers/appointment-rows";

const STORAGE_KEY = "ff-carrier-columns";

export type CarrierTableRow = {
  id: string;
  name: string;
  portalLogin: string | null;
  customerServicePhone: string | null;
  agentPhone: string | null;
  website: string | null;
  agentPortalUrl: string | null;
  carrierInfo: string | null;
  dontWriteNotes: string | null;
  rule: AppetiteNotesRule | null;
  appointments: AppointmentRowInput[];
};

function loadVisibility(): Record<CarrierTableColumnId, boolean> {
  const fallback = defaultColumnVisibility();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<CarrierTableColumnId, boolean>>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  );
}

export function CarriersTable({ rows }: { rows: CarrierTableRow[] }) {
  const [visible, setVisible] = useState(defaultColumnVisibility);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVisible(loadVisibility());
    setReady(true);
  }, []);

  function updateVisible(next: Record<CarrierTableColumnId, boolean>) {
    setVisible(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const show = (id: CarrierTableColumnId) => !ready || visible[id];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ColumnPicker visible={visible} onChange={updateVisible} />
      </div>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              {show("portalLogin") ? <th>Portal login</th> : null}
              {show("customerServicePhone") ? <th>Customer-service phone</th> : null}
              {show("agentPhone") ? <th>Agent phone</th> : null}
              {show("website") ? <th>Website / agent portal</th> : null}
              {show("carrierInfo") ? <th>Carrier info</th> : null}
              {show("appointments") ? <th>Appointments</th> : null}
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-sm text-muted-foreground">
                  No carriers seeded. Run <code>npm run db:seed</code>.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.name}</td>
                  {show("portalLogin") ? (
                    <td className="text-xs">{row.portalLogin || "—"}</td>
                  ) : null}
                  {show("customerServicePhone") ? (
                    <td className="whitespace-nowrap text-xs">
                      {row.customerServicePhone || "—"}
                    </td>
                  ) : null}
                  {show("agentPhone") ? (
                    <td className="text-xs">{row.agentPhone || "—"}</td>
                  ) : null}
                  {show("website") ? (
                    <td className="text-xs">
                      {row.website || row.agentPortalUrl ? (
                        <span className="flex flex-col gap-0.5">
                          {row.website ? (
                            <ExternalLink href={row.website}>Website</ExternalLink>
                          ) : null}
                          {row.agentPortalUrl ? (
                            <ExternalLink href={row.agentPortalUrl}>Agent portal</ExternalLink>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  {show("carrierInfo") ? (
                    <td className="max-w-xs text-xs">{row.carrierInfo || "—"}</td>
                  ) : null}
                  {show("appointments") ? (
                    <td>
                      <AppointmentRows appointments={row.appointments} />
                    </td>
                  ) : null}
                  <td>
                    <AppetiteNotes
                      carrierName={row.name}
                      dontWriteNotes={row.dontWriteNotes}
                      rule={row.rule}
                      appointments={row.appointments}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
