"use client";

import type { MouseEvent, ReactNode } from "react";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";

export function HardDeleteForm({
  action,
  subject,
  className,
  children,
  confirm = true,
  onConfirmed,
}: {
  action: (formData: FormData) => unknown;
  subject: string;
  className?: string;
  children: ReactNode;
  /** Lead line files can skip. Other hard deletes ask once on trash click. */
  confirm?: boolean;
  /** Fires once after the single confirm succeeds (before the form submits). */
  onConfirmed?: () => void;
}) {
  return (
    <form
      action={action}
      className={className}
      onClickCapture={(event: MouseEvent<HTMLFormElement>) => {
        const node = event.target;
        if (!(node instanceof Element)) return;
        const submitter = node.closest("button, input[type='submit']");
        if (!submitter) return;
        if (submitter instanceof HTMLButtonElement && submitter.type !== "submit") return;

        // Always take over the click: window.confirm() can cancel the pending
        // submit gesture, so a plain "OK" looked like Delete did nothing.
        event.preventDefault();
        event.stopPropagation();

        if (confirm && !confirmHardDelete(subject)) return;

        onConfirmed?.();
        event.currentTarget.requestSubmit(
          submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
            ? submitter
            : undefined,
        );
      }}
    >
      {children}
    </form>
  );
}
