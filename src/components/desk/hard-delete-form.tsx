"use client";

import type { MouseEvent, ReactNode } from "react";
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
  /** Lead line files can skip. Other hard deletes ask once on trash click. */
  confirm?: boolean;
}) {
  return (
    <form
      action={action}
      className={className}
      onClickCapture={(event: MouseEvent<HTMLFormElement>) => {
        if (!confirm) return;
        const node = event.target;
        if (!(node instanceof Element)) return;
        const submitter = node.closest("button, input[type='submit']");
        if (!submitter) return;
        if (submitter instanceof HTMLButtonElement && submitter.type !== "submit") return;
        if (!confirmHardDelete(subject)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </form>
  );
}
