import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { AGENCY_BRAND, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  agencyBrand,
  agencySettings,
  carriers,
  documents,
  quotes,
  quoteAttemptLogs,
} from "@/lib/db/schema";
import {
  compareQuotes,
  quoteToCompareInput,
  type CompareNeed,
  type CompareQuote,
} from "@/lib/quotes/gap-notes";
import {
  PROPOSAL_DOC_TYPE,
  PROPOSAL_SLOT,
  buildBrandedProposalPdf,
  proposalFilename,
  type ProposalBrand,
  type ProposalDeal,
} from "./branded-pdf";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export function isProposalDoc(doc: { docType?: string | null; slot?: string | null }): boolean {
  return doc.slot === PROPOSAL_SLOT || doc.docType === PROPOSAL_DOC_TYPE || doc.docType === "proposal_pdf";
}

export async function loadProposalBrand(): Promise<ProposalBrand> {
  const [brand, settings] = await Promise.all([
    db.select().from(agencyBrand).where(eq(agencyBrand.tenantId, DEFAULT_TENANT_ID)).then((rows) => rows[0]),
    db.select().from(agencySettings).where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID)).then((rows) => rows[0]),
  ]);
  let logoBytes: Uint8Array | null = null;
  const logoPath = brand?.logoStoragePath || settings?.logoPath;
  if (logoPath) {
    try {
      logoBytes = await readFile(path.join(uploadRoot, logoPath));
    } catch {
      logoBytes = null;
    }
  }
  return {
    agencyName: brand?.agencyName?.trim() || settings?.agencyName?.trim() || AGENCY_BRAND.name,
    colorPreset: (brand?.defaultColorPreset as ProposalBrand["colorPreset"]) || "agency",
    logoBytes,
    logoMime: brand?.logoMime ?? null,
    phone: AGENCY_BRAND.phone,
  };
}

export function quotesFromDealRows(input: {
  quotes: {
    quote: {
      id: string;
      premium: string | number | null;
      aopDeductible: string | null;
      hurricaneDeductible: string | null;
      coverageA: number | null;
      bindable: boolean;
      coverageGaps: string[] | null;
      notes: string | null;
    };
    carrier: { name: string };
  }[];
  logs?: {
    log: {
      id: string;
      result: string;
      premium: string | number | null;
      bindable: boolean;
      why: string | null;
      snapCoverageA: number | null;
    };
    carrier: { name: string };
  }[];
}): CompareQuote[] {
  if (input.quotes.length > 0) {
    return input.quotes.map(({ quote, carrier }) =>
      quoteToCompareInput({
        id: quote.id,
        carrierName: carrier.name,
        premium: quote.premium,
        aopDeductible: quote.aopDeductible,
        hurricaneDeductible: quote.hurricaneDeductible,
        coverageA: quote.coverageA,
        bindable: quote.bindable,
        coverageGaps: quote.coverageGaps,
        notes: quote.notes,
        result: "quoted",
      }),
    );
  }
  return (input.logs ?? [])
    .filter(({ log }) => log.result === "quoted")
    .map(({ log, carrier }) =>
      quoteToCompareInput({
        id: log.id,
        carrierName: carrier.name,
        premium: log.premium,
        coverageA: log.snapCoverageA,
        bindable: log.bindable,
        notes: log.why,
        result: log.result,
      }),
    );
}

export async function loadDealCompareQuotes(dealId: string): Promise<CompareQuote[]> {
  const [quoteRows, logRows] = await Promise.all([
    db
      .select({ quote: quotes, carrier: carriers })
      .from(quotes)
      .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
      .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId))),
    db
      .select({ log: quoteAttemptLogs, carrier: carriers })
      .from(quoteAttemptLogs)
      .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
      .where(and(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID), eq(quoteAttemptLogs.dealId, dealId))),
  ]);
  return quotesFromDealRows({ quotes: quoteRows, logs: logRows });
}

export async function writeProposalDocument(input: {
  dealId: string;
  riskId: string | null;
  contactId: string | null;
  filename: string;
  bytes: Buffer;
}): Promise<string> {
  const id = randomUUID();
  const storagePath = path.join(DEFAULT_TENANT_ID, input.dealId, `${id}-${input.filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, input.bytes);
  await db.insert(documents).values({
    id,
    tenantId: DEFAULT_TENANT_ID,
    riskId: input.riskId,
    dealId: input.dealId,
    contactId: input.contactId,
    filename: input.filename,
    mimeType: "application/pdf",
    storagePath,
    docType: PROPOSAL_DOC_TYPE,
    slot: PROPOSAL_SLOT,
    status: "attached",
  });
  return id;
}

export async function generateDealProposalPdf(input: {
  deal: ProposalDeal & { id: string; riskId: string | null; contactId: string | null };
  need: CompareNeed;
}): Promise<{ documentId: string; filename: string; quoteCount: number }> {
  const [brand, compareSet] = await Promise.all([
    loadProposalBrand(),
    loadDealCompareQuotes(input.deal.id),
  ]);
  const compared = compareQuotes(compareSet, input.need);
  const filename = proposalFilename(input.deal.title);
  const bytes = await buildBrandedProposalPdf({
    brand,
    deal: input.deal,
    quotes: compared,
  });
  const documentId = await writeProposalDocument({
    dealId: input.deal.id,
    riskId: input.deal.riskId,
    contactId: input.deal.contactId,
    filename,
    bytes,
  });
  return { documentId, filename, quoteCount: compared.length };
}

export async function latestProposalForDeal(dealId: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, DEFAULT_TENANT_ID),
        eq(documents.dealId, dealId),
        eq(documents.slot, PROPOSAL_SLOT),
      ),
    )
    .orderBy(desc(documents.createdAt))
    .limit(1);
  return row ?? null;
}
