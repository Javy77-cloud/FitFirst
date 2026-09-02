import Link from "next/link";
import { notFound } from "next/navigation";
import { addContactNote, updateContact } from "@/app/actions/crm";
import { AppShell } from "@/components/app-shell";
import { CompleteTaskForm } from "@/components/crm/complete-task-form";
import { ExpirationBadge } from "@/components/crm/expiration-badge";
import { StagePill } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/domain";
import { formatIsoDate, formatTenure, taskKindLabel } from "@/lib/crm/display";
import { getContactWorkspace } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getContactWorkspace(id);
  if (!workspace) notFound();
  const { contact, policies, history, tasks, deals } = workspace;
  const openTasks = tasks.filter((task) => task.status === "open");

  return (
    <AppShell title={`${contact.lastName}, ${contact.firstName}`}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="ff-card p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Policy count</div>
          <div className="text-2xl font-semibold text-navy">{contact.policyCount}</div>
        </div>
        <div className="ff-card p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Tenure</div>
          <div className="text-2xl font-semibold text-navy">{formatTenure(contact.tenureStart)}</div>
          <div className="text-xs text-muted-foreground">
            Start {formatIsoDate(contact.tenureStart)}
          </div>
        </div>
        <div className="ff-card p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Open reviews</div>
          <div className="text-2xl font-semibold text-navy">{openTasks.length}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="ff-card overflow-x-auto">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Policies
            </div>
            {policies.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No policies on this contact. Bind a shopping deal to write the first one.
              </p>
            ) : (
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Line</th>
                    <th>Carrier</th>
                    <th>Premium</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map(({ policy, carrier }) => (
                    <tr key={policy.id}>
                      <td>
                        <Link
                          href={`/policies/${policy.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {policy.policyNumber}
                        </Link>
                      </td>
                      <td>{policy.lineOfBusiness}</td>
                      <td>{carrier?.name ?? "—"}</td>
                      <td>{formatMoney(policy.premium)}</td>
                      <td>
                        <ExpirationBadge date={policy.expirationDate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              30 / 60 / 90 and expiration
            </div>
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Review tasks appear after bind.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {taskKindLabel(task.kind)} · due {formatIsoDate(task.dueDate)} · {task.status}
                      </div>
                    </div>
                    {task.status === "open" ? <CompleteTaskForm taskId={task.id} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Client history
            </div>
            {history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ol className="divide-y divide-border">
                {history.map((event) => (
                  <li key={event.id} className="px-4 py-3">
                    <div className="text-[11px] uppercase text-muted-foreground">
                      {event.eventType.replaceAll("_", " ")} · {formatIsoDate(event.occurredAt)}
                    </div>
                    <p className="mt-0.5 text-sm">{event.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {deals.length > 0 ? (
            <section className="ff-card overflow-x-auto">
              <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
                Related deals
              </div>
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Stage</th>
                    <th>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      <td>
                        <Link href={`/deals/${deal.id}`} className="text-primary hover:underline">
                          {deal.title}
                        </Link>
                      </td>
                      <td>
                        <StagePill stage={deal.pipelineStage} />
                      </td>
                      <td>{deal.lineOfBusiness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <form action={updateContact} className="ff-card space-y-3 p-4">
            <input type="hidden" name="contactId" value={contact.id} />
            <h2 className="text-sm font-semibold text-navy">Contact + CRM notes</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <Label className="text-xs">First name</Label>
                <Input name="firstName" defaultValue={contact.firstName} required className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Last name</Label>
                <Input name="lastName" defaultValue={contact.lastName} required className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input name="phone" defaultValue={contact.phone ?? ""} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input name="email" type="email" defaultValue={contact.email ?? ""} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Mailing address</Label>
                <Input
                  name="mailingAddress"
                  defaultValue={contact.mailingAddress ?? ""}
                  className="mt-1 h-8"
                />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input name="city" defaultValue={contact.city ?? ""} className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Life notes (CRM only)</Label>
                <Textarea
                  name="lifeNotes"
                  defaultValue={contact.lifeNotes ?? ""}
                  className="mt-1 min-h-16"
                  placeholder="No life rating — desk notes only."
                />
              </div>
              <div>
                <Label className="text-xs">Health notes (CRM only)</Label>
                <Textarea
                  name="healthNotes"
                  defaultValue={contact.healthNotes ?? ""}
                  className="mt-1 min-h-16"
                  placeholder="No health rating — desk notes only."
                />
              </div>
              <div>
                <Label className="text-xs">Book notes</Label>
                <Textarea name="notes" defaultValue={contact.notes ?? ""} className="mt-1 min-h-16" />
              </div>
            </div>
            <Button type="submit" size="sm">
              Save contact
            </Button>
          </form>

          <form action={addContactNote} className="ff-card space-y-3 p-4">
            <input type="hidden" name="contactId" value={contact.id} />
            <h2 className="text-sm font-semibold text-navy">Add history note</h2>
            <Textarea name="body" required className="min-h-20" placeholder="Call, endorsement, referral…" />
            <Button type="submit" size="sm" variant="outline">
              Log note
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
