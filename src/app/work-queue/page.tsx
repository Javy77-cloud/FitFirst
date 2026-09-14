import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import {
  WORK_QUEUE_FLAGS_COLUMNS,
  WORK_QUEUE_POLICIES_COLUMNS,
} from "@/lib/list-columns";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { WorkFlagPills, WorkStatusPill } from "@/components/work-queue/flag-pills";
import { GroupedAttentionTable } from "@/components/work-queue/grouped-attention";
import { listPolicies, ownerHomeDashboard } from "@/lib/db/queries";
import { firstParam, matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { listDeskWorkQueue } from "@/lib/work-queue/list";
import { workStatusLabel } from "@/lib/work-queue/types";
import { formatDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function WorkQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const policyIdParam = typeof params.policy === "string" ? params.policy : undefined;
  const filter = pickFilterParams(params, ["kind", "status", "assignee", "flag"]);
  const q = firstParam(params.q) ?? "";
  const [{ snapshot }, rows, workRows] = await Promise.all([
    ownerHomeDashboard(),
    listPolicies(),
    listDeskWorkQueue(),
  ]);
  const attention = snapshot.attention.filter((item) => matchesField(item.kind, filter.kind));
  const open = rows.filter(({ policy }) => {
    const status = policy.status.toLowerCase();
    if (!["bound", "pending", "lapse", "lapsed"].includes(status)) return false;
    return matchesField(status, filter.status);
  });
  const flagged = workRows.filter((row) => {
    if (row.flags.length === 0) return false;
    if (filter.assignee && !matchesField(row.assignee?.name ?? "Unassigned", filter.assignee)) {
      return false;
    }
    if (filter.flag) {
      const flags = row.flags.map((item) => item.flag);
      if (!flags.some((flag) => matchesField(flag, filter.flag))) return false;
    }
    return true;
  });

  return (
    <AppShell title="Work queue">
      <DeskPageTrail
        backLabel={policyIdParam ? "Back to policy" : "Back"}
        fallbackHref={policyIdParam ? `/policies/${policyIdParam}` : "/"}
        crumbs={[
          ...(policyIdParam
            ? [
                { href: "/policies", label: "Policies" },
                { href: `/policies/${policyIdParam}`, label: "Policy" },
              ]
            : []),
          { label: "Work queue" },
        ]}
      />
      <p className="mb-3 text-base text-muted-foreground">
        Flags, notes, assignee, and in-app pings on the file — separate from Bound / Active /
        Lapse. Pings land on the assignee&apos;s bell. Nothing emails.
      </p>
      <SavedFiltersBar
        moduleId="work-queue"
        searchPlaceholder="Contains policy, party, flag…"
        fields={[
          {
            key: "kind",
            label: "Kind",
            options: uniqueOptions(snapshot.attention.map((item) => item.kind)),
          },
          {
            key: "status",
            label: "Policy status",
            options: [
              { value: "bound", label: "bound" },
              { value: "pending", label: "pending" },
              { value: "lapse", label: "lapse" },
              { value: "lapsed", label: "lapsed" },
            ],
          },
          {
            key: "assignee",
            label: "Assignee",
            options: uniqueOptions(workRows.map((row) => row.assignee?.name ?? "Unassigned")),
          },
          {
            key: "flag",
            label: "Flag",
            options: uniqueOptions(workRows.flatMap((row) => row.flags.map((flag) => flag.flag))),
          },
        ]}
      />

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Flagged work
        </div>
        <DeskColumnTable
          moduleId="work-queue-flags"
          searchModuleId="work-queue"
          initialQuery={q}
          columns={WORK_QUEUE_FLAGS_COLUMNS}
          empty="No flagged files. Open a Policy and assign, flag, or ping from Work on this file."
          rows={flagged.map((row) => ({
            key: row.item.id,
            hay: haystack([
              row.policy.policyNumber,
              row.assignee?.name,
              row.latestNote,
              ...row.flags.map((flag) => flag.flag),
            ]),
            cells: {
              policy: (
                <Link
                  href={`/policies/${row.policy.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.policy.policyNumber}
                </Link>
              ),
              assignee: row.assignee?.name ?? "Unassigned",
              status: <WorkStatusPill status={workStatusLabel(row.item.workStatus)} />,
              flags: (
                <WorkFlagPills flags={row.flags.map((flag) => flag.flag)} empty="No open flags" />
              ),
              note: <span className="text-base text-muted-foreground">{row.latestNote ?? "—"}</span>,
              ping:
                row.openReminders > 0
                  ? `${row.openReminders} open ping${row.openReminders === 1 ? "" : "s"}`
                  : "None",
            },
          }))}
        />
      </section>

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Needs attention
        </div>
        <p className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
          Identical Collect / Servicing checklist rows are grouped by item type with a count —
          expand a group to open each Policy. Soft-refresh keeps the grouping.
        </p>
        <GroupedAttentionTable
          items={attention.map((item) => ({
            id: item.id,
            kind: item.kind,
            title: item.title,
            detail: item.detail,
            href: item.href,
          }))}
        />
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Bound / pending / lapse
        </div>
        <DeskColumnTable
          moduleId="work-queue-policies"
          searchModuleId="work-queue"
          initialQuery={q}
          columns={WORK_QUEUE_POLICIES_COLUMNS}
          empty="Nothing waiting on the book."
          rows={open.map(({ policy, contact, account }) => ({
            key: policy.id,
            hay: haystack([
              policy.policyNumber,
              policy.status,
              contact ? `${contact.lastName} ${contact.firstName}` : null,
              account?.name,
            ]),
            cells: {
              policy: (
                <Link
                  href={`/policies/${policy.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {policy.policyNumber}
                </Link>
              ),
              status: <PolicyStatusBadge status={policy.status} />,
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              expires: formatDay(policy.expirationDate),
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
