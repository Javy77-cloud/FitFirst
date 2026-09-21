import Link from "next/link";
import { startByoOauth } from "@/app/actions/byo-oauth";
import { createContactFromInbox, logInboxThread, replyInboxThread, sendInboxMessage } from "@/app/actions/inbox";
import { InboxSplit } from "@/components/inbox/inbox-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatInboxListWhen, formatInboxWhen, inboxSenderLabel, snippetOf } from "@/lib/desk/inbox";
import { INBOX_BANDS, groupInboxThreads, type InboxDeskThread } from "@/lib/desk/inbox-desk";
import { inboxBandLabel, contactCreateHref } from "@/lib/desk/inbox-match";
import { inboxSkinListRole, resolveInboxSkin, type InboxMailProvider } from "@/lib/desk/inbox-skin";
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
  mailProvider = "gmail",
}: {
  threads: InboxDeskThread[];
  selectedId: string | null;
  messages: GmailThreadMessage[];
  canConnect: boolean;
  connected: boolean;
  error: string | null;
  accountEmail: string | null;
  mailProvider?: InboxMailProvider;
}) {
  const selected = threads.find((row) => row.id === selectedId) ?? threads[0] ?? null;
  const groups = groupInboxThreads(threads);
  const skin = resolveInboxSkin(mailProvider);

  if (!connected) {
    return (
      <section className="ff-inbox-empty" data-ff-inbox-disconnected="">
        <h2>Connect Gmail</h2>
        <p>FitFirst surfaces the agency mailbox here — reply, send, and jump into Contacts or Deals.</p>
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
    <div
      className="ff-inbox-desk"
      data-ff-inbox-desk=""
      data-ff-inbox-skin={skin}
      data-ff-inbox-provider={mailProvider}
      data-ff-inbox-list-role={inboxSkinListRole(skin)}
    >
      <header className="ff-inbox-toolbar">
        <p className="ff-inbox-mailbox">{accountEmail || "Inbox"}</p>
        <Link href="/settings/email#gmail" className="text-sm text-primary hover:underline">
          Settings
        </Link>
      </header>
      {error ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-navy">{error}</p>
      ) : null}
      {threads.length === 0 && !error ? (
        <p className="ff-inbox-empty-hero">Inbox is empty.</p>
      ) : null}
      <InboxSplit
        list={
          <div className="ff-inbox-bands">
            {INBOX_BANDS.map((band) => {
              const rows = groups[band];
              if (rows.length === 0) return null;
              return (
                <section key={band} className={cn("ff-inbox-band", `ff-inbox-band-${band}`)} data-ff-inbox-band={band}>
                  <header>
                    <h2>{inboxBandLabel(band)}</h2>
                    <span>{rows.length}</span>
                  </header>
                  <ul>
                    {rows.map((row) => {
                      const open = selected?.id === row.id;
                      return (
                        <li key={row.id}>
                          <Link
                            href={row.href}
                            className={cn("ff-inbox-row", row.unread && "is-unread", open && "is-selected")}
                            data-ff-inbox-thread={row.id}
                            data-ff-inbox-attention={row.attention}
                            aria-current={open ? "true" : undefined}
                          >
                            <span className="ff-inbox-row-from">
                              {inboxSenderLabel(row.from, row.match.contact?.name)}
                              {row.messageCount > 1 ? ` (${row.messageCount})` : ""}
                            </span>
                            <span className="ff-inbox-row-when">{formatInboxListWhen(row.lastInternalDate || row.date)}</span>
                            <span className="ff-inbox-row-subject">{row.subject}</span>
                            <span className="ff-inbox-row-snippet">{snippetOf(row.snippet, 88)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        }
        detail={
          selected ? (
            <article className="ff-inbox-detail" data-ff-inbox-detail={selected.id}>
              <h2>{selected.subject}</h2>
              <p className="text-sm text-muted-foreground">
                {inboxSenderLabel(selected.from, selected.match.contact?.name)} ·{" "}
                {formatInboxWhen(selected.lastInternalDate || selected.date)}
              </p>
              {selected.match.unmatched ? (
                <p className="mt-2 text-sm text-navy">No contact for this address yet.</p>
              ) : null}
              <ThreadActions thread={selected} />
              {messages.length > 0 ? (
                <ol className="ff-inbox-thread">
                  {messages.map((msg) => (
                    <li key={msg.id} className={cn("ff-inbox-msg", msg.inbound ? "is-in" : "is-out")}>
                      <p className="ff-inbox-msg-meta">
                        {msg.inbound ? "Inbound" : "Sent"} · {inboxSenderLabel(msg.from) || "Unknown"} ·{" "}
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
          ) : null
        }
      />
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
