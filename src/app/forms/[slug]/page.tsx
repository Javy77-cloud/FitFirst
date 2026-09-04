import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDealWorkspace, getFormTemplate } from "@/lib/db/queries";
import { fillFormFromSheet, formCounts } from "@/lib/forms/fill";
import { ELENA_DEAL_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function FormFillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dealId?: string }>;
}) {
  const { slug } = await params;
  const { dealId } = await searchParams;
  const template = await getFormTemplate(slug);
  if (!template) notFound();
  const workspace = await getDealWorkspace(dealId || ELENA_DEAL_ID);
  const cells = fillFormFromSheet(template.fields, workspace?.quoteSheet?.values ?? null, {
    contactName: workspace?.contact
      ? `${workspace.contact.firstName} ${workspace.contact.lastName}`
      : workspace?.deal.primaryNamedInsured,
    contactEmail: workspace?.contact?.email ?? workspace?.lead?.email,
    contactPhone: workspace?.contact?.phone ?? workspace?.lead?.phone,
    mailing: workspace?.contact?.mailingAddress ?? workspace?.risk?.address1,
    namedInsured: workspace?.deal.primaryNamedInsured,
    dealTitle: workspace?.deal.title,
  });
  const counts = formCounts(cells);

  return (
    <AppShell title={template.name}>
      <p className="mb-3 text-base text-muted-foreground">
        Filled from Quote Sheet on{" "}
        {workspace ? (
          <Link href={`/deals/${workspace.deal.id}?tab=quote-sheet`} className="text-primary hover:underline">
            {workspace.deal.title}
          </Link>
        ) : (
          "no deal"
        )}
        . Same record Super-Copy and Send to Fill use. Yellow missing / blue CHECK. Also in{" "}
        <Link href={`/documents/fill/${template.slug}`} className="text-primary hover:underline">
          Documents → Forms
        </Link>
        {" "}(scan-to-fill).
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-sm bg-fit-yellow-bg px-1.5 py-0.5 text-fit-yellow">
          Missing {counts.missing}
        </span>
        <span className="rounded-sm bg-fit-check-bg px-1.5 py-0.5 text-fit-check">
          CHECK {counts.check}
        </span>
        <span className="rounded-sm bg-fit-green-bg px-1.5 py-0.5 text-fit-green">
          Confirmed {counts.confirmed}
        </span>
      </div>
      <section className="ff-card overflow-hidden">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
              <th>Status</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell) => (
              <tr
                key={cell.key}
                className={
                  cell.status === "missing"
                    ? "bg-fit-yellow-bg/60"
                    : cell.status === "check"
                      ? "bg-fit-check-bg/70"
                      : ""
                }
              >
                <td>{cell.label}</td>
                <td>{cell.value || "—"}</td>
                <td className="uppercase text-[11px]">{cell.status}</td>
                <td className="text-[11px]">{cell.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
