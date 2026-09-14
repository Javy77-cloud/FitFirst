/** Unified Tasks list rows. Same columns as /tasks — no second board. */

import {
  DESK_TASK_TYPE_LABELS,
  TASK_DUE_BUCKET_LABELS,
  TASK_RECORD_TYPE_LABELS,
  isDeskTaskType,
  isTaskGroupBy,
  taskDueBucket,
  type TaskDueBucket,
  type TaskGroupBy,
  type TaskRecordType,
} from "@/lib/tasks/task-types";

export type DeskTaskRow = {
  id: string;
  title: string;
  due: Date;
  status: string;
  kind: string;
  source: "review" | "activity";
  recordType: TaskRecordType | null;
  recordName: string | null;
  /** Policy # when linked to a policy; otherwise null. */
  recordNumber: string | null;
  policyId: string | null;
  contactId: string | null;
  dealId: string | null;
  accountId: string | null;
  leadId: string | null;
  assigneeId: string | null;
  tags: string[];
};

export function mergeDeskTaskRows(input: {
  review: {
    id: string;
    title: string;
    dueDate: Date;
    status: string;
    kind: string;
    contactId?: string | null;
    accountId?: string | null;
    policyId?: string | null;
    dealId?: string | null;
    leadId?: string | null;
    assigneeId?: string | null;
    tags?: string[] | null;
  }[];
  activities: {
    id: string;
    title: string;
    dueAt: Date | null;
    startAt: Date | null;
    status: string;
    kind: string;
    contactId?: string | null;
    accountId?: string | null;
    policyId?: string | null;
    dealId?: string | null;
    leadId?: string | null;
  }[];
  names?: {
    contacts: Map<string, string>;
    accounts: Map<string, string>;
    policies: Map<string, { name: string; number: string }>;
    deals: Map<string, string>;
    leads: Map<string, string>;
  };
}): DeskTaskRow[] {
  const names = input.names ?? {
    contacts: new Map(),
    accounts: new Map(),
    policies: new Map(),
    deals: new Map(),
    leads: new Map(),
  };

  function linked(row: {
    policyId?: string | null;
    contactId?: string | null;
    dealId?: string | null;
    accountId?: string | null;
    leadId?: string | null;
  }): {
    recordType: TaskRecordType | null;
    recordName: string | null;
    recordNumber: string | null;
  } {
    if (row.policyId) {
      const pol = names.policies.get(row.policyId);
      return {
        recordType: "policy",
        recordName: pol?.name ?? null,
        recordNumber: pol?.number ?? null,
      };
    }
    if (row.dealId) {
      return {
        recordType: "deal",
        recordName: names.deals.get(row.dealId) ?? null,
        recordNumber: null,
      };
    }
    if (row.contactId) {
      return {
        recordType: "contact",
        recordName: names.contacts.get(row.contactId) ?? null,
        recordNumber: null,
      };
    }
    if (row.accountId) {
      return {
        recordType: "business",
        recordName: names.accounts.get(row.accountId) ?? null,
        recordNumber: null,
      };
    }
    if (row.leadId) {
      return {
        recordType: "lead",
        recordName: names.leads.get(row.leadId) ?? null,
        recordNumber: null,
      };
    }
    return { recordType: null, recordName: null, recordNumber: null };
  }

  const rows: DeskTaskRow[] = [
    ...input.review.map((row) => {
      const link = linked(row);
      return {
        id: row.id,
        title: row.title,
        due: row.dueDate,
        status: row.status,
        kind: row.kind,
        source: "review" as const,
        recordType: link.recordType,
        recordName: link.recordName,
        recordNumber: link.recordNumber,
        policyId: row.policyId ?? null,
        contactId: row.contactId ?? null,
        dealId: row.dealId ?? null,
        accountId: row.accountId ?? null,
        leadId: row.leadId ?? null,
        assigneeId: row.assigneeId ?? null,
        tags: Array.isArray(row.tags) ? row.tags : [],
      };
    }),
    ...input.activities.map((row) => {
      const link = linked(row);
      return {
        id: row.id,
        title: row.title,
        due: row.dueAt ?? row.startAt ?? new Date(0),
        status: row.status,
        kind: row.kind,
        source: "activity" as const,
        recordType: link.recordType,
        recordName: link.recordName,
        recordNumber: link.recordNumber,
        policyId: row.policyId ?? null,
        contactId: row.contactId ?? null,
        dealId: row.dealId ?? null,
        accountId: row.accountId ?? null,
        leadId: row.leadId ?? null,
        assigneeId: null,
        tags: [],
      };
    }),
  ];
  return rows.sort((a, b) => a.due.getTime() - b.due.getTime());
}

export function filterDeskTaskRows(
  rows: DeskTaskRow[],
  filter: { status?: string; kind?: string },
): DeskTaskRow[] {
  return rows.filter((row) => {
    if (filter.status && row.status !== filter.status) return false;
    if (filter.kind && row.kind !== filter.kind) return false;
    return true;
  });
}

export function taskTypeLabel(kind: string): string {
  if (isDeskTaskType(kind)) return DESK_TASK_TYPE_LABELS[kind];
  return kind.replaceAll("_", " ");
}

export function recordTypeLabel(type: TaskRecordType | null): string {
  if (!type) return "—";
  return TASK_RECORD_TYPE_LABELS[type];
}

export type TaskGroupSection = {
  key: string;
  label: string;
  rows: DeskTaskRow[];
};

function groupKeyAndLabel(
  row: DeskTaskRow,
  mode: TaskGroupBy,
  now: Date,
): { key: string; label: string } {
  if (mode === "task_type") {
    return { key: row.kind || "other", label: taskTypeLabel(row.kind) };
  }
  if (mode === "due") {
    const bucket = taskDueBucket(row.due, now);
    return { key: bucket, label: TASK_DUE_BUCKET_LABELS[bucket] };
  }
  // Group by linked record id — never row.id (that made every task its own section).
  if (row.policyId) {
    return { key: `policy:${row.policyId}`, label: row.recordName || "Policy" };
  }
  if (row.dealId) {
    return {
      key: `deal:${row.dealId}`,
      label: row.recordName
        ? `${recordTypeLabel("deal")} · ${row.recordName}`
        : recordTypeLabel("deal"),
    };
  }
  if (row.contactId) {
    return {
      key: `contact:${row.contactId}`,
      label: row.recordName
        ? `${recordTypeLabel("contact")} · ${row.recordName}`
        : recordTypeLabel("contact"),
    };
  }
  if (row.accountId) {
    return {
      key: `business:${row.accountId}`,
      label: row.recordName
        ? `${recordTypeLabel("business")} · ${row.recordName}`
        : recordTypeLabel("business"),
    };
  }
  if (row.leadId) {
    return {
      key: `lead:${row.leadId}`,
      label: row.recordName
        ? `${recordTypeLabel("lead")} · ${row.recordName}`
        : recordTypeLabel("lead"),
    };
  }
  return { key: "unlinked", label: "No linked record" };
}

export function groupDeskTaskRows(
  rows: DeskTaskRow[],
  groupBy: string | null | undefined,
  now = new Date(),
): TaskGroupSection[] {
  const mode: TaskGroupBy = isTaskGroupBy(groupBy) ? groupBy : "policy";
  const map = new Map<string, TaskGroupSection>();

  for (const row of rows) {
    const { key, label } = groupKeyAndLabel(row, mode, now);
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(key, { key, label, rows: [row] });
    }
  }

  const sections = [...map.values()];
  if (mode === "due") {
    const order: TaskDueBucket[] = ["overdue", "today", "this_week", "later"];
    sections.sort((a, b) => order.indexOf(a.key as TaskDueBucket) - order.indexOf(b.key as TaskDueBucket));
  } else {
    sections.sort((a, b) => a.label.localeCompare(b.label));
  }
  return sections;
}
