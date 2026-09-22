export type MintExtractFailureRow = {
  fieldKey: string;
  normalizedValue?: string | null;
  rawValue?: string | null;
};

export type MintExtractFailureContext = {
  documentKind?: string | null;
  filename?: string | null;
  docType?: string | null;
  geminiPreview?: string | null;
};

const REQUIRED = [
  { key: "policy_number", label: "policy number" },
  { key: "premium", label: "premium" },
  { key: "effective_date", label: "effective date" },
] as const;

const WIND_KINDS = new Set(["wind_mit", "wind_mitigation", "windmit", "oir_b1_1802"]);
const ID_KINDS = new Set(["id_card", "insurance_card", "proof_of_insurance", "auto_id"]);
const NOT_ISSUED_KINDS = new Set([
  "not_declaration",
  "quote",
  "shopping",
  "shopping_quote",
  "quote_packet",
  "four_point",
  "inspection",
]);

function kindToken(raw?: string | null): string {
  return (raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function rowHasValue(row: MintExtractFailureRow): boolean {
  return Boolean((row.normalizedValue || row.rawValue || "").trim());
}

function isWindMit(context: MintExtractFailureContext, rows: readonly MintExtractFailureRow[]): boolean {
  const kind = kindToken(context.documentKind);
  const docType = kindToken(context.docType);
  const name = (context.filename ?? "").toLowerCase();
  if (docType === "wind_mit" || docType.includes("wind_mit") || docType === "wind") return true;
  if (/wind[\s._-]*mit|oir-b1-1802|wind mitigation/.test(name)) return true;
  if (WIND_KINDS.has(kind)) return true;
  return rows.some(
    (row) =>
      rowHasValue(row) &&
      (row.fieldKey === "wind_mit_form" || row.fieldKey === "wind_mit_inspector" || row.fieldKey === "wind_mit_date"),
  );
}

function isIdCard(context: MintExtractFailureContext): boolean {
  const kind = kindToken(context.documentKind);
  const name = (context.filename ?? "").toLowerCase();
  return ID_KINDS.has(kind) || /\bid[\s._-]*card\b/.test(name);
}

/** Declarations-page filenames are policy evidence even when Gemini says not_declaration. */
function filenameLooksLikeDec(filename?: string | null): boolean {
  const name = (filename ?? "").toLowerCase();
  return /\bdec(?:larations?)?(?:\s+pages?)?\b/.test(name) || /\bdeclarations?\b/.test(name);
}

function hasPolicyEvidence(
  rows: readonly MintExtractFailureRow[],
  preview: string,
  filename?: string | null,
): boolean {
  if (filenameLooksLikeDec(filename)) return true;
  const keys = new Set(
    rows.filter(rowHasValue).map((row) => row.fieldKey.trim().toLowerCase()),
  );
  if (
    ["policy_number", "current_premium", "premium", "effective_date", "expiration_date", "full_term_premium", "current_carrier", "vin"].some(
      (key) => keys.has(key),
    )
  ) {
    return true;
  }
  return /policy_number|full_term|total_premium|effective|expiration|6_month_premium|premium_due|policy_period/i.test(
    preview,
  );
}

/**
 * Missing required mint fields. A wind mit / ID card / non-policy must say so.
 * A real dec that came back under other keys lists the holes and a sanitized preview.
 */
export function describeMintExtractFailure(
  rows: readonly MintExtractFailureRow[],
  context: MintExtractFailureContext,
  valueOf: (rows: readonly MintExtractFailureRow[], key: string) => string,
): { message: string; missing: string[] } {
  const missing = REQUIRED.filter((field) => !valueOf(rows, field.key)).map((field) => field.label);
  const preview = (context.geminiPreview ?? "").replace(/\s+/g, " ").trim();
  const evidence = hasPolicyEvidence(rows, preview, context.filename);

  if (isWindMit(context, rows) && !evidence) {
    return {
      missing,
      message:
        "This file looks like a wind mitigation form, not an issued auto policy. Upload the declarations page. The file stays in the folder.",
    };
  }
  if (isIdCard(context) && missing.includes("premium")) {
    return {
      missing,
      message:
        "This file looks like an auto ID card, not the declarations page. The premium is not on the ID card. Upload the issued declarations page. The file stays in the folder.",
    };
  }
  const kind = kindToken(context.documentKind);
  if (NOT_ISSUED_KINDS.has(kind) && !evidence) {
    return {
      missing,
      message: `This file is not an issued policy (${kind.replace(/_/g, " ")}). Upload the declarations page. The file stays in the folder.`,
    };
  }

  const fileLabel = (context.filename ?? "").replace(/\s+/g, " ").trim();
  const expirationBlank = !valueOf(rows, "expiration_date");
  const which = missing.length ? missing.join(", ") : "policy number, premium, effective date";
  const expBit = expirationBlank ? " Expiration date was blank." : "";
  const fileBit = fileLabel ? ` File: ${fileLabel}.` : "";
  const head = `Could not extract ${which}.${expBit}${fileBit}`;
  const suffix = " The file stays in the folder.";
  let saw = "";
  if (preview) {
    const lead = " Gemini returned: ";
    const budget = 420 - head.length - lead.length - suffix.length - 1;
    if (budget >= 16) {
      const body = preview.length > budget ? `${preview.slice(0, Math.max(0, budget - 1))}…` : preview;
      saw = `${lead}${body}.`;
    }
  }
  return { missing, message: `${head}${saw}${suffix}` };
}
