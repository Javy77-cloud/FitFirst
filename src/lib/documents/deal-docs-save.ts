import { asList } from "@/lib/safe-list";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import { docCardKeyFromTags } from "@/lib/leads/line-documents";

/** Stay under next.config serverActions.bodySizeLimit so the action is invoked. */
export const DEAL_DOCUMENTS_BODY_LIMIT_BYTES = 45 * 1024 * 1024;

export function dealDocumentsTabHref(dealId: string, line?: string | null): string {
  const query = new URLSearchParams({ tab: "documents" });
  const trimmed = (line ?? "").trim();
  if (trimmed) query.set("line", trimmed);
  return `/deals/${dealId}?${query.toString()}`;
}

export type WorksheetSourceDoc = {
  slot?: string | null;
  docType?: string | null;
  tags?: unknown;
};

/**
 * Documents-tab source list. Never throws — a bad tag/mime/slot must not take down /deals/[id].
 */
export function listWorksheetSourceDocs<T extends WorksheetSourceDoc>(
  docs: T[] | null | undefined,
): { sourceDocs: T[]; lineDocs: T[]; otherSourceDocs: T[] } {
  try {
    const sourceDocs = asList(docs).filter((doc) => {
      try {
        if (!doc || typeof doc !== "object") return false;
        const tags = asList(doc.tags as string[] | null | undefined);
        return (
          isDocumentsSourceDoc({ ...doc, tags }) &&
          doc.slot !== "filled_letter" &&
          !tags.includes("agency_letter")
        );
      } catch {
        return false;
      }
    });
    const lineDocs = sourceDocs.filter((doc) => {
      try {
        return Boolean(docCardKeyFromTags(asList(doc.tags as string[] | null | undefined)));
      } catch {
        return false;
      }
    });
    const otherSourceDocs = sourceDocs.filter((doc) => !lineDocs.includes(doc));
    return { sourceDocs, lineDocs, otherSourceDocs };
  } catch {
    return { sourceDocs: [], lineDocs: [], otherSourceDocs: [] };
  }
}

export function sourceDocDisplayName(filename: unknown): string {
  const raw = typeof filename === "string" ? filename.trim() : "";
  return raw || "file";
}

export function sourceDocExtensionLabel(filename: unknown): string {
  const name = sourceDocDisplayName(filename);
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return (ext || "file").slice(0, 4);
}
