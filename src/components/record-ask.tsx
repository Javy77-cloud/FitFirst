import { createRecordAsk, resolveRecordAsk } from "@/app/actions/record-asks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentDeskSession } from "@/lib/auth/session";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { listRecordAsks } from "@/lib/db/queries";
import type { RecordAsk, User } from "@/lib/db/schema";

type AskProps = {
  entityType: string;
  entityId: string;
  asks?: RecordAsk[];
  users?: User[];
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  /** Always hidden for agents. Kept so Contact / Business callers stay typed. */
  hideWhenNotAdmin?: boolean;
  framed?: boolean;
};

/** Ask a teammate — Admin only. Hidden for agents on every record. */
export async function RecordAskPanel({
  entityType,
  entityId,
  asks: asksProp,
  users: usersProp,
  contactId,
  accountId,
  policyId,
  dealId,
  leadId,
  hideWhenNotAdmin = true,
  framed = true,
}: AskProps) {
  const session = await currentDeskSession();
  if (!session.isAdmin && hideWhenNotAdmin) return null;
  const [asks, users] = await Promise.all([
    asksProp ? Promise.resolve(asksProp) : listRecordAsks(entityType, entityId),
    usersProp ? Promise.resolve(usersProp) : listDeskUsers(),
  ]);
  const names = new Map(users.map((user) => [user.id, user.name]));

  return (
    <section className={framed ? "ff-card mt-4 p-4" : ""}>
      {framed ? (
        <>
          <h2 className="text-sm font-semibold text-navy">Ask a teammate</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Admin only. Tag someone from the dropdown (required). Typing a name does not submit.
            In-app ping + durable log. Not a chat product.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tag someone from the dropdown (required). Typing a name does not submit. In-app ping +
          durable log. Not a chat product.
        </p>
      )}
      <form action={createRecordAsk} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />
        {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
        {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
        {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        <div>
          <Label className="text-xs">Tag</Label>
          <select
            name="assigneeId"
            required
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Choose person
            </option>
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
                Asked by {names.get(ask.authorId ?? "") ?? "admin"}
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
    </section>
  );
}

export const AskOnRecord = RecordAskPanel;
