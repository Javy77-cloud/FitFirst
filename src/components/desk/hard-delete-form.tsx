"use client";

import type { ReactNode } from "react";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";

export function HardDeleteForm({
  action,
  subject,
  className,
  children,
}: {
  action: (formData: FormData) => unknown;
  subject: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action as (formData: FormData) => void | Promise<void>}
      className={className}
      onSubmit={(event) => {
        if (!confirmHardDelete(subject)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
