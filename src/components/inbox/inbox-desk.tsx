import Link from "next/link";
import { startByoOauth } from "@/app/actions/byo-oauth";
import { createContactFromInbox, logInboxThread, replyInboxThread, sendInboxMessage } from "@/app/actions/inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatInboxWhen } from "@/lib/desk/inbox";
import { INBOX_BANDS, type InboxDeskThread } from "@/lib/desk/inbox-desk";
import { inboxBandLabel, contactCreateHref } from "@/lib/desk/inbox-match";
import type { GmailThreadMessage } from "@/lib/integrations/gmail";
import { cn } from "@/lib/utils";

function ReplyForm({ thread }: { thread: InboxDeskThread }) {
  const replyTo = thread.match.emails[0] || thread.from;
  return (
    <form action={replyInboxThread} className="ff-inbox-compose" data-ff-inbox-reply="">
      <input type="hidden" name="threadId" value={thread.id} />
      <input type="hidden" name="inReplyTo" value={thread.messageIdHeader} />
      <input type="hidden" name="references" value={thread.references} />
      <input type="hidden" name="subject" value={thread.subject} />
      <label className="text-xs font-semibold text-navy">
        To
        <Input name="to" defaultValue={replyTo} className="mt-1 h-8" required />
      </label>
      <label className="text-xs font-semibold text-navy">
        Reply
        <Textarea name="body" rows={4} className="mt-1" required placeholder="Keep it short. This sends from the agency Gmail." />
      </label>
      <Button type="submit" size="sm">
        Send reply
      </Button>
    </form>
  );
}

function ThreadActions({ thread }: { thread: InboxDeskThread }) {
  return (
    <div className="ff-inbox-actions">
      {thread.match.contact ? (
        <Link href={`/contacts/${thread.match.contact.id}`} className="ff-panel-primary">
          Open contact
        </Link>
      ) : (
        <form action={createContactFromInbox}>
          <input type="hidden" name="threadId" value={thread.id} />
          <input type="hidden" name="from" value={thread.from} />
          <button type="submit" className="ff-panel-primary">
            Create contact
          </button>
        </form>
      )}
      {thread.match.deal ? (
        <Link href={`/deals/${thread.match.deal.id}`} className="ff-panel-ghost">
          Open deal
        </Link>
      ) : null}
      {thread.match.renewal ? (
        <Link href={`/policies/${thread.match.renewal.policyId}`} className="ff-panel-ghost">
          Open renewal
        </Link>
      ) : null}
      {thread.match.contact || thread.match.deal || thread.match.renewal ? (
        <form action={logInboxThread}>
          <input type="hidden" name="threadId" value={thread.id} />
          <input type="hidden" name="subject" value={thread.subject} />
          {thread.match.contact ? <input type="hidden" name="contactId" value={thread.match.contact.id} /> : null}
          {thread.match.deal ? <input type="hidden" name="dealId" value={thread.match.deal.id} /> : null}
          {thread.match.renewal ? <input type="hidden" name="policyId" value={thread.match.renewal.policyId} /> : null}
          <button type="submit" className="ff-panel-ghost">
            Log to activity
          </button>
        </form>
      ) : (
        <Link href={contactCreateHref(thread.match.emails[0] ?? "", thread.from)} className="ff-panel-ghost">
          Link or create contact
        </Link>
      )}
    </div>
  );
}

export function InboxDesk({
  threads,
  selectedId,
  messages,
  canConnect,
  connected,
  error,
  accountEmail,
}: {
  threads: InboxDeskThread[];
  selectedId: string | null;
  messages: GmailThreadMessage[];
  canConnect: boolean;
  connected: boolean;
  error: string | null;
  accountEmail: string | null;
}) {
  const selected = threads.find((row) => row.id === selectedId) ?? threads[0] ?? null;

  if (!connected) {
    return (
      <section className="ff-inbox-empty" data-ff-inbox-disconnected="">
        <p className="ff-inbox-kicker">Agency Gmail</p>
        <h2>Connect the mailbox the desk works from</h2>
        <p>
          FitFirst does not host mail. It surfaces the agency Gmail on this desk — threads, reply, and
          jumps into Contacts and Deals.
        </p>
        {canConnect ? (
          <form action={startByoOauth} className="mt-3">
            <input type="hidden" name="provider" value="gmail" />
            <input type="hidden" name="next" value="/inbox" />
            <Button type="submit">Connect Gmail</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-navy">Ask an Admin to connect Gmail under Settings → Email.</p>
        )}
        <Link href="/settings/email#gmail" className="mt-2 inline-block text-sm text-primary hover:underline">
          Settings → Email
        </Link>
      </section>
    );
  }

  return (
    <div className="ff-inbox-desk" data-ff-inbox-desk="">
      <header className="ff-inbox-toolbar">
        <div>
          <p className="ff-inbox-kicker">Agency inbox</p>
          <p className="text-sm text-muted-foreground">
            {accountEmail ? `Working ${accountEmail}` : "Connected Gmail"} · reply sends from this mailbox
          </p>
        </div>
        <Link href="/settings/email#gmail" className="text-sm text-primary hover:underline">
          Email settings
        </Link>
      </header>
      {error ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-navy">{error}</p>
      ) : null}
      {threads.length === 0 && !error ? (
        <p className="ff-inbox-empty-hero">Inbox is quiet. New agency mail lands in Needs reply and Unread.</p>
      ) : null}
      <div className="ff-inbox-split">
        <div className="ff-inbox-bands">
          {INBOX_BANDS.map((band) => {
            const rows = threads.filter((row) => row.attention === band);
            if (rows.length === 0) return null;
            return (
              <section key={band} className={cn("ff-inbox-band", `ff-inbox-band-${band}`)} data-ff-inbox-band={band}>
                <header>
                  <h2>{inboxBandLabel(band)}</h2>
                  <span>{rows.length}</span>
                </header>
                <ul>
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className={cn("ff-inbox-card", selected?.id === row.id && "is-open")}
                        data-ff-inbox-thread={row.id}
                        data-ff-inbox-attention={row.attention}
                      >
                        <span className="ff-inbox-card-kicker">
                          {row.unread ? "Unread" : row.inboundLast ? "Needs you" : "Linked"}
                          {row.match.deal ? " · Open deal" : row.match.contact ? ` · ${row.match.contact.name}` : ""}
                        </span>
                        <span className="ff-inbox-card-from">{row.from || "Unknown sender"}</span>
                        <span className="ff-inbox-card-subject">{row.subject}</span>
                        <span className="ff-inbox-card-snippet">{row.snippet}</span>
                        <span className="ff-inbox-card-when">{formatInboxWhen(row.lastInternalDate || row.date)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        {selected ? (
          <article className="ff-inbox-detail" data-ff-inbox-detail={selected.id}>
            <p className="ff-inbox-kicker">{selected.why}</p>
            <h2>{selected.subject}</h2>
            <p className="text-sm text-muted-foreground">
              {selected.from} · {formatInboxWhen(selected.lastInternalDate || selected.date)}
            </p>
            {selected.match.unmatched ? (
              <p className="mt-2 text-sm text-navy">No contact for this address yet.</p>
            ) : null}
            <ThreadActions thread={selected} />
            {messages.length > 0 ? (
              <ol className="ff-inbox-thread">
                {messages.map((msg) => (
                  <li key={msg.id} className={cn("ff-inbox-msg", msg.inbound ? "is-in" : "is-out")}>
                    <p className="ff-inbox-card-kicker">
                      {msg.inbound ? "Inbound" : "Sent"} · {msg.from || "Unknown"} ·{" "}
                      {formatInboxWhen(msg.internalDate || msg.date)}
                    </p>
                    <p className="ff-inbox-body">{msg.body || msg.snippet}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="ff-inbox-body">{selected.snippet}</p>
            )}
            <ReplyForm thread={selected} />
          </article>
        ) : null}
      </div>
      <form action={sendInboxMessage} className="ff-inbox-compose ff-inbox-new" data-ff-inbox-compose="">
        <p className="text-sm font-semibold text-navy">New message</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="to" type="email" placeholder="client@email.com" required />
          <Input name="subject" placeholder="Subject" />
        </div>
        <Textarea name="body" rows={3} placeholder="Send from the connected agency Gmail." required />
        <Button type="submit" size="sm" variant="outline">
          Send
        </Button>
      </form>
    </div>
  );
}
