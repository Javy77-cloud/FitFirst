import { notFound, redirect } from "next/navigation";
import { completeDeskActivity, updateDeskActivity } from "@/app/actions/activities-desk";
import { updateReviewTask } from "@/app/actions/alerts";
import { AppShell } from "@/components/app-shell";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StagePill } from "@/components/fit-badge";
import { ACTIVITY_KIND_LABEL, formatDay, type ActivityKind } from "@/lib/domain";
import { getActivityRecord, getReviewTaskRecord, loadRecordContext } from "@/lib/record-context";

export async function ActivityRecordPage({
  id,
  expectKind,
}: {
  id: string;
  expectKind?: "task" | "meeting";
}) {
  const row = await getActivityRecord(id);
  if (row) {
    if (expectKind === "meeting" && row.activity.kind !== "meeting") notFound();
    if (expectKind === "task" && row.activity.kind === "meeting") {
      redirect(`/meetings/${id}`);
    }
    const { activity, contact, lead, deal, policy, account, events } = row;
    const context = await loadRecordContext({
      contactId: activity.contactId,
      leadId: activity.leadId,
      dealId: activity.dealId,
      policyId: activity.policyId,
      accountId: activity.accountId,
    });
    const kindLabel =
      ACTIVITY_KIND_LABEL[activity.kind as ActivityKind] ?? activity.kind.replaceAll("_", " ");
    const open = activity.status !== "completed" && activity.status !== "cancelled";

    return (
      <AppShell
        title={activity.title}
        eyebrow={kindLabel}
        actions={
          open ? (
            <form action={completeDeskActivity}>
              <input type="hidden" name="activityId" value={activity.id} />
              <Button type="submit" size="sm">
                Close {kindLabel.toLowerCase()}
              </Button>
            </form>
          ) : null
        }
      >
        <RecordDetailLayout
          main={
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StagePill stage={activity.status} />
                <span className="uppercase text-muted-foreground">{activity.kind}</span>
                {activity.assignee ? (
                  <span className="text-muted-foreground">Owner {activity.assignee}</span>
                ) : null}
              </div>
              <section className="ff-card p-4">
                <h2 className="text-base font-semibold text-navy">Overview</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-caption uppercase text-muted-foreground">Due / start</dt>
                    <dd>{formatDay(activity.dueAt ?? activity.startAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-caption uppercase text-muted-foreground">End</dt>
                    <dd>{formatDay(activity.endAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-caption uppercase text-muted-foreground">Status</dt>
                    <dd className="capitalize">{activity.status.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-caption uppercase text-muted-foreground">Related to</dt>
                    <dd className="space-x-2">
                      {contact ? (
                        <RecordLink href={`/contacts/${contact.id}`}>
                          {contact.lastName}, {contact.firstName}
                        </RecordLink>
                      ) : null}
                      {lead ? (
                        <RecordLink href={`/leads/${lead.id}`}>
                          Lead {lead.lastName}, {lead.firstName}
                        </RecordLink>
                      ) : null}
                      {deal ? <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink> : null}
                      {policy ? (
                        <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                      ) : null}
                      {account ? (
                        <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink>
                      ) : null}
                      {!contact && !lead && !deal && !policy && !account ? "—" : null}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <div className="text-caption uppercase text-muted-foreground">Description</div>
                  <p className="mt-1 whitespace-pre-wrap text-base text-muted-foreground">
                    {activity.notes ?? "No notes."}
                  </p>
                </div>
                <form action={updateDeskActivity} className="mt-4 space-y-2 border-t border-border pt-3">
                  <input type="hidden" name="activityId" value={activity.id} />
                  <h3 className="text-sm font-semibold text-navy">Edit</h3>
                  <label className="block text-helper text-muted-foreground">
                    Title
                    <Input name="title" required defaultValue={activity.title} className="mt-1 h-8" />
                  </label>
                  <label className="block text-helper text-muted-foreground">
                    Notes
                    <Input name="notes" defaultValue={activity.notes ?? ""} className="mt-1 h-8" />
                  </label>
                  <label className="block text-helper text-muted-foreground">
                    Due
                    <Input
                      name="dueAt"
                      type="datetime-local"
                      defaultValue={
                        activity.dueAt ? new Date(activity.dueAt).toISOString().slice(0, 16) : ""
                      }
                      className="mt-1 h-8"
                    />
                  </label>
                  <Button type="submit" size="sm" variant="secondary">
                    Save changes
                  </Button>
                </form>
              </section>
              <section className="ff-card overflow-hidden">
                <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
                  Timeline
                </div>
                {events.length === 0 ? (
                  <p className="px-4 py-6 text-base text-muted-foreground">No log on this item yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {events.map((event) => (
                      <li key={event.id} className="px-4 py-3">
                        <div className="text-sm font-medium text-navy">
                          {event.eventType} · {event.kind}
                        </div>
                        <p className="text-base text-muted-foreground">{event.body}</p>
                        <div className="text-helper text-muted-foreground">{formatDay(event.occurredAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          }
          rail={<RecordContextRail context={context} />}
        />
      </AppShell>
    );
  }

  if (expectKind === "meeting") notFound();

  const review = await getReviewTaskRecord(id);
  if (!review) notFound();
  const { task, contact, deal, policy, account } = review;
  const context = await loadRecordContext({
    contactId: task.contactId,
    dealId: task.dealId,
    policyId: task.policyId,
    accountId: task.accountId,
  });

  return (
    <AppShell title={task.title} eyebrow="Review task">
      <RecordDetailLayout
        main={
          <section className="ff-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StagePill stage={task.status} />
              <span className="uppercase text-muted-foreground">{task.kind.replaceAll("_", " ")}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-caption uppercase text-muted-foreground">Due</dt>
                <dd>{formatDay(task.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-caption uppercase text-muted-foreground">Status</dt>
                <dd>{task.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-caption uppercase text-muted-foreground">Related to</dt>
                <dd className="space-x-2">
                  {contact ? (
                    <RecordLink href={`/contacts/${contact.id}`}>
                      {contact.lastName}, {contact.firstName}
                    </RecordLink>
                  ) : null}
                  {deal ? <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink> : null}
                  {policy ? (
                    <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  ) : null}
                  {account ? <RecordLink href={`/accounts/${account.id}`}>{account.name}</RecordLink> : null}
                  {!contact && !deal && !policy && !account ? "—" : null}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-base text-muted-foreground">
              Desk 30/60/90 review item. Activity logs on Contact and Policy stay on those records.
            </p>
            <form action={updateReviewTask} className="mt-4 space-y-2 border-t border-border pt-3">
              <input type="hidden" name="taskId" value={task.id} />
              <h3 className="text-sm font-semibold text-navy">Edit</h3>
              <label className="block text-helper text-muted-foreground">
                Title
                <Input name="title" required defaultValue={task.title} className="mt-1 h-8" />
              </label>
              <label className="block text-helper text-muted-foreground">
                Status
                <select
                  name="status"
                  defaultValue={task.status}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="open">open</option>
                  <option value="done">done</option>
                </select>
              </label>
              <label className="block text-helper text-muted-foreground">
                Due
                <Input
                  name="dueDate"
                  type="date"
                  defaultValue={task.dueDate.toISOString().slice(0, 10)}
                  className="mt-1 h-8"
                />
              </label>
              <Button type="submit" size="sm" variant="secondary">
                Save changes
              </Button>
            </form>
          </section>
        }
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}

