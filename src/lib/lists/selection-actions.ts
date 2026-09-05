import { isProtectedAnaRecord } from "@/lib/developer-hub/protected";
import { DEV_HUB_MODULES, type DevHubModule } from "@/lib/developer-hub/types";

export const CRM_LIST_MODULES = [
  ...DEV_HUB_MODULES,
  "carriers",
] as const;
export type CrmListModule = (typeof CRM_LIST_MODULES)[number];

export function isCrmListModule(value: string): value is CrmListModule {
  return (CRM_LIST_MODULES as readonly string[]).includes(value);
}

export type SelectionRecord = {
  id: string;
  label: string;
  email?: string | null;
  phone?: string | null;
  convertedDealId?: string | null;
  archivedAt?: string | Date | null;
  boundAt?: string | Date | null;
  policyId?: string | null;
  taskSource?: "review" | "activity";
  contactId?: string | null;
  accountId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  locked?: boolean;
};

export type SelectionActionId =
  | "convert"
  | "bind"
  | "duplicate"
  | "merge"
  | "email"
  | "sms"
  | "call"
  | "print"
  | "run_macro"
  | "archive"
  | "delete";

export type SelectionAction = {
  id: SelectionActionId;
  label: string;
  enabled: boolean;
  reason?: string;
  href?: string;
  variant?: "default" | "destructive";
};

const DUPLICATE_OK: CrmListModule[] = [
  "leads",
  "contacts",
  "deals",
  "businesses",
  "tasks",
  "campaigns",
];
const MERGE_OK: CrmListModule[] = ["leads", "contacts"];
const ARCHIVE_OK: CrmListModule[] = ["leads", "contacts", "deals"];

function present(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function isLocked(row: SelectionRecord): boolean {
  return Boolean(row.locked) || isProtectedAnaRecord(row.id);
}

function lockedReason(selected: SelectionRecord[]): string | null {
  if (selected.some(isLocked)) {
    return "Ana Dib is locked on this live book.";
  }
  return null;
}

function withReason(
  id: SelectionActionId,
  label: string,
  enabled: boolean,
  reason?: string,
  extra?: Partial<SelectionAction>,
): SelectionAction {
  return { id, label, enabled, ...(reason ? { reason } : {}), ...extra };
}

export function recordsWithEmail(selected: SelectionRecord[]): SelectionRecord[] {
  return selected.filter((row) => present(row.email));
}

export function recordsWithPhone(selected: SelectionRecord[]): SelectionRecord[] {
  return selected.filter((row) => present(row.phone));
}

export function listSelectionActions(input: {
  module: CrmListModule;
  selected: SelectionRecord[];
  hasMacros?: boolean;
}): SelectionAction[] {
  const { module, selected, hasMacros = false } = input;
  const count = selected.length;
  const locked = lockedReason(selected);
  const emails = recordsWithEmail(selected);
  const phones = recordsWithPhone(selected);
  const actions: SelectionAction[] = [];

  if (module === "leads") {
    const open = selected.filter((row) => !row.convertedDealId);
    if (count === 0) {
      actions.push(withReason("convert", "Convert", false, "Select a lead to start a shop."));
    } else if (open.length === 0) {
      const dealId = selected[0]?.convertedDealId;
      actions.push(
        withReason("convert", "Convert", false, "Already converted — open the deal.", {
          href: dealId ? `/deals/${dealId}` : undefined,
        }),
      );
    } else {
      actions.push(withReason("convert", open.length === 1 ? "Convert" : `Convert (${open.length})`, true));
    }
  }

  if (module === "deals") {
    if (count !== 1) {
      actions.push(withReason("bind", "Bind", false, "Pick one deal to open bind."));
    } else if (locked) {
      actions.push(withReason("bind", "Bind", false, locked));
    } else {
      const deal = selected[0];
      if (deal.boundAt || deal.policyId) {
        actions.push(
          withReason("bind", "Open bound file", true, undefined, {
            href: deal.policyId ? `/policies/${deal.policyId}` : `/deals/${deal.id}#bind`,
          }),
        );
      } else {
        actions.push(
          withReason("bind", "Bind", true, undefined, {
            href: `/deals/${deal.id}#bind`,
          }),
        );
      }
    }
  }

  if (count !== 1) {
    actions.push(withReason("duplicate", "Duplicate", false, "Pick one row to duplicate."));
  } else if (!DUPLICATE_OK.includes(module)) {
    const reason =
      module === "policies"
        ? "Policies are written by bind — not copied."
        : module === "carriers"
          ? "Carriers are shared book reference — not copied."
          : "This module does not copy from the list.";
    actions.push(withReason("duplicate", "Duplicate", false, reason));
  } else if (locked) {
    actions.push(withReason("duplicate", "Duplicate", false, locked));
  } else {
    actions.push(withReason("duplicate", "Duplicate", true));
  }

  if (!MERGE_OK.includes(module)) {
    actions.push(withReason("merge", "Merge", false, "Merge is for Leads and Contacts."));
  } else if (count < 2) {
    actions.push(withReason("merge", "Merge", false, "Select 2 or more records to merge."));
  } else if (locked) {
    actions.push(withReason("merge", "Merge", false, locked));
  } else {
    actions.push(withReason("merge", count === 2 ? "Merge" : `Merge first two of ${count}`, true));
  }

  if (count === 0) {
    actions.push(withReason("email", "Email", false, "Select rows first."));
    actions.push(withReason("sms", "SMS", false, "Select rows first."));
  } else if (emails.length === 0) {
    actions.push(withReason("email", "Email", false, "No email on the selected rows."));
    if (phones.length === 0) {
      actions.push(withReason("sms", "SMS", false, "No phone on the selected rows."));
    } else {
      actions.push(withReason("sms", "SMS", true));
    }
  } else {
    actions.push(withReason("email", "Email", true));
    if (phones.length === 0) {
      actions.push(withReason("sms", "SMS", false, "No phone on the selected rows."));
    } else {
      actions.push(withReason("sms", "SMS", true));
    }
  }

  actions.push(
    withReason("call", "Call", false, "No live phone line — Connect later does not place a call."),
  );

  actions.push(
    count === 0
      ? withReason("print", "Print", false, "Select rows first.")
      : withReason("print", "Print", true),
  );

  if (!hasMacros) {
    actions.push(
      withReason("run_macro", "Run macro", false, "No macros for this list — open Settings → Macros"),
    );
  } else if (count === 0) {
    actions.push(withReason("run_macro", "Run macro", false, "Select rows, then run a macro."));
  } else {
    actions.push(withReason("run_macro", "Run macro", true));
  }

  if (!ARCHIVE_OK.includes(module)) {
    const reason =
      module === "policies"
        ? "Policies lapse or cancel on the file — not archived from the list."
        : module === "tasks"
          ? "Tasks complete or delete — no archive."
          : module === "businesses"
            ? "Businesses stay on the book — no archive column."
            : module === "carriers"
              ? "Carriers stay on the appetite book."
              : "Archive is not wired on this list.";
    actions.push(withReason("archive", "Archive", false, reason));
  } else if (count === 0) {
    actions.push(withReason("archive", "Archive", false, "Select rows to archive."));
  } else if (locked) {
    actions.push(withReason("archive", "Archive", false, locked));
  } else {
    actions.push(withReason("archive", "Archive", true));
  }

  if (module !== "tasks") {
    actions.push(
      withReason("delete", "Delete", false, "Hard delete is off on the live book — Archive or Merge."),
    );
  } else if (count === 0) {
    actions.push(withReason("delete", "Delete", false, "Select tasks to delete.", { variant: "destructive" }));
  } else {
    actions.push(withReason("delete", "Delete", true, undefined, { variant: "destructive" }));
  }

  return actions;
}

export function serializeSelectionRecord(row: SelectionRecord): SelectionRecord {
  return {
    ...row,
    archivedAt: row.archivedAt ? String(row.archivedAt) : null,
    boundAt: row.boundAt ? String(row.boundAt) : null,
  };
}

export function moduleListHref(module: CrmListModule): string {
  if (module === "businesses") return "/accounts";
  if (module === "carriers") return "/carriers";
  return `/${module}`;
}

export function recordDetailHref(module: CrmListModule, id: string): string {
  if (module === "businesses") return `/accounts/${id}`;
  if (module === "carriers") return `/carriers/${id}`;
  return `/${module}/${id}`;
}

export function asDevHubModule(module: CrmListModule): DevHubModule | null {
  return (DEV_HUB_MODULES as readonly string[]).includes(module) ? (module as DevHubModule) : null;
}
