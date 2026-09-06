"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SavedToast({
  show,
  message,
  listHref,
}: {
  show: boolean;
  message: string;
  listHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(show);

  useEffect(() => {
    if (!show) return;
    setOpen(true);
    const hide = window.setTimeout(() => {
      setOpen(false);
      router.replace(listHref, { scroll: false });
    }, 4000);
    return () => window.clearTimeout(hide);
  }, [show, listHref, router]);

  if (!open) return null;

  return (
    <div
      role="status"
      data-testid={listHref === "/leads" ? "lead-saved-toast" : "saved-toast"}
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-navy px-5 py-3 text-base font-semibold text-white shadow-lg ring-1 ring-white/20"
    >
      {message}
    </div>
  );
}
