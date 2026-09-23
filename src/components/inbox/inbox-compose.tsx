"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenSquare } from "lucide-react";
import { QuickCommsEmailCompose } from "@/components/comms/quick-comms-email-compose";
import { Button } from "@/components/ui/button";

/** Inbox New message entry — opens the shared Quick Comms compact compose. */
export function InboxCompose() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="ff-inbox-compose ff-inbox-new" data-ff-inbox-compose="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy">New message</p>
          <p className="text-xs text-muted-foreground">
            Compose from the agency mailbox · search contacts &amp; accounts for To
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(true)}
          data-ff-inbox-compose-open=""
        >
          <PenSquare className="size-3.5" />
          Compose
        </Button>
      </div>

      <QuickCommsEmailCompose
        open={open}
        onOpenChange={setOpen}
        toAddress=""
        contactName=""
        related={{}}
        toMode="search"
        stayHint="Stays in Inbox · agency mailbox · signature on by default"
        onSent={() => router.refresh()}
      />
    </div>
  );
}
