"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  COPY_SHEET_LABEL,
  FILL_HANDOFF_HINT,
  OPEN_FILL_LABEL,
  SEND_TO_FILL_LABEL,
} from "@/lib/quoting/fill-path";
import { FILL_MESSAGE_SOURCE, FILL_MESSAGE_TYPE, FILL_STORAGE_KEY } from "@/lib/wire/sheet-packet";

export function SheetHandoffButtons({ dealId, line }: { dealId: string; line: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function sendToFill() {
    const res = await fetch(`/api/deals/${dealId}/quote-sheets/${line}/fill`);
    if (!res.ok) {
      setNote("Quote Sheet record is missing.");
      return;
    }
    const sheet = await res.json();
    window.localStorage.setItem(FILL_STORAGE_KEY, JSON.stringify(sheet));
    window.postMessage({ source: FILL_MESSAGE_SOURCE, type: FILL_MESSAGE_TYPE, sheet }, "*");
    await navigator.clipboard.writeText(JSON.stringify(sheet, null, 2)).catch(() => undefined);
    setNote(
      "Sheet ready for Chrome Fill. Clipboard + localStorage hold this Quote Sheet — not a PDF. Load unpacked extensions/fill or open Fill demo.",
    );
  }

  async function copySheet() {
    const res = await fetch(`/api/deals/${dealId}/quote-sheets/${line}/super-copy`);
    if (!res.ok) {
      setNote("Quote Sheet record is missing.");
      return;
    }
    const packet = await res.json();
    await navigator.clipboard.writeText(JSON.stringify(packet, null, 2)).catch(() => undefined);
    setNote("Copied Super-Copy from the same Quote Sheet record.");
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-helper text-muted-foreground">{FILL_HANDOFF_HINT}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={copySheet}>
          {COPY_SHEET_LABEL}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={sendToFill}>
          {SEND_TO_FILL_LABEL}
        </Button>
        <a href="/fill-demo" className="text-xs text-primary hover:underline">
          {OPEN_FILL_LABEL}
        </a>
        {note ? <span className="text-base text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  );
}
