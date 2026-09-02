import Link from "next/link";
import { notFound } from "next/navigation";
import { updateContactTags } from "@/app/actions/contacts-ops";
import { AppShell } from "@/components/app-shell";
import { ActivityForm } from "@/components/ops/activity-form";
import { DocumentTable, EntityUpload } from "@/components/ops/entity-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContactWorkspace, listRelatedOptions } from "@/lib/db/ops-queries";
import { formatWhen, kindClass } from "@/lib/ops/calendar";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getContactWorkspace(id);
  if (!workspace) notFound();
  const related = await listRelatedOptions();
  const { contact, docs, activities, policies, deals } = workspace;

  return (
    <AppShell title={`${contact.lastName}, ${contact.firstName}`}>
      <p className="mb-3 text-sm text-muted-foreground">
        {contact.city ? `${contact.city}, ${contact.state}` : "No mailing city"} · {contact.policyCount}{" "}
        policies
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Tags (campaign audience)</h2>
          <form action={updateContactTags} className="flex gap-2">
            <input type="hidden" name="contactId" value={contact.id} />
            <Input
              name="tags"
              defaultValue={(contact.tags ?? []).join(", ")}
              className="h-8"
              placeholder="ho3, renewal-watch"
            />
            <Button type="submit" size="sm">
              Save tags
            </Button>
          </form>
          <div>
            <Label className="text-xs">Documents</Label>
            <div className="mt-2">
              <EntityUpload contactId={contact.id} />
            </div>
            <div className="mt-3">
              <DocumentTable docs={docs} returnTo={`/contacts/${contact.id}`} />
            </div>
          </div>
        </section>
        <section className="space-y-4">
          <div className="ff-card p-4">
            <h2 className="mb-2 text-sm font-semibold text-navy">Activity</h2>
            <ActivityForm
              related={related}
              defaults={{ kind: "task", contactId: contact.id }}
              returnTo={`/contacts/${contact.id}`}
              submitLabel="Add task or meeting"
            />
            {activities.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No tasks, calls, or meetings yet.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {activities.map((a) => (
                  <li key={a.id}>
                    <Link href={`/calendar?activity=${a.id}`} className="text-sm hover:underline">
                      <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${kindClass(a.kind)}`}>
                        {a.kind}
                      </span>
                      {a.title} · {formatWhen(a)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="ff-card p-4 text-sm">
            <h2 className="mb-2 text-sm font-semibold text-navy">Related</h2>
            <div className="space-y-1">
              {deals.map((d) => (
                <div key={d.id}>
                  Deal:{" "}
                  <Link href={`/deals/${d.id}`} className="text-primary hover:underline">
                    {d.title}
                  </Link>
                </div>
              ))}
              {policies.map((p) => (
                <div key={p.id}>
                  Policy:{" "}
                  <Link href={`/policies/${p.id}`} className="text-primary hover:underline">
                    {p.policyNumber}
                  </Link>
                </div>
              ))}
              {deals.length === 0 && policies.length === 0 ? (
                <p className="text-muted-foreground">No bound policy or open deal on this contact.</p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
