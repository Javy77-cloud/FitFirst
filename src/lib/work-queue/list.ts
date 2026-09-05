import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  contacts,
  policies,
  policyWorkFlags,
  policyWorkItems,
  policyWorkNotes,
  reviewTasks,
  users,
} from "@/lib/db/schema";
import { WORK_REMINDER_KIND } from "./types";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export async function getPolicyWorkBundle(policyId: string) {
  const [item] = await db
    .select()
    .from(policyWorkItems)
    .where(and(eq(policyWorkItems.tenantId, tenant()), eq(policyWorkItems.policyId, policyId)));

  const [flags, notes, reminders, deskUsers] = await Promise.all([
    item
      ? db
          .select()
          .from(policyWorkFlags)
          .where(eq(policyWorkFlags.workItemId, item.id))
          .orderBy(desc(policyWorkFlags.createdAt))
      : Promise.resolve([]),
    item
      ? db
          .select({ note: policyWorkNotes, author: users })
          .from(policyWorkNotes)
          .leftJoin(users, eq(policyWorkNotes.authorId, users.id))
          .where(eq(policyWorkNotes.workItemId, item.id))
          .orderBy(desc(policyWorkNotes.createdAt))
      : Promise.resolve([]),
    db
      .select()
      .from(reviewTasks)
      .where(
        and(
          eq(reviewTasks.tenantId, tenant()),
          eq(reviewTasks.policyId, policyId),
          eq(reviewTasks.status, "open"),
        ),
      )
      .orderBy(asc(reviewTasks.dueDate)),
    db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenant()))
      .orderBy(asc(users.name)),
  ]);

  return {
    item: item ?? null,
    flags,
    notes,
    reminders,
    users: deskUsers,
  };
}

export type DeskWorkRow = {
  item: typeof policyWorkItems.$inferSelect;
  policy: typeof policies.$inferSelect;
  contact: typeof contacts.$inferSelect | null;
  account: typeof accounts.$inferSelect | null;
  assignee: typeof users.$inferSelect | null;
  flags: (typeof policyWorkFlags.$inferSelect)[];
  latestNote: string | null;
  openReminders: number;
};

export async function listDeskWorkQueue(): Promise<DeskWorkRow[]> {
  const items = await db
    .select({
      item: policyWorkItems,
      policy: policies,
      contact: contacts,
      account: accounts,
      assignee: users,
    })
    .from(policyWorkItems)
    .innerJoin(policies, eq(policyWorkItems.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(users, eq(policyWorkItems.assigneeId, users.id))
    .where(eq(policyWorkItems.tenantId, tenant()))
    .orderBy(desc(policyWorkItems.updatedAt));

  const workItemIds = items.map((row) => row.item.id);
  const policyIds = items.map((row) => row.policy.id);
  const [flags, notes, reminders] = await Promise.all([
    workItemIds.length
      ? db
          .select()
          .from(policyWorkFlags)
          .where(and(eq(policyWorkFlags.tenantId, tenant()), isNull(policyWorkFlags.clearedAt)))
      : Promise.resolve([]),
    workItemIds.length
      ? db
          .select()
          .from(policyWorkNotes)
          .where(eq(policyWorkNotes.tenantId, tenant()))
          .orderBy(desc(policyWorkNotes.createdAt))
      : Promise.resolve([]),
    policyIds.length
      ? db
          .select()
          .from(reviewTasks)
          .where(
            and(
              eq(reviewTasks.tenantId, tenant()),
              eq(reviewTasks.status, "open"),
              eq(reviewTasks.kind, WORK_REMINDER_KIND),
            ),
          )
      : Promise.resolve([]),
  ]);

  return items.map((row) => {
    const openFlags = flags.filter((flag) => flag.workItemId === row.item.id);
    const latest = notes.find((note) => note.workItemId === row.item.id);
    return {
      ...row,
      flags: openFlags,
      latestNote: latest?.body ?? null,
      openReminders: reminders.filter((task) => task.policyId === row.policy.id).length,
    };
  });
}
