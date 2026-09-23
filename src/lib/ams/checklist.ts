import { formatDay } from "@/lib/domain";
import {
  SERVICING_CHECK_LABELS,
  SERVICING_DOC_LABELS,
  type ServicingCheckKey,
  type ServicingDocKey,
} from "@/lib/domain-ams";
import { deskNow } from "@/lib/home/as-of";
import { daysUntilExpiration, expirationDay } from "./renewals";
import {
  CHECKLIST_CHECK_KEYS_BY_LOB,
  CHECKLIST_DOC_KEYS_BY_LOB,
  resolveChecklistLob,
  type ChecklistLobFamily,
} from "./checklist-templates";

export type ServicingFile = {
  docType: string;
  slot?: string | null;
};

export type ServicingTask = {
  id: string;
  title: string;
  dueDate: Date | string | null;
};

export type ServicingCheck = {
  id?: string;
  key: ServicingCheckKey;
  status: "complete" | "incomplete";
  notes?: string | null;
  taskId?: string | null;
};

export type ChecklistItem = {
  key: ServicingDocKey | ServicingCheckKey | "next_task";
  label: string;
  ok: boolean;
  detail: string;
  toggleable: boolean;
  checkId?: string | null;
  taskId?: string | null;
};

export type ServicingChecklist = {
  items: ChecklistItem[];
  readyCount: number;
  missingCount: number;
  lobFamily: ChecklistLobFamily | "classic";
};

/** Issued mint often stores current_policy / dec before policy_dec retag. */
const DEC_TYPES = new Set([
  "policy_dec",
  "policy_complete",
  "current_policy",
  "dec",
  "declaration",
  "policy",
]);
const ID_TYPES = new Set(["policy_id", "id_card", "auto_id_card"]);
const AOR_TYPES = new Set(["aor"]);

export function hasServicingDoc(files: ServicingFile[], key: ServicingDocKey): boolean {
  const types =
    key === "dec" ? DEC_TYPES : key === "id_card" ? ID_TYPES : AOR_TYPES;
  return files.some((file) => types.has(String(file.docType ?? "").toLowerCase()));
}

/** Optional packets — never auto-required; never block policy completion. */
export const OPTIONAL_SERVICING_DOC_KEYS = ["aor", "id_card"] as const;
export type OptionalServicingDocKey = (typeof OPTIONAL_SERVICING_DOC_KEYS)[number];

export function isOptionalServicingDocKey(key: string): key is OptionalServicingDocKey {
  return (OPTIONAL_SERVICING_DOC_KEYS as readonly string[]).includes(key);
}

/**
 * Extra checklist rows for optional packets not already covered by the LOB
 * template (e.g. AOR; ID cards when the LOB uses the id_cards check instead).
 * These rows are informational only — they must not count toward missing/complete.
 */
export function optionalExtraPacketKeys(listedItemKeys: Iterable<string>): ServicingDocKey[] {
  const listed = new Set(listedItemKeys);
  return OPTIONAL_SERVICING_DOC_KEYS.filter((key) => {
    if (listed.has(key)) return false;
    if (key === "id_card" && listed.has("id_cards")) return false;
    return true;
  });
}

/** Accurate on-file map for optional (and required) packet slots. */
export function servicingPacketOnFile(
  files: ServicingFile[],
): Partial<Record<ServicingDocKey, boolean>> {
  const keys: ServicingDocKey[] = ["dec", "id_card", "aor"];
  const out: Partial<Record<ServicingDocKey, boolean>> = {};
  for (const key of keys) out[key] = hasServicingDoc(files, key);
  return out;
}

/** Auto-required packet slots only (never AOR / ID cards on create). */
export function missingServicingDocs(
  files: ServicingFile[],
  lineOfBusiness?: string | null,
): ServicingDocKey[] {
  const keys = lineOfBusiness
    ? CHECKLIST_DOC_KEYS_BY_LOB[resolveChecklistLob(lineOfBusiness)]
    : CHECKLIST_DOC_KEYS_BY_LOB.default;
  return keys.filter((key) => !hasServicingDoc(files, key));
}

export function checkByKey(
  checks: ServicingCheck[] | undefined,
  key: ServicingCheckKey,
): ServicingCheck | undefined {
  return checks?.find((row) => row.key === key);
}

export function isCheckComplete(
  checks: ServicingCheck[] | undefined,
  key: ServicingCheckKey,
): boolean {
  return checkByKey(checks, key)?.status === "complete";
}

export function servicingTaskTitle(itemKey: ServicingCheckKey, policyNumber: string): string {
  return `Servicing · ${SERVICING_CHECK_LABELS[itemKey]} · ${policyNumber}`;
}

export function servicingTaskBody(itemKey: ServicingCheckKey, policyNumber: string): string {
  return `${SERVICING_CHECK_LABELS[itemKey]} is incomplete on ${policyNumber}. In-desk task only — do not email.`;
}

function docItem(key: ServicingDocKey, files: ServicingFile[]): ChecklistItem {
  const ok = hasServicingDoc(files, key);
  return {
    key,
    label: SERVICING_DOC_LABELS[key],
    ok,
    detail: ok
      ? "Issued packet is on this record."
      : "Upload on this Policy — shopping docs stay on the Deal.",
    toggleable: false,
  };
}

function renewalItem(
  checks: ServicingCheck[] | undefined,
  expirationDate: Date | string | null | undefined,
  asOf: Date,
): ChecklistItem {
  const exp = expirationDay(expirationDate);
  const days = exp ? daysUntilExpiration(exp, asOf) : null;
  const renewalDocsDue = days != null && days >= 0 && days <= 90;
  const renewalCheck = checkByKey(checks, "renewal_docs");
  return {
    key: "renewal_docs",
    label: SERVICING_CHECK_LABELS.renewal_docs,
    ok: !renewalDocsDue ? (days == null ? false : true) : renewalCheck?.status === "complete",
    detail:
      days == null
        ? "No expiration on this Policy."
        : !renewalDocsDue
          ? `Not in the 90-day window. Expires ${formatDay(exp)}.`
          : renewalCheck?.status === "complete"
            ? `Renewal packet complete. Expires in ${days} days.`
            : `Due — expires in ${days} days (${formatDay(exp)}).`,
    toggleable: true,
    checkId: renewalCheck?.id ?? null,
    taskId: renewalCheck?.taskId ?? null,
  };
}

function checkItem(
  key: ServicingCheckKey,
  checks: ServicingCheck[] | undefined,
  files: ServicingFile[],
): ChecklistItem {
  if (key === "renewal_docs") {
    // caller should use renewalItem
    return {
      key,
      label: SERVICING_CHECK_LABELS[key],
      ok: false,
      detail: "",
      toggleable: true,
    };
  }
  if (key === "id_cards") {
    const idOnFile = hasServicingDoc(files, "id_card");
    const idCheck = checkByKey(checks, "id_cards");
    return {
      key: "id_cards",
      label: SERVICING_CHECK_LABELS.id_cards,
      ok: idOnFile || idCheck?.status === "complete",
      detail: idOnFile
        ? "ID card file is attached."
        : idCheck?.status === "complete"
          ? "Marked complete on the desk."
          : "No ID cards on this Policy yet.",
      toggleable: true,
      checkId: idCheck?.id ?? null,
      taskId: idCheck?.taskId ?? null,
    };
  }
  const row = checkByKey(checks, key);
  const emptyHints: Partial<Record<ServicingCheckKey, string>> = {
    inspection: "Inspection not on file. Mark complete when the report lands.",
    mortgagee: "Mortgagee clause still open. File the endorsement when the lender packet is ready.",
    roof_docs: "Roof docs not on file yet.",
    beneficiary: "Beneficiary not confirmed. Link a contact when the insured names one.",
    medical_exam: "Medical exam not marked complete.",
    underwriting: "Underwriting packet still open.",
    coi: "Certificate of insurance not on file.",
    loss_runs: "Loss runs not collected yet.",
    ai_endorsements: "Additional insured endorsements still open.",
  };
  const doneHints: Partial<Record<ServicingCheckKey, string>> = {
    inspection: "Inspection marked complete.",
    mortgagee: "Mortgagee / additional interest is current.",
    roof_docs: "Roof docs marked complete.",
    beneficiary: "Beneficiary marked complete.",
    medical_exam: "Medical exam marked complete.",
    underwriting: "Underwriting marked complete.",
    coi: "COI marked complete.",
    loss_runs: "Loss runs marked complete.",
    ai_endorsements: "AI endorsements marked complete.",
  };
  return {
    key,
    label: SERVICING_CHECK_LABELS[key],
    ok: row?.status === "complete",
    detail:
      row?.status === "complete"
        ? doneHints[key] ?? "Marked complete on the desk."
        : emptyHints[key] ?? "Incomplete on the desk.",
    toggleable: true,
    checkId: row?.id ?? null,
    taskId: row?.taskId ?? null,
  };
}

/** Classic 6-item checklist (WAVE 1 / Elena). Used when lineOfBusiness omitted. */
function buildClassicChecklist(input: {
  files: ServicingFile[];
  expirationDate: Date | string | null | undefined;
  nextTask: ServicingTask | null;
  checks?: ServicingCheck[];
  asOf: Date;
}): ServicingChecklist {
  const items: ChecklistItem[] = [
    docItem("dec", input.files),
    checkItem("id_cards", input.checks, input.files),
    renewalItem(input.checks, input.expirationDate, input.asOf),
    checkItem("inspection", input.checks, input.files),
    checkItem("mortgagee", input.checks, input.files),
    {
      key: "next_task",
      label: "Next service task",
      ok: Boolean(input.nextTask),
      detail: input.nextTask
        ? input.nextTask.dueDate
          ? `${input.nextTask.title} · due ${formatDay(input.nextTask.dueDate)}`
          : input.nextTask.title
        : "No open service task on this Policy.",
      toggleable: false,
      taskId: input.nextTask?.id ?? null,
    },
  ];
  // Preserve classic dec wording from WAVE 1
  items[0] = {
    key: "dec",
    label: SERVICING_DOC_LABELS.dec,
    ok: hasServicingDoc(input.files, "dec"),
    detail: hasServicingDoc(input.files, "dec")
      ? "Issued declaration page or complete policy is on this record."
      : "Upload the issued declaration page on this Policy — shopping decs stay on the Deal.",
    toggleable: false,
  };
  return {
    items,
    readyCount: items.filter((item) => item.ok).length,
    missingCount: items.filter((item) => !item.ok).length,
    lobFamily: "classic",
  };
}

export function buildServicingChecklist(input: {
  files: ServicingFile[];
  expirationDate: Date | string | null | undefined;
  nextTask: ServicingTask | null;
  checks?: ServicingCheck[];
  asOf?: Date;
  lineOfBusiness?: string | null;
}): ServicingChecklist {
  const asOf = input.asOf ?? deskNow();
  if (!input.lineOfBusiness) {
    return buildClassicChecklist({ ...input, asOf });
  }

  const family = resolveChecklistLob(input.lineOfBusiness);
  const docKeys = CHECKLIST_DOC_KEYS_BY_LOB[family];
  const checkKeys = CHECKLIST_CHECK_KEYS_BY_LOB[family];
  const items: ChecklistItem[] = [];

  for (const key of docKeys) {
    if (key === "dec") {
      items.push({
        key: "dec",
        label: SERVICING_DOC_LABELS.dec,
        ok: hasServicingDoc(input.files, "dec"),
        detail: hasServicingDoc(input.files, "dec")
          ? "Issued declaration page or complete policy is on this record."
          : "Upload the issued declaration page on this Policy — shopping decs stay on the Deal.",
        toggleable: false,
      });
    } else {
      items.push(docItem(key, input.files));
    }
  }

  for (const key of checkKeys) {
    if (key === "renewal_docs") {
      items.push(renewalItem(input.checks, input.expirationDate, asOf));
    } else {
      items.push(checkItem(key, input.checks, input.files));
    }
  }

  items.push({
    key: "next_task",
    label: "Next service task",
    ok: Boolean(input.nextTask),
    detail: input.nextTask
      ? input.nextTask.dueDate
        ? `${input.nextTask.title} · due ${formatDay(input.nextTask.dueDate)}`
        : input.nextTask.title
      : "No open service task on this Policy.",
    toggleable: false,
    taskId: input.nextTask?.id ?? null,
  });

  return {
    items,
    readyCount: items.filter((item) => item.ok).length,
    missingCount: items.filter((item) => !item.ok).length,
    lobFamily: family,
  };
}
