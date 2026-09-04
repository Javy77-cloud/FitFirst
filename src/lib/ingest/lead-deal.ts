import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID, SHOP_LINE_TO_LOB, type AccountKind, type ShopLine } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, leads, policies, quoteSheets, risks } from "@/lib/db/schema";
import { persistDealFile } from "@/lib/documents/store";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import type { ParsedInsured } from "./identity";

export type IngestFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType: string;
};

export async function findOrCreateLead(identity: ParsedInsured | null, notes: string) {
  const firstName = identity?.firstName?.trim() || "Unknown";
  const lastName = identity?.lastName?.trim() || "Drop";

  const [existing] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, DEFAULT_TENANT_ID),
        sql`lower(${leads.firstName}) = ${firstName.toLowerCase()}`,
        sql`lower(${leads.lastName}) = ${lastName.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (existing) return { lead: existing, created: false };

  const [created] = await db
    .insert(leads)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName,
      lastName,
      source: "drop",
      status: "new",
      notes,
    })
    .returning();
  return { lead: created, created: true };
}

export async function ensureShoppingDealForLead(input: {
  leadId: string;
  firstName: string;
  lastName: string;
  line: ShopLine;
  namedInsured?: string | null;
  secondaryNamedInsured?: string | null;
  accountKind?: AccountKind;
}) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId));
  if (!lead) throw new Error("Lead not found");

  if (lead.convertedDealId) {
    const [open] = await db
      .select()
      .from(deals)
      .where(
        and(eq(deals.id, lead.convertedDealId), eq(deals.tenantId, DEFAULT_TENANT_ID)),
      );
    if (open && open.pipelineStage !== "bound" && open.pipelineStage !== "lost") {
      return { deal: open, created: false };
    }
  }

  const shopLines = input.line === "home" ? ["home"] : [input.line, "home"];
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${input.lastName} · ${SHOP_LINE_TO_LOB[input.line]} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: SHOP_LINE_TO_LOB[input.line],
      state: "FL",
      shopLines,
      primaryNamedInsured: input.namedInsured ?? `${input.firstName} ${input.lastName}`,
      secondaryNamedInsured: input.secondaryNamedInsured ?? null,
      accountKind: input.accountKind ?? "personal",
      notes: "Opened from a dropped source doc. No policy from these files. Quote PDFs can attach later.",
    })
    .returning();

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: input.line === "auto" ? "auto" : "property",
    state: "FL",
  });

  await db.insert(quoteSheets).values(
    shopLines.map((line) => ({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      line,
      values: emptySheetValues(line as ShopLine),
    })),
  );

  await db
    .update(leads)
    .set({
      status: "converted",
      convertedDealId: deal.id,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id));

  return { deal, created: true };
}

export async function attachSourceDocs(dealId: string, files: IngestFile[]) {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) throw new Error("Deal is missing a risk");
  const attached = [];
  for (const file of files) {
    attached.push(
      await persistDealFile({
        dealId,
        riskId: risk.id,
        filename: file.filename,
        mimeType: file.mimeType,
        buffer: file.buffer,
        docType: file.docType,
      }),
    );
  }
  return attached;
}

export async function countPoliciesForDeal(dealId: string): Promise<number> {
  const rows = await db.select().from(policies).where(eq(policies.dealId, dealId));
  return rows.length;
}
