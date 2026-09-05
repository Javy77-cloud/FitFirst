import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listPolicies, ownerHomeDashboard } from "@/lib/db/queries";
import { ColumnTable } from "@/components/lists/column-table";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";

export const dynamic = "force-dynamic";

export default async function WorkQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = pickFilterParams(await searchParams, ["kind", "status"]);
  const [{ snapshot }, rows] = await Promise.all([ownerHomeDashboard(), listPolicies()]);
  const attention = snapshot.attention.filter((item) => matchesField(item.kind, filter.kind));
  const open = rows.filter(({ policy }) => {
    const status = policy.status.toLowerCase();
    if (!["bound", "pending", "lapse", "lapsed"].includes(status)) return false;
    return matchesField(status, filter.status);
  });

  return (
    <AppShell title="Work queue">
      <p className="mb-3 text-base text-muted-foreground">
        One queue: owner attention (review tasks, lapses, bound waiting on issue) plus policies
        still in Bound / Pending / Lapse. Nothing emails anyone.
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
        ]}
      />

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
              status: <PolicyStatusBadge status={policy.status} />,
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              expires: policy.expirationDate.toISOString().slice(0, 10),
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
