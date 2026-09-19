"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import {
  isHotCommitment,
  type Commitment,
  type SerializedCommitment,
} from "@/lib/notifications/commitments";
import { formatTaskDueAt } from "@/lib/tasks/due-at";
import type { CustomFieldDef, FieldLayout } from "@/lib/custom-fields/types";
import { cn } from "@/lib/utils";

export function CommitmentsTimeline({
  commitments,
  currentUserId,
  layout,
  fields,
  defaultOpenCreate = false,
}: {
  commitments: Array<Commitment | SerializedCommitment>;
  currentUserId?: string | null;
  layout?: FieldLayout;
  fields?: CustomFieldDef[];
  defaultOpenCreate?: boolean;
}) {
  const hot = useMemo(() => commitments.filter((row) => isHotCommitment(row.heat)), [commitments]);
  const later = useMemo(() => commitments.filter((row) => row.heat === "later"), [commitments]);
  const [open, setOpen] = useState(hot.length > 0);

  return (
    <section className="ff-commitments" data-ff-commitments-timeline="" id="commitments">
      <header className="ff-commitments-head">
        <div>
          <h2>Commitments</h2>
          <p>
            {hot.length > 0
              ? `${hot.length} overdue or due soon — expanded so they cannot hide in a list.`
              : "Collapsed. Promises live on the Contact and Deal. This strip opens when something is hot."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateTaskDialog
            defaultOpen={defaultOpenCreate}
            layout={layout}
            fields={fields}
            currentUserId={currentUserId ?? undefined}
            trigger="New promise"
            title="New promise"
            description="Promises live on a Contact, Deal, Policy, Lead, or Account — never as an orphan task."
            defaults={{ assigneeId: currentUserId ?? undefined, returnTo: "/notifications#commitments" }}
          />
          <button
            type="button"
            className="ff-panel-ghost"
            onClick={() => setOpen((prev) => !prev)}
            data-ff-commitments-toggle=""
            aria-expanded={open}
          >
            {open ? "Collapse" : `Show ${commitments.length}`}
          </button>
        </div>
      </header>

      {hot.length > 0 || open ? (
        <ol className="ff-commitments-list">
          {(open ? commitments : hot).map((row) => (
            <li
              key={`${row.source}:${row.id}`}
              className={cn("ff-commitments-row", `ff-promise-chip-${row.heat}`)}
              data-ff-commitment-heat={row.heat}
              data-ff-commitment-orphan={row.orphan ? "true" : "false"}
            >
              <Link href={row.href} className="ff-commitments-title">
                {row.title}
              </Link>
              <span className="ff-commitments-meta">
                {row.recordName || (row.orphan ? "Needs a record" : "Linked")}
                {" · "}
                {formatTaskDueAt(row.dueAt)}
              </span>
            </li>
          ))}
        </ol>
      ) : later.length > 0 ? (
        <p className="ff-renewals-urgency-empty">{later.length} later promises stay on the records.</p>
      ) : (
        <p className="ff-renewals-urgency-empty">No open promises. Capture one from a Contact or Deal.</p>
      )}
    </section>
  );
}
