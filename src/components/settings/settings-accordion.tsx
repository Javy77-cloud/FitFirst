"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "phone",
    title: "Phone",
    body: (
      <>
        <p>
          The in-desk softphone uses this computer&apos;s microphone (optional webcam) and stores
          call duration on hangup. There is no Twilio, Vonage, or other PSTN vendor in this repo.
        </p>
        <div className="mt-4 rounded-md border border-dashed border-border px-3 py-4">
          <div className="font-medium text-navy">Connect your phone line later</div>
          <p className="mt-1 text-muted-foreground">
            Bring-your-own trunk. Click-to-call already opens the softphone shell and a{" "}
            <code className="text-xs">tel:</code> fallback. Plug a carrier SIP/WebRTC endpoint
            here when you have one — do not paste vendor keys into the app.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 h-8 rounded-md border border-input bg-muted px-3 text-base text-muted-foreground"
          >
            Connect phone line (not configured)
          </button>
        </div>
      </>
    ),
  },
  {
    id: "agency",
    title: "Agency",
    body: (
      <>
        <p>FitFirst Insurance Group · Florida P&amp;C. Single-tenant owner desk.</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Legal name</dt>
            <dd>FitFirst Insurance Group</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">State</dt>
            <dd>Florida</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Desk mode</dt>
            <dd>Filter-first shopping · quotes are not coverage</dd>
          </div>
        </dl>
      </>
    ),
  },
  {
    id: "notifications",
    title: "Notifications",
    body: (
      <>
        <p>
          Alerts stay on the desk. There is no outbound email vendor and no push subscription in
          this repo.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Unread alerts show on the bell in the top bar.</li>
          <li>Calendar events you add here do not sync to Google or Outlook.</li>
          <li>Deal and lead Quick Communications are notes on the record.</li>
        </ul>
      </>
    ),
  },
] as const;

export function SettingsAccordion({ initial = "phone" }: { initial?: string }) {
  const allowed = SECTIONS.some((section) => section.id === initial) ? initial : "phone";
  const [openId, setOpenId] = useState(allowed);

  return (
    <div className="space-y-2">
      {SECTIONS.map((section) => {
        const open = openId === section.id;
        return (
          <section key={section.id} id={section.id} className="ff-card overflow-hidden scroll-mt-4">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(section.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-base font-semibold text-navy">{section.title}</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition", open && "rotate-180")} />
            </button>
            {open ? (
              <div className="border-t border-border px-4 py-3 text-base text-muted-foreground">
                {section.body}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
