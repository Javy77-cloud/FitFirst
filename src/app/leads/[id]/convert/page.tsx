import { notFound, redirect } from "next/navigation";
import { convertLeadToDeal } from "@/app/actions/crm";
import { getLead } from "@/lib/db/queries";
import { isUuid } from "@/lib/ids";
import { parseSelectedShopLines } from "@/lib/leads/line-documents";

export const dynamic = "force-dynamic";

/** Leftover /convert URLs: copy every lead field and land on Deal Details. No picker. */
export default async function ConvertLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shopLines?: string; line?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isUuid(id)) notFound();
  const row = await getLead(id);
  if (!row) notFound();
  const { lead, deal } = row;
  if (deal) {
    redirect(`/deals/${deal.id}`);
  }
  const dealId = await convertLeadToDeal(
    lead.id,
    query.line || lead.insuranceTypeDesired || "HO",
    lead.state || "FL",
    parseSelectedShopLines(query.shopLines ?? ""),
    null,
  );
  redirect(`/deals/${dealId}?tab=details`);
}
