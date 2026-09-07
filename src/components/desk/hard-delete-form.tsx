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
  /** Lead line files can skip. Other hard deletes ask once: Are you sure you want to delete? */
  confirm?: boolean;
}) {
  return (
    <form
      action={action as (formData: FormData) => void | Promise<void>}
      className={className}
      onSubmit={(event) => {
        if (confirm && !confirmHardDelete(subject)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
