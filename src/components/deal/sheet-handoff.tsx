"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SEND_FIELD_SHEET_LABEL } from "@/lib/quote-sheet/toolbar";
import { FILL_MESSAGE_SOURCE, FILL_MESSAGE_TYPE, FILL_STORAGE_KEY } from "@/lib/wire/sheet-packet";

export function SendFieldSheetButton({ dealId, line }: { dealId: string; line: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function sendFieldSheet() {
    const res = await fetch(`/api/deals/${dealId}/quote-sheets/${line}/fill`);
    if (!res.ok) {
      setNote("Quote Sheet record is missing.");
      return;
    }
    const sheet = await res.json();
    window.localStorage.setItem(FILL_STORAGE_KEY, JSON.stringify(sheet));
    window.postMessage({ source: FILL_MESSAGE_SOURCE, type: FILL_MESSAGE_TYPE, sheet }, "*");
    await navigator.clipboard.writeText(JSON.stringify(sheet, null, 2)).catch(() => undefined);
    setNote("Sent this Quote Sheet to Fill (clipboard + browser). Not a raw PDF.");
  }

  return (
    <div>
      <Button type="button" size="sm" variant="secondary" onClick={sendFieldSheet}>
        {SEND_FIELD_SHEET_LABEL}
      </Button>
      {note ? <p className="mt-1.5 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** @deprecated Use SendFieldSheetButton — kept so older imports keep compiling. */
export function SheetHandoffButtons({ dealId, line }: { dealId: string; line: string }) {
  return <SendFieldSheetButton dealId={dealId} line={line} />;
}
