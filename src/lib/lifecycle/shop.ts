import { LOB_TO_SHOP_LINE, type ShopLine } from "@/lib/domain";
import { lineBook, type LineBook } from "@/lib/lines/catalog";

export function pipelineSlugForLine(line: string): string {
  const u = line.trim().toUpperCase();
  if (u === "HEALTH") return "health";
  if (u === "LIFE") return "life";
  // Flood is a P&C product — same board / stage set as Home and Auto.
  if (u === "FLOOD" || u === "NFIP") return "p-c";
  return "p-c";
}

export function shopLineForLob(line: string): ShopLine {
  const u = line.trim().toUpperCase();
  const mapped = LOB_TO_SHOP_LINE[u];
  if (mapped) return mapped;
  return lineBook(u) === "commercial" ? "general_liability" : "home";
}

export function defaultLineBook(line: string): LineBook {
  return lineBook(line);
}

export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
