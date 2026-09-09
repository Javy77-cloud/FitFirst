"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
import { FollowUpReminderPopup, type FollowUpPopupAlert } from "@/components/leads/follow-up-reminder-popup";

type ModalPayload = {
  followUp: FollowUpPopupAlert | null;
  playbook: { id: string; title: string; body: string; href: string | null } | null;
  archiveReminder: {
    id: string;
    title: string;
    body: string;
    dealId: string;
    dealTitle: string | null;
  } | null;
};

export function AppNotificationHost() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<ModalPayload>({
    followUp: null,
    playbook: null,
    archiveReminder: null,
  });
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/notifications/modal?path=${encodeURIComponent(pathname || "/")}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const next = (await res.json()) as ModalPayload;
        if (!cancelled) {
          setPayload({
            followUp: next.followUp ?? null,
            playbook: next.playbook ?? null,
            archiveReminder: next.archiveReminder ?? null,
          });
          setArchiveOpen(Boolean(next.archiveReminder));
        }
      } catch {
        /* keep last */
      }
    }
    void load();
    const tick = window.setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [pathname]);

  const archive = payload.archiveReminder;

  return (
    <>
      <FollowUpReminderPopup alert={payload.followUp} playbook={payload.playbook} />
      {archive ? (
        <ClosedDealArchivePopup
          dealId={archive.dealId}
          dealTitle={archive.dealTitle ?? archive.title}
          open={archiveOpen}
          alertId={archive.id}
          onOpenChange={(next) => {
            setArchiveOpen(next);
            if (!next) {
              setPayload((current) => ({ ...current, archiveReminder: null }));
            }
          }}
        />
      ) : null}
    </>
  );
}
