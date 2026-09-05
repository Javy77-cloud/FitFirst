import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnTable } from "@/components/lists/column-table";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { WorkFlagPills, WorkStatusPill } from "@/components/work-queue/flag-pills";
import { listPolicies, ownerHomeDashboard } from "@/lib/db/queries";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { listDeskWorkQueue } from "@/lib/work-queue/list";
import { workStatusLabel } from "@/lib/work-queue/types";

export const dynamic = "force-dynamic";

export default async function WorkQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["kind", "status", "assignee", "flag"]);
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
      <p className="mb-3 text-base text-muted-foreground">
        Flags, notes, assignee, and in-app pings on the file — separate from Bound / Active /
        Lapse. Pings land on the assignee&apos;s bell. Nothing emails.
      </p>
      <SavedFiltersBar
        moduleId="work-queue"
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
        <ColumnTable
          moduleId="work-queue-flags"
          columns={[
            { id: "policy", label: "Policy", locked: true },
            { id: "assignee", label: "Assignee" },
            { id: "status", label: "Work status" },
            { id: "flags", label: "Flags" },
            { id: "note", label: "Latest note" },
            { id: "ping", label: "In-app ping" },
          ]}
          empty="No flagged files. Open a Policy and assign, flag, or ping from Work on this file."
          rows={flagged.map((row) => ({
            key: row.item.id,
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
        <ColumnTable
          moduleId="work-queue-attention"
          columns={[
            { id: "kind", label: "Kind" },
            { id: "item", label: "Item", locked: true },
            { id: "detail", label: "Detail" },
          ]}
          empty="Queue is clear."
          rows={attention.map((item) => ({
            key: item.id,
            cells: {
              kind: <span className="uppercase">{item.kind.replaceAll("_", " ")}</span>,
              item: (
                <Link href={item.href} className="font-medium text-primary hover:underline">
                  {item.title}
                </Link>
              ),
              detail: <span className="text-base text-muted-foreground">{item.detail}</span>,
            },
          }))}
        />
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Bound / pending / lapse
        </div>
        <ColumnTable
          moduleId="work-queue-policies"
          columns={[
            { id: "policy", label: "Policy", locked: true },
            { id: "status", label: "Status" },
            { id: "party", label: "Party" },
            { id: "expires", label: "Expires" },
          ]}
          empty="Nothing waiting on the book."
          rows={open.map(({ policy, contact, account }) => ({
            key: policy.id,
            cells: {
              policy: (
                <Link
                  href={`/policies/${policy.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {policy.policyNumber}
                </Link>
              ),
              status: <span className="uppercase">{policy.status}</span>,
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              expires: policy.expirationDate.toISOString().slice(0, 10),
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
