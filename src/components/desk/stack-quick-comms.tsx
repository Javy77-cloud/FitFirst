"use client";

import { useState, type FormEvent } from "react";
import { logStackTouch } from "@/app/actions/stack-touch";

type TouchKind = "email" | "sms";

export function StackQuickComms({
  name,
  email,
  phone,
  leadId,
  dealId,
  policyId,
  contactId,
  accountId,
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TouchKind>("email");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [logged, setLogged] = useState<TouchKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const data = new FormData();
    data.set("kind", kind);
    data.set("name", name);
    data.set("body", note);
    if (email) data.set("email", email);
    if (phone) data.set("phone", phone);
    if (leadId) data.set("leadId", leadId);
    if (dealId) data.set("dealId", dealId);
    if (policyId) data.set("policyId", policyId);
    if (contactId) data.set("contactId", contactId);
    if (accountId) data.set("accountId", accountId);
    setError(null);
    try {
      await logStackTouch(data);
      setLogged(kind);
      setNote("");
      setOpen(false);
    } catch {
      setError("Could not log that.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ff-stack-comms" data-ff-stack-comms="">
      <button
        type="button"
        className="ff-stack-comms-btn"
        aria-expanded={open}
        data-ff-stack-comms-toggle=""
        onClick={() => setOpen((value) => !value)}
      >
        {logged ? "Logged" : "Comms"}
      </button>
      {open ? (
        <form className="ff-stack-comms-menu" data-ff-stack-comms-menu="" onSubmit={onSubmit}>
          <div className="ff-stack-comms-kinds" role="group" aria-label="Email or SMS">
            <button
              type="button"
              aria-pressed={kind === "email"}
              data-ff-stack-comms-kind="email"
              onClick={() => setKind("email")}
            >
              Email
            </button>
            <button
              type="button"
              aria-pressed={kind === "sms"}
              data-ff-stack-comms-kind="sms"
              onClick={() => setKind("sms")}
            >
              SMS
            </button>
          </div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={kind === "email" ? "Email note" : "Text note"}
            aria-label={kind === "email" ? "Email note" : "Text note"}
          />
          <button type="submit" disabled={pending} data-ff-stack-comms-log="">
            {pending ? "Logging" : "Log"}
          </button>
          {error ? <p className="ff-leads-source-quiet">{error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
