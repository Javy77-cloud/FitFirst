import { mailtoHref, telHref } from "@/lib/crm/lists";
import { RECORD_SOURCES } from "@/lib/crm/sources";
import type { CustomFieldDef, CustomFieldType } from "@/lib/custom-fields/types";
import { LINE_LABELS } from "@/lib/crm/bind";
import { LINES } from "@/lib/domain";
import { dealsHref, type PipelineViewId } from "@/lib/wire/pipeline";

export type PipelineSheetMode = "list" | "grid";

/** Native / system columns that stay read-only in Grid. Stage is the existing inline exception. */
export const PIPELINE_GRID_READONLY = new Set([
  "pick",
  "title",
  "updated",
  "tags",
  "shopLines",
]);

export type PipelineGridControl =
  | "text"
  | "multiline"
  | "picklist"
  | "boolean"
  | "date"
  | "datetime"
  | "number"
  | "currency"
  | "phone"
  | "email";

export type NamedRecord = { id: string; name: string };

export type PipelineListNav = {
  href: string;
  kind: "deal" | "carrier" | "contact" | "account" | "lead" | "agent" | "stage" | "tel" | "email";
};

export function isPipelineSheetMode(view: PipelineViewId): view is PipelineSheetMode {
  return view === "list" || view === "grid";
}

export function isPipelineGridEditable(
  columnId: string,
  field?: CustomFieldDef | null,
): boolean {
  if (PIPELINE_GRID_READONLY.has(columnId)) return false;
  if (field?.type === "formula" || field?.type === "image") return false;
  return true;
}

export function matchNamedRecord(raw: string, records: readonly NamedRecord[]): NamedRecord | null {
  const value = raw.trim();
  if (!value) return null;
  const byId = records.find((row) => row.id === value);
  if (byId) return byId;
  const lower = value.toLowerCase();
  return records.find((row) => row.name.trim().toLowerCase() === lower) ?? null;
}

export function isCarrierColumn(columnId: string, field?: CustomFieldDef | null): boolean {
  if (field?.lookupModule === "carriers") return true;
  return /carrier/i.test(columnId);
}

export function pipelineGridControl(
  columnId: string,
  field?: CustomFieldDef | null,
): PipelineGridControl {
  if (columnId === "stage" || columnId === "line" || columnId === "source" || columnId === "assigned") {
    return "picklist";
  }
  if (columnId === "value" || columnId === "premium") return "currency";
  if (field) return controlForFieldType(field.type);
  return "text";
}

export function controlForFieldType(type: CustomFieldType): PipelineGridControl {
  if (type === "picklist" || type === "multi_select") return "picklist";
  if (type === "lookup") return "text";
  if (type === "checkbox") return "boolean";
  if (type === "date") return "date";
  if (type === "date_time") return "datetime";
  if (type === "number" || type === "percentage") return "number";
  if (type === "currency") return "currency";
  if (type === "phone") return "phone";
  if (type === "email") return "email";
  if (type === "multi_line") return "multiline";
  return "text";
}

export function nativePicklistOptions(
  columnId: string,
  users: readonly NamedRecord[] = [],
): Array<{ value: string; label: string }> {
  if (columnId === "line") {
    return LINES.map((line) => ({ value: line, label: LINE_LABELS[line] ?? line }));
  }
  if (columnId === "source") {
    return RECORD_SOURCES.map((row) => ({ value: row.value, label: row.label }));
  }
  if (columnId === "assigned") {
    return users.map((user) => ({ value: user.id, label: user.name }));
  }
  return [];
}

export function pipelineListNav(input: {
  columnId: string;
  dealId: string;
  raw?: string | null;
  field?: CustomFieldDef | null;
  pipelineSlug?: string | null;
  stageSlug?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  ownerId?: string | null;
  carriers?: readonly NamedRecord[];
  users?: readonly NamedRecord[];
}): PipelineListNav | null {
  const raw = (input.raw ?? "").trim();
  const field = input.field ?? null;

  if (input.columnId === "title") {
    return { href: `/deals/${input.dealId}`, kind: "deal" };
  }

  if (input.columnId === "stage") {
    return {
      href: dealsHref({
        pipeline: input.pipelineSlug || "p-c",
        view: "board",
        stage: input.stageSlug || undefined,
      }),
      kind: "stage",
    };
  }

  if (input.columnId === "assigned" && input.ownerId) {
    return { href: `/settings/agents/${input.ownerId}`, kind: "agent" };
  }

  if (input.columnId === "phone" || field?.type === "phone") {
    const href = telHref(raw);
    return href ? { href, kind: "tel" } : null;
  }

  if (input.columnId === "email" || field?.type === "email") {
    const href = mailtoHref(raw);
    return href ? { href, kind: "email" } : null;
  }

  if (isCarrierColumn(input.columnId, field) && raw) {
    const carrier = matchNamedRecord(raw, input.carriers ?? []);
    return carrier ? { href: `/carriers/${carrier.id}`, kind: "carrier" } : null;
  }

  if (input.columnId === "named_insured" || field?.systemKey === "primaryNamedInsured") {
    if (input.contactId) return { href: `/contacts/${input.contactId}`, kind: "contact" };
    if (input.accountId) return { href: `/accounts/${input.accountId}`, kind: "account" };
    if (input.leadId) return { href: `/leads/${input.leadId}`, kind: "lead" };
    return { href: `/deals/${input.dealId}`, kind: "deal" };
  }

  if (field?.type === "lookup" && raw) {
    const module = field.lookupModule ?? "";
    if (module === "carriers") {
      const carrier = matchNamedRecord(raw, input.carriers ?? []);
      return carrier ? { href: `/carriers/${carrier.id}`, kind: "carrier" } : null;
    }
    if (module === "users") {
      const user = matchNamedRecord(raw, input.users ?? []);
      return user ? { href: `/settings/agents/${user.id}`, kind: "agent" } : null;
    }
    if (module === "contacts") {
      return { href: `/contacts/${raw}`, kind: "contact" };
    }
    if (module === "accounts") {
      return { href: `/accounts/${raw}`, kind: "account" };
    }
    if (module === "leads") {
      return { href: `/leads/${raw}`, kind: "lead" };
    }
    if (module === "deals") {
      return { href: `/deals/${raw}`, kind: "deal" };
    }
  }

  return null;
}
