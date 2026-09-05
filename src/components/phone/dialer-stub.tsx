"use client";

import { useMemo, useState } from "react";
import { logPhoneStubCall } from "@/app/actions/phone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CALL_OUTCOMES } from "@/lib/domain";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as const;

export type DialerContact = {
  id: string;
  label: string;
  phone: string | null;
};

export function DialerStub({ contacts }: { contacts: DialerContact[] }) {
  const [digits, setDigits] = useState("");
  const [contactId, setContactId] = useState("");
  const selected = useMemo(
    () => contacts.find((row) => row.id === contactId) ?? null,
    [contactId, contacts],
  );
  const phone = digits || selected?.phone || "";

  function pushDigit(key: string) {
    setDigits((current) => `${current}${key}`.slice(0, 16));
  }

  return (
    <form action={logPhoneStubCall} className="ff-card space-y-3 p-4">
      <div>
        <h2 className="text-base font-semibold text-navy">Log a call</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Writes the outcome to the activity log. Does not place a call.
        </p>
      </div>
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="phoneNumber" value={phone} />
      <input type="hidden" name="direction" value="outbound" />
      <div className="rounded-md border border-border bg-navy px-3 py-3 text-white">
        <div className="text-[11px] uppercase tracking-wide text-white/70">Number</div>
        <div className="font-mono text-2xl tracking-wide">{phone || "• • •"}</div>
        {selected ? <div className="mt-1 text-xs text-white/70">{selected.label}</div> : null}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => pushDigit(key)}
            className="h-10 rounded-md border border-border bg-card text-sm font-semibold text-navy hover:bg-muted"
          >
            {key}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setDigits((c) => c.slice(0, -1))}>
          Back
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setDigits("")}>
          Clear
        </Button>
      </div>
      <div>
        <Label className="text-xs">Contact (optional)</Label>
        <select
          name="contactId"
          value={contactId}
          onChange={(event) => {
            const next = event.target.value;
            setContactId(next);
            const match = contacts.find((row) => row.id === next);
            if (match?.phone && !digits) setDigits(match.phone.replace(/[^\d+*#]/g, ""));
          }}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">No record — log on the desk</option>
          {contacts.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
              {row.phone ? ` · ${row.phone}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Outcome</Label>
        <select
          name="outcome"
          required
          defaultValue=""
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="" disabled>
            Select outcome
          </option>
          {CALL_OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {outcome.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea
          name="notes"
          required
          rows={3}
          className="mt-1"
          placeholder="What happened on the line"
        />
      </div>
      <Button type="submit" size="sm">
        Log call outcome
      </Button>
    </form>
  );
}
