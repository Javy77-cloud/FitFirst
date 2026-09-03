import { createRecordAsk, resolveRecordAsk } from "@/app/actions/record-asks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentDeskSession } from "@/lib/auth/session";
import type { RecordAsk, User } from "@/lib/db/schema";

export async function RecordAskPanel({
  entityType,
  entityId,
  asks,
  users,
  contactId,
  accountId,
  policyId,
  dealId,
  leadId,
}: {
  entityType: string;
  entityId: string;
  asks: RecordAsk[];
  users: User[];
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}) {
  const session = await currentDeskSession();
  const names = new Map(users.map((u) => [u.id, u.name]));
  return (
    <div className="mt-4 rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold text-navy">Ask a teammate</h3>
      <p className="text-[11px] text-muted-foreground">
        Tag someone for status. In-app ping + log on this record. Not a chat product.
      </p>
      {session.isAdmin ? (
        <form action={createRecordAsk} className="mt-2 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />
          {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
          {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
          {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
          {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
          {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
          <div>
            <Label className="text-xs">Tag</Label>
            <select name="assigneeId" required className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              <option value="">Choose person</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Ask</Label>
            <Input name="body" required className="mt-1 h-8" placeholder="What's the status on this?" />
          </div>
          <Button type="submit" size="sm">
            Tag and log
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Only an admin can tag a teammate.</p>
      )}
      {asks.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No asks on this record.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {asks.map((ask) => (
            <li key={ask.id} className="rounded-md bg-secondary/50 px-2 py-1.5 text-sm">
              <span className="text-[11px] uppercase text-muted-foreground">{ask.status}</span>
              <p>
                @{names.get(ask.assigneeId ?? "") ?? "teammate"} — {ask.body}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Asked by {names.get(ask.authorId) ?? "admin"}
              </p>
              {ask.status === "open" ? (
                <form action={resolveRecordAsk} className="mt-1">
                  <input type="hidden" name="askId" value={ask.id} />
                  <Button type="submit" size="xs" variant="ghost">
                    Resolve
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
