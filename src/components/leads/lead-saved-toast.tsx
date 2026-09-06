"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LeadSavedToast({ show }: { show: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(show);

  useEffect(() => {
    if (!show) return;
    setOpen(true);
    const hide = window.setTimeout(() => {
      setOpen(false);
      router.replace("/leads", { scroll: false });
    }, 4000);
    return () => window.clearTimeout(hide);
  }, [show, router]);

  if (!open) return null;

  return (
    <div
      role="status"
      data-testid="lead-saved-toast"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-navy px-5 py-3 text-base font-semibold text-white shadow-lg ring-1 ring-white/20"
    >
      Lead saved.
    </div>
  );
}
