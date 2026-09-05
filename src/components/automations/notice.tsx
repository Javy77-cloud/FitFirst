import { StubBanner } from "@/components/ops/stub-banner";

const COPY: Record<string, string> = {
  "automation-saved": "Automation saved. Rules stay on this desk — nothing emails a client yet.",
  "notify-preview":
    "In-app notify preview posted to Alerts. The agent sees it in the desk. Nothing left FitFirst.",
  "sms-would-send":
    "Bulk SMS logged “would send”. No number was purchased and no text left this desk.",
  "signature-draft": "Signature draft saved. Submit it so Admin can approve it live.",
  "signature-submitted": "Signature is in the Admin approval queue. It is not live yet.",
  "signature-approved": "Signature is live. Agents can use this close on client mail.",
  "signature-rejected": "Signature sent back. The agent can edit and resubmit.",
  "sequence-on":
    "Sequence is on. Tasks and email templates stay stubs — nothing emails the client.",
  "sequence-off": "Sequence is off. The catalog stays; no new Task or email stub will queue.",
  saved: "Saved on this desk.",
  created: "Created.",
  deleted: "Deleted.",
  ran: "Test ran. Check the execution log.",
  revoked: "API key revoked.",
  inbound: "Inbound slug saved.",
  "inbound-deleted": "Inbound slug removed.",
  test: "Webhook test queued.",
};

export function AutomationsNotice({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  if (error) {
    return (
      <p className="mb-3 rounded-md border border-[var(--ff-red)]/30 bg-[var(--ff-red-bg)] px-3 py-2 text-sm">
        {error}
      </p>
    );
  }
  if (!notice) return null;
  const text = COPY[notice];
  if (!text) return <StubBanner>{notice}</StubBanner>;
  return (
    <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
      {text}
    </p>
  );
}
