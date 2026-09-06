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
    }, 2200);
    return () => window.clearTimeout(hide);
  }, [show, router]);

  if (!open) return null;

  return (
    <div
      role="status"
      data-testid="lead-saved-toast"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white shadow-md"
    >
      Lead saved.
    </div>
  );
}
