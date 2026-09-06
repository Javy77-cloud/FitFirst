"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FollowUpReminderPopup, type FollowUpPopupAlert } from "@/components/leads/follow-up-reminder-popup";

type ModalPayload = {
  followUp: FollowUpPopupAlert | null;
  playbook: { id: string; title: string; body: string; href: string | null } | null;
};

export function AppNotificationHost() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<ModalPayload>({ followUp: null, playbook: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/notifications/modal?path=${encodeURIComponent(pathname || "/")}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const next = (await res.json()) as ModalPayload;
        if (!cancelled) setPayload(next);
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

  return <FollowUpReminderPopup alert={payload.followUp} playbook={payload.playbook} />;
}
