"use client";

import type { ReactNode } from "react";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";

export function HardDeleteForm({
  action,
  subject,
  className,
  children,
  confirm = true,
}: {
  action: (formData: FormData) => unknown;
  subject: string;
  className?: string;
  children: ReactNode;
  /** Lead line files can skip. Other hard deletes ask once inside the form action. */
  confirm?: boolean;
}) {
  return (
    <form
      action={async (formData) => {
        if (confirm && !confirmHardDelete(subject)) return;
        await action(formData);
      }}
      className={className}
    >
      {children}
    </form>
  );
}
