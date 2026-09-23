"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenSquare } from "lucide-react";
import { QuickCommsEmailCompose } from "@/components/comms/quick-comms-email-compose";
import { Button } from "@/components/ui/button";

/** Inbox Compose entry — Gmail-style top-left control opening the shared Quick Comms popup. */
export function InboxCompose() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="ff-inbox-compose-trigger" data-ff-inbox-compose="">
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        data-ff-inbox-compose-open=""
        aria-label="Compose new message"
      >
        <PenSquare className="size-3.5" />
        Compose
      </Button>

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
